"use client";

import { motion } from "framer-motion";
import { MatchResult, Scholarship } from "@/lib/schema";
import { useT } from "@/lib/store";
import { MatchRing } from "./MatchRing";

interface Props {
  rank: number;
  match: MatchResult;
  scholarship: Scholarship;
  explanation: string;
  onStart: () => void;
  onDetails: () => void;
}

/** One of the top-3 cards. Rank 1 is the featured card (stronger glass + gradient border). */
export function MatchCard({ rank, match, scholarship, explanation, onStart, onDetails }: Props) {
  const { t, lang } = useT();
  const featured = rank === 1;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: "easeOut", delay: 0.12 * (rank - 1) }}
      className={`glass lift flex w-[387px] flex-col p-6 ${featured ? "glass-featured" : ""}`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`mt-[21px] inline-flex h-[26px] items-center rounded-full px-3 text-[11.5px] font-semibold ${
            featured ? "text-white" : "bg-neutral-bg text-muted"
          }`}
          style={featured ? { background: "linear-gradient(135deg, var(--violet), var(--pink-deep))" } : undefined}
        >
          {featured ? t.matches.best : `#${rank}`}
        </span>
        <MatchRing value={match.score} label={t.matches.matchPercent(match.score)} />
      </div>

      <h2 className="mt-[14px] font-display text-[22px] font-semibold leading-[27px] tracking-[-0.01em] text-ink">
        {scholarship.name}
      </h2>

      <span className="soft-tag mt-3 inline-flex h-[26px] w-fit items-center rounded-[13px] px-[10px] text-[12px] font-medium">
        {scholarship.tag[lang]}
      </span>

      <p className="mt-[14px] line-clamp-3 text-[14px] leading-[22px] text-muted" title={explanation}>
        {explanation}
      </p>

      <button
        type="button"
        onClick={featured ? onStart : onDetails}
        className={`mt-5 h-[44px] w-full rounded-full ${featured ? "btn-primary" : "btn-light"}`}
      >
        {featured ? t.matches.startApplication : t.matches.viewDetails}
      </button>
    </motion.article>
  );
}
