"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Translations } from "@/lib/i18n";
import { Metrics, Pace, paceOf, TOTAL_QUESTIONS } from "@/lib/practice";

interface Props {
  t: Translations;
  metrics: Metrics | null;
  tip: string | null;
  wpm: number | null;
  /** number of the current question (0 before the first one) */
  questionNumber: number;
}

const PACE_STYLE: Record<Pace, string> = {
  natural: "bg-success-bg text-success",
  slow: "bg-warning-bg text-warning-text",
  fast: "bg-warning-bg text-warning-text",
};

export function FeedbackCard({ t, metrics, tip, wpm, questionNumber }: Props) {
  const p = t.practice;
  const reduced = useReducedMotion();
  const rows: Array<[string, number | null]> = [
    [p.clarity, metrics?.clarity ?? null],
    [p.structure, metrics?.structure ?? null],
    [p.authenticity, metrics?.authenticity ?? null],
  ];
  const current = Math.min(TOTAL_QUESTIONS, Math.max(1, questionNumber));
  const pace = wpm ? paceOf(wpm) : null;

  return (
    <section
      className="glass flex h-[440px] w-[280px] flex-col gap-4 p-6 mobile:h-auto mobile:w-full"
      style={{ background: "rgba(255,255,255,0.56)" }}
      aria-label={p.feedback}
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[19px] font-semibold tracking-[-0.01em] text-ink">{p.feedback}</h2>
        <span className="rounded-[10px] bg-violet/10 px-[9px] py-1 text-[11px] font-semibold text-violet-dark">
          {p.aiCoach}
        </span>
      </div>

      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-[7px]">
          <div className="flex justify-between text-[13.5px] font-medium">
            <span className="text-ink">{label}</span>
            <span className="text-muted">{value === null ? "—" : `${value}%`}</span>
          </div>
          <div
            className="h-[5px] overflow-hidden rounded-[3px] bg-ink/[0.08]"
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={value ?? undefined}
          >
            <motion.div
              className="h-full rounded-[3px]"
              style={{ background: "linear-gradient(90deg, #7c3aed, #f472b6)" }}
              initial={false}
              animate={{ width: `${value ?? 0}%` }}
              transition={{ duration: reduced ? 0 : 0.6, ease: "easeOut" }}
            />
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <span className="text-[13.5px] font-medium text-ink">{p.pace}</span>
        {pace && wpm ? (
          <span className={`rounded-[10px] px-[10px] py-[5px] text-[11.5px] font-medium ${PACE_STYLE[pace]}`}>
            {p.paceLabels[pace]} · {p.wpm(wpm)}
          </span>
        ) : (
          <span className="text-[13.5px] text-muted">—</span>
        )}
      </div>

      <div className="rounded-[18px] bg-violet/[0.08] px-4 py-[14px]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-violet">{p.coachTip}</p>
        <p className="mt-[6px] text-[13.5px] font-medium leading-[20px] text-ink" aria-live="polite">
          {tip ?? p.tipWaiting}
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <div className="flex gap-[6px]" aria-hidden>
          {Array.from({ length: TOTAL_QUESTIONS }, (_, i) => (
            <span
              key={i}
              className="h-[5px] flex-1 rounded-[3px]"
              style={{
                background: i < questionNumber ? "linear-gradient(90deg, #7c3aed, #f472b6)" : "rgba(27,21,51,0.1)",
              }}
            />
          ))}
        </div>
        <p className="text-[12.5px] font-medium text-muted">{p.questionOf(current, TOTAL_QUESTIONS)}</p>
      </div>
    </section>
  );
}
