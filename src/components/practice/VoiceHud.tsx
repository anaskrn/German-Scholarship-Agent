"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { HudState } from "@/lib/useInterview";

/*
  Voice HUD (Figma node 56:2). Designed in a 500x500 box around the orb:
  halo (640) · dial with 96 ticks (r 250, slowly turning) · hairline ring (r 176) · question track + progress (r 95)
  · 72 radial voice bars starting at r 104 · 150px glass orb.
*/

export const HUD_SIZE = 500;
const CENTER = HUD_SIZE / 2;
const BARS = 72;
const BAR_INNER = 104;

/** One tick of the dial: every 8th is long, every 4th medium, the rest short (as in the design). */
function dialTicks() {
  return Array.from({ length: 96 }, (_, i) => {
    const long = i % 8 === 0;
    const medium = !long && i % 4 === 0;
    const length = long ? 14 : medium ? 9 : 5;
    const angle = ((i * 360) / 96 - 90) * (Math.PI / 180);
    const r1 = 250;
    const r2 = 250 - length;
    return {
      key: i,
      x1: CENTER + Math.cos(angle) * r1,
      y1: CENTER + Math.sin(angle) * r1,
      x2: CENTER + Math.cos(angle) * r2,
      y2: CENTER + Math.sin(angle) * r2,
      width: long ? 2 : 1.4,
      opacity: long ? 0.55 : medium ? 0.35 : 0.22,
    };
  });
}
const TICKS = dialTicks();

interface Props {
  state: HudState;
  /** 0-1, question progress shown by the inner ring */
  progress: number;
  title: string;
  hint: string;
  /** current audio spectrum (input while listening, output while speaking); null without audio */
  getFrequencyData: () => Uint8Array | null;
}

export function VoiceHud({ state, progress, title, hint, getFrequencyData }: Props) {
  const reduced = useReducedMotion();
  const bars = useRef<Array<HTMLDivElement | null>>([]);
  const stateRef = useRef(state);
  const freqRef = useRef(getFrequencyData);
  useEffect(() => {
    stateRef.current = state;
    freqRef.current = getFrequencyData;
  });

  // The bars follow the real audio level; without audio they breathe gently.
  useEffect(() => {
    const current = new Array<number>(BARS).fill(0.12);
    let raf = 0;
    const draw = (now: number) => {
      const data = freqRef.current();
      // resting height of the bars per state (real audio lifts them above this)
      const rest = {
        listening: 0.3,
        speaking: 0.36,
        thinking: 0.22,
        connecting: 0.2,
        typing: 0.17,
        idle: 0.12,
        ended: 0.1,
      }[stateRef.current];
      for (let i = 0; i < BARS; i++) {
        const half = i < BARS / 2 ? i : BARS - 1 - i; // mirrored: left and right side move together
        let target = 0;
        if (data && data.length > 0) {
          const bin = Math.floor((half / (BARS / 2)) * Math.min(data.length, 64) * 0.75);
          target = Math.pow(data[bin] / 255, 1.15);
        }
        const idle = rest * (1 + 0.45 * Math.sin(now / 650 + i * 0.45) + 0.25 * Math.sin(now / 380 + i * 1.1));
        const goal = reduced ? rest : Math.max(target, idle);
        current[i] += (goal - current[i]) * 0.3;
        const el = bars.current[i];
        if (el) {
          el.style.height = `${(8 + current[i] * 44).toFixed(1)}px`;
          el.style.opacity = String(0.62 + current[i] * 0.38);
        }
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const speaking = state === "speaking";
  const breathe = reduced
    ? undefined
    : {
        scale: speaking
          ? [1, 1.06, 1]
          : state === "listening"
            ? [1, 1.035, 1]
            : state === "thinking"
              ? [1, 1.02, 1]
              : 1,
      };

  return (
    <div className="relative" style={{ width: HUD_SIZE, height: HUD_SIZE }} aria-hidden={false}>
      {/* halo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/practice/halo.svg"
        alt=""
        className="pointer-events-none absolute"
        style={{ left: -70, top: -70, width: 640, height: 640 }}
      />

      {/* dial */}
      <svg className="hud-spin pointer-events-none absolute inset-0" width={HUD_SIZE} height={HUD_SIZE} aria-hidden>
        {TICKS.map((t) => (
          <line
            key={t.key}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="#7c3aed"
            strokeOpacity={t.opacity}
            strokeWidth={t.width}
            strokeLinecap="round"
          />
        ))}
      </svg>

      {/* hairline ring + question track */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/practice/hud-ring.svg"
        alt=""
        className="pointer-events-none absolute"
        style={{ left: 74, top: 74, width: 352, height: 352 }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/practice/question-track.svg"
        alt=""
        className="pointer-events-none absolute"
        style={{ left: 155, top: 155, width: 190, height: 190 }}
      />

      {/* progress along the question track */}
      <svg
        className="pointer-events-none absolute"
        style={{ left: 155, top: 155 }}
        width={190}
        height={190}
        aria-hidden
      >
        <defs>
          <linearGradient id="hud-progress" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7c3aed" />
            <stop offset="1" stopColor="#f472b6" />
          </linearGradient>
        </defs>
        <motion.circle
          cx={95}
          cy={95}
          r={94.4}
          fill="none"
          stroke="url(#hud-progress)"
          strokeWidth={3}
          strokeLinecap="round"
          transform="rotate(-90 95 95)"
          style={{ filter: "drop-shadow(0 0 4px rgba(124,58,237,0.5))" }}
          initial={false}
          animate={{ pathLength: Math.max(0.001, Math.min(1, progress)) }}
          transition={{ duration: reduced ? 0 : 0.6, ease: "easeOut" }}
        />
      </svg>

      {/* 72 radial voice bars */}
      {Array.from({ length: BARS }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            bars.current[i] = el;
          }}
          className="pointer-events-none absolute rounded-[1.6px]"
          style={{
            left: CENTER - 1.6,
            top: CENTER,
            width: 3.2,
            height: 12,
            opacity: 0.7,
            background: "linear-gradient(to bottom, #7c3aed, #f472b6)",
            transformOrigin: "50% 0",
            transform: `rotate(${(i * 360) / BARS}deg) translateY(${BAR_INNER}px)`,
          }}
        />
      ))}

      {/* glass orb */}
      <motion.div
        className="absolute flex flex-col items-center justify-center gap-[2px] overflow-hidden rounded-full border-[1.5px] border-white/75"
        style={{
          left: CENTER - 75,
          top: CENTER - 75,
          width: 150,
          height: 150,
          background: "linear-gradient(225deg, #8b5cf6 14.6%, #e879b9 85.4%)",
          boxShadow: "0 16px 48px -4px rgba(124,58,237,0.6), inset 0 4px 14px rgba(255,255,255,0.5)",
        }}
        animate={breathe}
        transition={{ duration: speaking ? 0.9 : 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/practice/highlight.svg"
          alt=""
          className="pointer-events-none absolute"
          style={{ left: 21.5, top: 4.5, width: 104, height: 56 }}
        />
        <span className="relative font-display text-[22px] font-semibold tracking-[-0.01em] text-white">{title}</span>
        <span className="relative text-[11px] font-medium text-white/85">{hint}</span>
      </motion.div>

      {/* text alternative for the voice states */}
      <span className="sr-only" role="status" aria-live="polite">
        {title}. {hint}
      </span>
    </div>
  );
}
