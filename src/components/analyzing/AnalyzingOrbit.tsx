"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnalysisResult, buildAnalysisText, runAnalysis, scholarshipCount } from "@/lib/analysis";
import { partialProfile, profileChips, profileRows, ROW_KEYS } from "@/lib/facts";
import { getAllScholarships, matchScholarships } from "@/lib/matching";
import { MatchResult, Profile } from "@/lib/schema";
import { useAppStore, useT } from "@/lib/store";
import { useIsMobile } from "@/lib/useMobile";
import { ORBIT_SIZE, OrbitVisual } from "./OrbitVisual";

const TOP_SHOWN = 6;
const FIRST_DELAY_MS = 250; // pause after the profile arrives, before the first row is read
const ROW_MS = 450; // time per profile row
const HOLD_MS = 900; // let the finished state be seen before moving on
const EXPLAIN_GRACE_MS = 2500; // after the last row, wait at most this long for the AI explanations

/** Width of an element, tracked live (used to scale the orbit picture on phones). */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * Loading screen: a live picture of the analysis. Everything shown comes from the real pipeline:
 * the profile rows and chips are the facts extracted (and verified) from the user's text / CV, the ring of
 * foundations and the bars are the real scores of the deterministic matcher, recomputed as each fact is read.
 */
export default function AnalyzingOrbit() {
  const router = useRouter();
  const { t, lang } = useT();
  const isMobile = useIsMobile();
  const hydrated = useAppStore((s) => s.hydrated);
  const rawInput = useAppStore((s) => s.rawInput);
  const cv = useAppStore((s) => s.cv);
  const setAnalysis = useAppStore((s) => s.setAnalysis);
  const showToast = useAppStore((s) => s.showToast);
  const o = t.analyzing.orbit;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [done, setDone] = useState(-1); // rows fully read; the row with this index is being read right now
  const [matches, setMatches] = useState<MatchResult[] | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [waitedLong, setWaitedLong] = useState(false);
  const [boxRef, boxWidth] = useWidth<HTMLDivElement>();

  // 1) run the real pipeline
  useEffect(() => {
    if (!hydrated) return;
    const text = buildAnalysisText(rawInput, cv?.text);
    if (!text) {
      router.replace("/");
      return;
    }
    let cancelled = false;
    runAnalysis(text, lang, {
      minMs: 0,
      onEvent: (e) => {
        if (cancelled) return;
        if (e.type === "profile") setProfile(e.profile);
        if (e.type === "matches") setMatches(e.matches);
      },
    })
      .then((res) => !cancelled && setResult(res))
      .catch(() => {
        if (cancelled) return;
        showToast(t.workspace.errors.failed);
        router.replace("/");
      });
    return () => {
      cancelled = true;
    };
    // Only (re)run when hydration finishes; a language switch mid-run is handled on the matches page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // 2) read the profile row by row once it has arrived
  useEffect(() => {
    if (!profile || done >= ROW_KEYS.length) return;
    const id = setTimeout(() => setDone((d) => d + 1), done < 0 ? FIRST_DELAY_MS : ROW_MS);
    return () => clearTimeout(id);
  }, [profile, done]);

  // 3) when everything is done, show the final state briefly, then open the matches
  const allRead = done >= ROW_KEYS.length;

  // The AI explanations can be slow. Do not keep the user waiting for them: after a short grace period continue
  // with the real profile and matches; the matches page fetches the explanations itself (templates show meanwhile).
  useEffect(() => {
    if (!allRead || result) return;
    const id = setTimeout(() => setWaitedLong(true), EXPLAIN_GRACE_MS);
    return () => clearTimeout(id);
  }, [allRead, result]);
  const finalResult = useMemo<AnalysisResult | null>(
    () =>
      result ?? (waitedLong && profile && matches ? { profile, matches, explanations: null, aiDegraded: false } : null),
    [result, waitedLong, profile, matches],
  );

  useEffect(() => {
    if (!finalResult || !allRead) return;
    const id = setTimeout(() => {
      setAnalysis(finalResult);
      router.replace("/matches");
    }, HOLD_MS);
    return () => clearTimeout(id);
  }, [finalResult, allRead, router, setAnalysis]);

  // live scores for the facts read so far (the last step equals the final result)
  const ranking = useMemo(
    () => (profile && done >= 1 ? matchScholarships(partialProfile(profile, done)) : null),
    [profile, done],
  );
  const scholarships = useMemo(() => getAllScholarships(), []);
  const byId = useMemo(() => new Map(scholarships.map((s) => [s.id, s])), [scholarships]);
  const top = ranking?.slice(0, TOP_SHOWN) ?? null;
  const highlighted = useMemo(() => new Set(top?.map((m) => m.scholarshipId) ?? []), [top]);
  const chips = useMemo(() => (profile ? profileChips(profile, t) : null), [profile, t]);
  const rows = useMemo(() => (profile ? profileRows(profile, t) : null), [profile, t]);

  const total = scholarshipCount();
  const finished = allRead && !!finalResult;

  const profileCard = (
    <ProfileCard
      title={o.profileTitle}
      pill={allRead ? o.profileReady : cv ? o.readingCv : o.readingText}
      ready={allRead}
      rows={ROW_KEYS.map((key, i) => ({
        label: o.rows[key],
        value: rows?.[i].value ?? null,
        state: !profile || done < 0 ? "pending" : i < done ? "done" : i === done ? "active" : "pending",
      }))}
      notMentioned={o.notMentioned}
    />
  );

  const matchingCard = (
    <MatchingCard
      title={o.matchingTitle}
      count={o.foundations(total)}
      rows={
        top?.map((m) => ({ id: m.scholarshipId, name: byId.get(m.scholarshipId)?.shortName ?? "", score: m.score })) ??
        null
      }
      footer={finished ? o.allCompared : o.scanningMore(total - TOP_SHOWN)}
      finished={finished}
    />
  );

  const orbit = (scale: number) => (
    <div style={{ width: ORBIT_SIZE * scale, height: ORBIT_SIZE * scale }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: ORBIT_SIZE, height: ORBIT_SIZE }}>
        <OrbitVisual
          scholarships={scholarships}
          highlighted={highlighted}
          score={ranking?.[0]?.score ?? 0}
          chips={chips}
          doneRows={Math.max(done, 0)}
          label={o.profileMatch}
          compact={scale < 0.85}
        />
      </div>
    </div>
  );

  const header = (
    <div className="text-center">
      <h1 className="font-display text-[38px] font-semibold leading-[46px] tracking-[-0.025em] text-ink mobile:text-[28px] mobile:leading-[34px]">
        {o.title}
      </h1>
      <p className="mt-[5px] text-[16px] leading-[24px] text-muted mobile:text-[14px] mobile:leading-[21px]">
        {cv ? o.subtitleCv(total) : o.subtitleText(total)}
      </p>
    </div>
  );

  if (isMobile) {
    const scale = boxWidth ? Math.min(1, boxWidth / ORBIT_SIZE) : 0.55;
    return (
      <div className="flex flex-col gap-5 pb-2">
        {header}
        <div ref={boxRef} className="flex w-full justify-center">
          {orbit(scale)}
        </div>
        {profileCard}
        {matchingCard}
      </div>
    );
  }

  // desktop: absolute positions on the 1200 x 780 content area (matches the design)
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-x-0 top-[18px]">{header}</div>
      <div className="absolute" style={{ left: 280, top: 104 }}>
        {orbit(1)}
      </div>
      <div className="absolute left-0 top-[236px]">{profileCard}</div>
      <div className="absolute left-[940px] top-[236px]">{matchingCard}</div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------

type RowState = "pending" | "active" | "done";

function ProfileCard({
  title,
  pill,
  ready,
  rows,
  notMentioned,
}: {
  title: string;
  pill: string;
  ready: boolean;
  rows: Array<{ label: string; value: string | null; state: RowState }>;
  notMentioned: string;
}) {
  return (
    <section className="glass h-[376px] w-[260px] px-[23px] pt-[23px] mobile:h-auto mobile:w-full mobile:pb-2">
      <div className="flex h-[30px] items-center justify-between">
        <h2 className="font-display text-[20px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        <span className="flex items-center gap-1.5 rounded-full bg-success-bg px-[10px] py-[3px] text-[10.5px] font-medium text-success">
          {ready ? (
            <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
          ) : (
            <span className="h-[6px] w-[6px] animate-pulse rounded-full bg-[#22c55e]" />
          )}
          {pill}
        </span>
      </div>

      <ul className="mt-4" aria-live="polite">
        {rows.map((row) => (
          <li key={row.label} className="flex h-[61px] items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10.5px] font-medium uppercase leading-[13px] tracking-[0.09em] text-muted">
                {row.label}
              </div>
              {row.state === "pending" ? (
                <div className="mt-[7px] h-[14px] w-28 animate-pulse rounded-full bg-neutral-line/30" />
              ) : row.value ? (
                <div
                  className={`mt-[3px] truncate text-[14px] font-medium leading-[20px] ${row.state === "active" ? "text-violet-dark" : "text-ink"}`}
                  title={row.value}
                >
                  {row.value}
                </div>
              ) : (
                <div className="mt-[3px] text-[14px] leading-[20px] text-muted/70">{notMentioned}</div>
              )}
            </div>
            <RowIcon state={row.state} hasValue={!!row.value} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RowIcon({ state, hasValue }: { state: RowState; hasValue: boolean }) {
  if (state === "done" && hasValue) {
    return (
      <motion.span
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#22c55e] text-white"
      >
        <Check className="h-3 w-3" strokeWidth={3.5} aria-hidden />
      </motion.span>
    );
  }
  if (state === "done") {
    return <span className="mt-[15px] h-[2px] w-3 shrink-0 rounded-full bg-neutral-line" aria-hidden />;
  }
  return (
    <span
      className={`mt-1 h-5 w-5 shrink-0 rounded-full border-[1.5px] ${state === "active" ? "border-violet-light" : "border-neutral-line/60"}`}
      aria-hidden
    />
  );
}

function MatchingCard({
  title,
  count,
  rows,
  footer,
  finished,
}: {
  title: string;
  count: string;
  rows: Array<{ id: string; name: string; score: number }> | null;
  footer: string;
  finished: boolean;
}) {
  return (
    <section className="glass h-[376px] w-[260px] px-[23px] pt-[23px] mobile:h-auto mobile:w-full mobile:pb-5">
      <div className="flex h-[30px] items-center justify-between">
        <h2 className="font-display text-[20px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        <span className="text-[11.5px] text-muted">{count}</span>
      </div>

      <ul className="mt-2">
        {rows
          ? rows.map((r) => (
              <motion.li layout key={r.id} transition={{ duration: 0.35, ease: "easeInOut" }} className="h-[43px]">
                <div className="flex items-baseline justify-between text-[14px] leading-[20px]">
                  <span className="truncate font-medium text-ink">{r.name}</span>
                  <span className="shrink-0 pl-2 text-[13px] text-ink/70">{r.score}%</span>
                </div>
                <div className="mt-[8px] h-[5px] overflow-hidden rounded-full bg-neutral-line/30">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #7c3aed, #f472b6)" }}
                    initial={false}
                    animate={{ width: `${r.score}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                  />
                </div>
              </motion.li>
            ))
          : Array.from({ length: TOP_SHOWN }, (_, i) => (
              <li key={i} className="h-[43px]">
                <div className="h-[14px] w-32 animate-pulse rounded-full bg-neutral-line/30" />
                <div className="mt-[14px] h-[5px] rounded-full bg-neutral-line/20" />
              </li>
            ))}
      </ul>

      <div className="mt-0 flex h-[34px] items-center gap-2 rounded-[12px] bg-violet/[0.08] px-3 text-[12.5px] font-medium text-violet-dark">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={String(finished)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            {finished ? (
              <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
            ) : (
              <span className="h-[6px] w-[6px] animate-pulse rounded-full bg-violet" />
            )}
            {footer}
          </motion.span>
        </AnimatePresence>
      </div>
    </section>
  );
}
