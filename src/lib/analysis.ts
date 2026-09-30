import { mergeProfiles, heuristicProfile, normalizeProfile } from "./profile";
import { getAllScholarships, matchScholarships } from "./matching";
import { Lang, MatchResult, Profile, Reason } from "./schema";
import { reasonText } from "./i18n";

/*
  Client-side orchestration of the pipeline:
  text -> profile (LLM + keyword fallback) -> deterministic matching -> explanations (LLM + templates).
  Each network step degrades gracefully, so the UI never breaks.
*/

export const TOP_N = 3;

/** What is sent for profile extraction: the typed description plus the text of the attached CV, if any. */
export function buildAnalysisText(rawInput: string, cvText: string | undefined): string {
  return [rawInput.trim(), cvText ? `CV:\n${cvText}` : ""].filter(Boolean).join("\n\n");
}
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(35_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function fetchProfile(text: string): Promise<{ profile: Profile; degraded: boolean }> {
  const fallback = heuristicProfile(text);
  try {
    const { profile } = await postJson<{ profile: unknown }>("/api/profile", { text: text.slice(0, 18000) });
    return { profile: mergeProfiles(normalizeProfile(profile), fallback), degraded: false };
  } catch {
    return { profile: fallback, degraded: true };
  }
}

export async function fetchExplanations(
  profile: Profile,
  matches: MatchResult[],
  lang: Lang,
): Promise<{ byId: Record<string, string>; degraded: boolean }> {
  try {
    const { explanations } = await postJson<{ explanations: Record<string, string> }>("/api/explain", {
      lang,
      profile,
      matches: matches.slice(0, TOP_N),
    });
    return { byId: explanations, degraded: Object.keys(explanations).length === 0 };
  } catch {
    return { byId: {}, degraded: true };
  }
}

/** Template explanation built from the structured reasons (works without any LLM). */
function fallbackExplanation(match: MatchResult, lang: Lang): string {
  const tagFor = (a: string) => {
    const s = getAllScholarships().find((x) => x.affinity === a);
    return s ? s.tag[lang] : a;
  };
  return match.reasons
    .slice(0, 2)
    .map((r: Reason) => reasonText(r, lang, tagFor))
    .join(" ");
}

export function explanationFor(
  match: MatchResult,
  lang: Lang,
  explanations: { lang: Lang; byId: Record<string, string> } | null,
): string {
  const ai = explanations && explanations.lang === lang ? explanations.byId[match.scholarshipId] : undefined;
  return ai || fallbackExplanation(match, lang);
}

export interface AnalysisResult {
  profile: Profile;
  matches: MatchResult[];
  /** null = not available yet (the matches page then fetches them itself) */
  explanations: { lang: Lang; byId: Record<string, string> } | null;
  aiDegraded: boolean;
}

/** Progress events of one analysis run (used by the loading screens). */
type AnalysisEvent =
  | { type: "step"; step: number } // 0 reading, 1 checking eligibility, 2 scoring
  | { type: "profile"; profile: Profile; degraded: boolean }
  | { type: "matches"; matches: MatchResult[] };

export interface RunOptions {
  /** Minimum total duration in ms (classic screen: 1800). 0 = no artificial pacing (the orbit screen paces itself). */
  minMs?: number;
  onEvent?: (event: AnalysisEvent) => void;
}

interface Job {
  promise: Promise<AnalysisResult>;
  events: AnalysisEvent[];
  listeners: Set<(event: AnalysisEvent) => void>;
}

const inflight = new Map<string, Job>();

/**
 * Runs the whole pipeline: text -> profile -> matches -> explanations.
 * Calling it again with the same input (e.g. React strict mode) joins the running job; late subscribers get all
 * earlier events replayed, so the UI never misses a step.
 */
export function runAnalysis(text: string, lang: Lang, options: RunOptions = {}): Promise<AnalysisResult> {
  const { minMs = 1800, onEvent } = options;
  const key = `${lang}:${minMs}:${text}`;

  let job = inflight.get(key);
  if (!job) {
    const events: AnalysisEvent[] = [];
    const listeners = new Set<(event: AnalysisEvent) => void>();
    const emit = (event: AnalysisEvent) => {
      events.push(event);
      listeners.forEach((l) => l(event));
    };
    const pace = (ms: number) => (minMs > 0 ? delay(ms) : Promise.resolve());

    const promise = (async (): Promise<AnalysisResult> => {
      const started = Date.now();

      emit({ type: "step", step: 0 });
      const profileJob = fetchProfile(text).then((r) => {
        emit({ type: "profile", profile: r.profile, degraded: r.degraded });
        return r;
      });
      const [{ profile, degraded: profileDegraded }] = await Promise.all([profileJob, pace(700)]);

      emit({ type: "step", step: 1 });
      const matches = matchScholarships(profile);
      emit({ type: "matches", matches });
      await pace(600);

      emit({ type: "step", step: 2 });
      const [{ byId, degraded: explainDegraded }] = await Promise.all([
        fetchExplanations(profile, matches, lang),
        pace(500),
      ]);

      const remaining = minMs - (Date.now() - started);
      if (remaining > 0) await delay(remaining);

      return { profile, matches, explanations: { lang, byId }, aiDegraded: profileDegraded || explainDegraded };
    })().finally(() => setTimeout(() => inflight.delete(key), 3000));

    job = { promise, events, listeners };
    inflight.set(key, job);
  }

  if (onEvent) {
    job.events.forEach(onEvent); // replay what already happened
    job.listeners.add(onEvent);
  }
  return job.promise;
}

export function scholarshipCount(): number {
  return getAllScholarships().length;
}
