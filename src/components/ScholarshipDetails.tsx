"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, X } from "lucide-react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { deadlineLabel, docLabel, formatVerified, scholarshipText, upcomingDate } from "@/lib/format";
import { MatchResult, Scholarship } from "@/lib/schema";
import { useT } from "@/lib/store";
import { MatchRing } from "./MatchRing";

interface Props {
  scholarship: Scholarship | null;
  match: MatchResult | null;
  explanation: string;
  onClose: () => void;
  onStart: (id: string) => void;
}

/** Full-canvas overlay with everything the dataset knows about one scholarship. */
export function ScholarshipDetails({ scholarship: s, match, explanation, onClose, onStart }: Props) {
  const { t, lang } = useT();
  const closeRef = useRef<HTMLButtonElement>(null);
  // Portal into the scaled stage so the overlay covers the whole 1440x900 canvas, not just the page area.
  const host = useSyncExternalStore(
    () => () => {},
    () => document.querySelector("[data-overlay-root]"),
    () => null,
  );

  useEffect(() => {
    if (!s) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s, onClose]);

  if (!host) return null;

  return createPortal(
    <AnimatePresence>
      {s && match && (
        <motion.div
          key={s.id}
          className="absolute inset-0 z-[60] flex items-center justify-center bg-ink/25 backdrop-blur-[6px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={s.name}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="glass glass-strong thin-scroll relative max-h-[760px] w-[900px] overflow-y-auto rounded-[32px] p-8 mobile:max-h-[calc(100%-24px)] mobile:w-[calc(100%-24px)] mobile:rounded-[26px] mobile:p-5"
            style={{ background: "rgba(255,255,255,0.86)" }}
          >
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={t.details.close}
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-ink hover:bg-white"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>

            <div className="flex items-center gap-5 pr-12 mobile:gap-4">
              <MatchRing value={match.score} label={t.matches.matchPercent(match.score)} />
              <div>
                <h2 className="font-display text-[26px] font-semibold leading-[32px] tracking-[-0.015em] text-ink mobile:text-[20px] mobile:leading-[25px]">
                  {s.name}
                </h2>
                <span className="soft-tag mt-2 inline-flex h-[26px] items-center rounded-[13px] px-[10px] text-[12px] font-medium">
                  {s.tag[lang]}
                </span>
              </div>
            </div>

            {match.caution && (
              <p className="mt-5 rounded-2xl bg-warning-bg px-4 py-3 text-[13px] leading-[20px] text-warning-text">
                {match.caution === "faithUnknown" ? t.details.faithUnknown : t.details.faithMismatch}
              </p>
            )}

            <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-5 text-[14px] leading-[22px] text-ink/85 mobile:grid-cols-1">
              <div className="space-y-5">
                <Section title={t.details.whyFits}>{explanation}</Section>
                <Section title={t.details.selection}>{scholarshipText(s, lang).selectionProcess}</Section>
                <Section title={t.details.essay}>{scholarshipText(s, lang).essayFocus}</Section>
                <Section title={t.details.funding}>{t.details.fundingNote}</Section>
              </div>
              <div className="space-y-5">
                <Section title={t.details.values}>
                  <span className="flex flex-wrap gap-2">
                    {scholarshipText(s, lang).values.map((v) => (
                      <span key={v} className="soft-tag rounded-full px-3 py-1 text-[12.5px] font-medium">
                        {v}
                      </span>
                    ))}
                  </span>
                </Section>
                <Section title={t.details.deadlines}>
                  <ul className="space-y-1">
                    {s.deadlines.map((d) => {
                      const date = upcomingDate(d.date, lang);
                      return (
                        <li key={d.label}>
                          <span className="font-medium">{deadlineLabel(t, d.label)}</span>
                          <span className="text-muted"> · {date ?? t.details.deadlineUnknown}</span>
                        </li>
                      );
                    })}
                  </ul>
                </Section>
                <Section title={t.details.documents}>
                  <ul className="list-disc space-y-0.5 pl-5">
                    {s.documents.map((d) => (
                      <li key={d}>{docLabel(t, d)}</li>
                    ))}
                  </ul>
                </Section>
              </div>
            </div>

            <div className="mt-7 flex items-center justify-between gap-6 mobile:mt-5 mobile:flex-col mobile:items-stretch mobile:gap-4">
              <p className="max-w-[520px] text-[12px] leading-[18px] text-muted">
                {t.details.verified(formatVerified(s.lastVerified, lang))} {t.details.disclaimer}
              </p>
              <div className="flex shrink-0 items-center gap-3 mobile:flex-col-reverse mobile:items-stretch">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-light flex h-[42px] items-center justify-center gap-2 rounded-full px-5 mobile:h-[46px]"
                >
                  {t.details.officialSite}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
                <button
                  type="button"
                  onClick={() => onStart(s.id)}
                  className="btn-primary h-[42px] rounded-full px-5 mobile:h-[46px]"
                >
                  {t.matches.startApplication}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    host,
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-violet-dark">{title}</h3>
      <div>{children}</div>
    </section>
  );
}
