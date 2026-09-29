"use client";

import { motion } from "framer-motion";
import { useId } from "react";

/** Circular progress ring with a violet→pink arc. The arc animates from 0 to `value`. */
export function MatchRing({ value, size = 68, stroke = 5, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const id = useId();
  const r = (size - stroke) / 2;
  const c = size / 2;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label ?? `${value}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--violet)" />
            <stop offset="100%" stopColor="var(--pink)" />
          </linearGradient>
        </defs>
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(184,179,204,0.28)" strokeWidth={stroke} />
        <motion.circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: value / 100 }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.15 }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-[17px] font-semibold text-ink">
        {value}%
      </span>
    </div>
  );
}
