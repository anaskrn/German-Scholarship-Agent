"use client";

import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useId } from "react";
import { OrbitChips } from "@/lib/facts";
import { Scholarship } from "@/lib/schema";

/*
  The concentric-ring picture (design coordinates 640 x 640, centre 320,320):
  - outer ring (r 295): the 13 foundations, evenly spaced; the current top 6 light up
  - middle ring (r 220): interests & skills from the profile (4 slots: top, right, bottom, left)
  - inner ring (r 145): who you are (4 diagonal slots: level, field, background, grades)
  - centre: the orb with the live "profile match" = the best score for the facts read so far
*/

export const ORBIT_SIZE = 640;
const C = ORBIT_SIZE / 2;
const R_INNER = 145;
const R_MIDDLE = 220;
const R_OUTER = 295;

const polar = (r: number, deg: number) => ({
  x: C + r * Math.cos((deg * Math.PI) / 180),
  y: C + r * Math.sin((deg * Math.PI) / 180),
});

function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.9, ease: "easeOut" });
    return () => controls.stop();
  }, [mv, value]);
  return <motion.span>{rounded}</motion.span>;
}

interface Props {
  scholarships: Scholarship[]; // in ring order
  highlighted: Set<string>; // ids of the current top matches
  score: number; // 0-100, best score so far
  chips: OrbitChips | null;
  doneRows: number; // chips of rows < doneRows are visible
  label: string; // "profile match"
  /** small screens: drop the text labels that would be unreadable when scaled down */
  compact: boolean;
}

export function OrbitVisual({ scholarships, highlighted, score, chips, doneRows, label, compact }: Props) {
  const gradientId = useId();
  const n = scholarships.length;

  const innerAngles = [-135, -45, 135, 45];
  const middleAngles = [-90, 0, 90, 180];

  return (
    <div className="relative" style={{ width: ORBIT_SIZE, height: ORBIT_SIZE }} aria-hidden>
      {/* rings */}
      <svg width={ORBIT_SIZE} height={ORBIT_SIZE} className="absolute inset-0">
        <defs>
          <radialGradient id={`${gradientId}-glow`}>
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${gradientId}-arc`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6d28d9" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>
        <circle cx={C} cy={C} r={R_OUTER} fill="rgba(167,139,250,0.05)" stroke="rgba(124,58,237,0.2)" />
        <circle cx={C} cy={C} r={R_MIDDLE} fill="rgba(167,139,250,0.06)" stroke="rgba(124,58,237,0.16)" />
        <circle cx={C} cy={C} r={R_INNER} fill="rgba(167,139,250,0.08)" stroke="rgba(124,58,237,0.14)" />
        <circle cx={C} cy={C} r={130} fill={`url(#${gradientId}-glow)`} />
        {/* progress ring around the orb */}
        <circle cx={C} cy={C} r={92} fill="none" stroke="rgba(124,58,237,0.14)" strokeWidth={3} />
        <motion.circle
          cx={C}
          cy={C}
          r={92}
          fill="none"
          stroke={`url(#${gradientId}-arc)`}
          strokeWidth={4}
          strokeLinecap="round"
          transform={`rotate(-90 ${C} ${C})`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: score / 100 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </svg>

      {/* slow orbiting dots */}
      {[
        { r: R_OUTER, s: 34, off: 0 },
        { r: R_MIDDLE, s: 26, off: -9 },
        { r: R_INNER, s: 19, off: -4 },
      ].map(({ r, s, off }) => (
        <div
          key={r}
          className="orbit-spin absolute"
          style={{
            width: r * 2,
            height: r * 2,
            left: C - r,
            top: C - r,
            ["--orbit-duration" as string]: `${s}s`,
            animationDelay: `${off}s`,
            animationDirection: r === R_MIDDLE ? "reverse" : "normal",
          }}
        >
          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink shadow-[0_0_10px_3px_rgba(244,114,182,0.55)]" />
        </div>
      ))}

      {/* the 13 foundations on the outer ring */}
      {scholarships.map((s, i) => {
        const { x, y } = polar(R_OUTER, -90 + (i * 360) / n);
        const on = highlighted.has(s.id);
        return (
          <div
            key={s.id}
            title={s.shortName}
            className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-semibold transition-all duration-500 ${
              on
                ? "z-10 text-[11px] text-violet-dark shadow-[0_8px_20px_-6px_rgba(124,58,237,0.5)]"
                : "text-[10.5px] text-muted shadow-[0_4px_12px_-6px_rgba(75,47,168,0.25)]"
            }`}
            style={{
              left: x,
              top: y,
              width: on ? 40 : 34,
              height: on ? 40 : 34,
              border: "1.5px solid transparent",
              background: on
                ? "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#7c3aed,#f472b6) border-box"
                : "rgba(255,255,255,0.6)",
            }}
          >
            {!compact && s.abbr}
          </div>
        );
      })}

      {/* profile chips: inner ring (who you are) and middle ring (interests & skills) */}
      {!compact && chips && (
        <>
          {chips.inner.map((chip, i) => {
            const { x, y } = polar(R_INNER, innerAngles[i]);
            return <Chip key={`in${i}`} chip={chip} x={x} y={y} visible={!!chip && chip.row < doneRows} />;
          })}
          {chips.middle.map((chip, i) => {
            const { x, y } = polar(R_MIDDLE, middleAngles[i]);
            return <Chip key={`mid${i}`} chip={chip} x={x} y={y} visible={!!chip && chip.row < doneRows} />;
          })}
        </>
      )}

      {/* the orb */}
      <div
        className="absolute flex flex-col items-center justify-center rounded-full text-white"
        style={{
          width: 136,
          height: 136,
          left: C - 68,
          top: C - 68,
          background: "radial-gradient(120% 120% at 30% 18%, #e9d5ff 0%, #b98af5 34%, #e879b9 78%, #f9a8d4 100%)",
          boxShadow: "0 24px 50px -12px rgba(124,58,237,0.55), inset 0 -10px 24px rgba(236,72,153,0.35)",
        }}
      >
        <span
          className="pointer-events-none absolute left-[18%] top-[8%] h-[34%] w-[64%] rounded-full"
          style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.55), rgba(255,255,255,0))" }}
        />
        <span className="relative font-display text-[34px] font-semibold leading-[38px] tracking-[-0.02em]">
          <AnimatedNumber value={score} />%
        </span>
        <span className="relative mt-0.5 max-w-[110px] text-center text-[11px] leading-[13px] text-white/85">
          {label}
        </span>
      </div>
    </div>
  );
}

function Chip({ chip, x, y, visible }: { chip: { text: string } | null; x: number; y: number; visible: boolean }) {
  return (
    <div className="absolute" style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}>
      <AnimatePresence>
        {visible && chip && (
          <motion.div
            key={chip.text}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex h-[34px] max-w-[190px] items-center gap-2 whitespace-nowrap rounded-full border border-white bg-white/85 px-[14px] text-[13.5px] font-medium text-ink shadow-[0_8px_20px_-8px_rgba(75,47,168,0.3)]"
          >
            <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-pink" />
            <span className="truncate">{chip.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
