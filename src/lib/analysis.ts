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
  explanations: { lang: Lang; byId: Record<string, string> };
  aiDegraded: boolean;
}

const inflight = new Map<string, Promise<AnalysisResult>>();

/**
 * Runs the whole pipeline. `onStep(n)` is called when step n becomes active
 * (0 reading, 1 checking eligibility, 2 scoring). Takes at least ~1.8 s so the screen never flashes.
 */
export function runAnalysis(text: string, lang: Lang, onStep: (step: number) => void): Promise<AnalysisResult> {
  const key = `${lang}:${text}`;
  const existing = inflight.get(key);
  if (existing) return existing;

  const job = (async () => {
    const started = Date.now();

    onStep(0);
    const [{ profile, degraded: profileDegraded }] = await Promise.all([fetchProfile(text), delay(700)]);

    onStep(1);
    const matches = matchScholarships(profile);
    await delay(600);

    onStep(2);
    const [{ byId, degraded: explainDegraded }] = await Promise.all([
      fetchExplanations(profile, matches, lang),
      delay(500),
    ]);

    const remaining = 1800 - (Date.now() - started);
    if (remaining > 0) await delay(remaining);

    return {
      profile,
      matches,
      explanations: { lang, byId },
      aiDegraded: profileDegraded || explainDegraded,
    };
  })().finally(() => setTimeout(() => inflight.delete(key), 3000));

  inflight.set(key, job);
  return job;
}

export function scholarshipCount(): number {
  return getAllScholarships().length;
}
