"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MatchCard } from "@/components/MatchCard";
import { ScholarshipDetails } from "@/components/ScholarshipDetails";
import { explanationFor, fetchExplanations, TOP_N } from "@/lib/analysis";
import { getScholarshipById } from "@/lib/matching";
import { useAppStore, useT } from "@/lib/store";

export default function MatchesPage() {
  const router = useRouter();
  const { t, lang } = useT();
  const hydrated = useAppStore((s) => s.hydrated);
  const matches = useAppStore((s) => s.matches);
  const profile = useAppStore((s) => s.profile);
  const explanations = useAppStore((s) => s.explanations);
  const aiDegraded = useAppStore((s) => s.aiDegraded);
  const setExplanations = useAppStore((s) => s.setExplanations);
  const [openId, setOpenId] = useState<string | null>(null);

  // Nothing analyzed yet (e.g. opened directly): go back to the start.
  useEffect(() => {
    if (hydrated && matches.length === 0) router.replace("/");
  }, [hydrated, matches.length, router]);

  // The language was switched after the explanations were written: fetch them again in the new language.
  // Template explanations are shown meanwhile, so the UI never waits or breaks.
  const requestedLang = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated || !profile || matches.length === 0) return;
    if (explanations?.lang === lang || requestedLang.current === lang) return;
    requestedLang.current = lang;
    fetchExplanations(profile, matches, lang).then(({ byId, degraded }) => setExplanations({ lang, byId }, degraded));
  }, [hydrated, lang, profile, matches, explanations, setExplanations]);

  const top = useMemo(() => matches.slice(0, TOP_N), [matches]);
  const rest = useMemo(() => matches.slice(TOP_N), [matches]);
  const half = Math.ceil(rest.length / 2);
  const columns = [rest.slice(0, half), rest.slice(half)];

  const openMatch = matches.find((m) => m.scholarshipId === openId) ?? null;
  const openScholarship = openId ? (getScholarshipById(openId) ?? null) : null;

  const startApplication = (id: string) => router.push(`/workspace/${id}`);

  if (matches.length === 0) return null;

  return (
    <div className="flex h-full flex-col pt-[12px] mobile:h-auto mobile:pt-0">
      <div className="flex items-center justify-between mobile:flex-col mobile:items-start mobile:gap-3">
        <div className="flex items-center gap-4 mobile:flex-wrap mobile:gap-2">
          <h1 className="font-display text-[42px] font-semibold leading-[50px] tracking-[-0.025em] text-ink mobile:text-[30px] mobile:leading-[36px]">
            {t.matches.title(top.length)}
          </h1>
          {aiDegraded && (
            <span className="rounded-full bg-warning-bg px-3 py-1 text-[12px] font-medium text-warning-text">
              {t.matches.basicNotice}
            </span>
          )}
        </div>
        <button type="button" onClick={() => router.push("/")} className="glass lift h-[42px] rounded-full px-[19px] text-[14px] font-medium text-ink mobile:h-[44px]" style={{ borderRadius: 9999 }}>
          {t.matches.refine}
        </button>
      </div>

      <div className="mt-[20px] flex min-h-[342px] items-start gap-5 mobile:mt-4 mobile:min-h-0 mobile:flex-col mobile:gap-4">
        {top.map((m, i) => {
          const s = getScholarshipById(m.scholarshipId);
          if (!s) return null;
          return (
            <MatchCard
              key={m.scholarshipId}
              rank={i + 1}
              match={m}
              scholarship={s}
              explanation={explanationFor(m, lang, explanations)}
              onStart={() => startApplication(s.id)}
              onDetails={() => setOpenId(s.id)}
            />
          );
        })}
      </div>

      <div className="mt-[20px] flex items-baseline justify-between mobile:mt-6">
        <h2 className="text-[15px] font-semibold text-ink">{t.matches.more}</h2>
        <span className="text-[12px] text-muted">{t.matches.sortedByFit}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 mobile:grid-cols-1 mobile:gap-y-2">
        {columns.map((col, ci) => (
          <ul key={ci} className="flex flex-col gap-2">
            {col.map((m, i) => {
              const s = getScholarshipById(m.scholarshipId);
              if (!s) return null;
              return (
                <motion.li
                  key={m.scholarshipId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.45 + 0.05 * (ci * half + i) }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(s.id)}
                    className="glass glass-row lift flex h-[44px] w-full items-center justify-between gap-3 px-[19px] text-left mobile:h-auto mobile:min-h-[52px] mobile:px-4 mobile:py-2"
                    style={{ borderRadius: 16 }}
                    aria-label={`${s.name}, ${t.matches.matchPercent(m.score)}`}
                  >
                    <span className="flex min-w-0 items-baseline gap-3 mobile:flex-col mobile:items-start mobile:gap-0">
                      <span className="truncate text-[14px] font-medium text-ink mobile:max-w-full">{s.name}</span>
                      <span className="shrink-0 text-[12px] text-muted">{s.tag[lang].split(" · ").pop()}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="h-[5px] w-16 overflow-hidden rounded-full bg-neutral-line/30">
                        <motion.span
                          className="block h-full rounded-full"
                          style={{ background: "var(--brand-gradient)" }}
                          initial={{ width: 0 }}
                          animate={{ width: `${m.score}%` }}
                          transition={{ duration: 0.9, ease: "easeOut", delay: 0.6 + 0.05 * (ci * half + i) }}
                        />
                      </span>
                      <span className="w-[34px] text-right text-[13px] font-medium text-ink/80">{m.score}%</span>
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        ))}
      </div>

      <ScholarshipDetails
        scholarship={openScholarship}
        match={openMatch}
        explanation={openMatch ? explanationFor(openMatch, lang, explanations) : ""}
        onClose={() => setOpenId(null)}
        onStart={startApplication}
      />
    </div>
  );
}
