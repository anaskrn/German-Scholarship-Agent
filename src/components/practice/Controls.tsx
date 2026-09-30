"use client";

import { useReducedMotion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";
import { Translations } from "@/lib/i18n";

interface Props {
  t: Translations;
  live: boolean;
  ended: boolean;
  textMode: boolean;
  listening: boolean;
  muted: boolean;
  onRepeat: () => void;
  onSkip: () => void;
  onMic: () => void;
  onBack: () => void;
  onAgain: () => void;
}

const glassButton =
  "flex h-11 min-w-[132px] items-center px-4 justify-center rounded-[22px] border border-white/95 bg-white/60 text-[14px] font-medium text-ink shadow-[0_16px_20px_-10px_rgba(75,47,168,0.12)] backdrop-blur-[10px] transition-transform active:scale-[0.97] disabled:opacity-50 mobile:min-w-[110px] mobile:px-3";

/** Repeat question · mic · Skip question (Figma 57:192), or the two end-of-session actions. */
export function Controls({
  t,
  live,
  ended,
  textMode,
  listening,
  muted,
  onRepeat,
  onSkip,
  onMic,
  onBack,
  onAgain,
}: Props) {
  const p = t.practice;
  const reduced = useReducedMotion();

  if (ended) {
    return (
      <div className="flex items-center justify-center gap-3">
        <button type="button" onClick={onBack} className="btn-primary h-11 rounded-full px-6">
          {p.back}
        </button>
        <button type="button" onClick={onAgain} className="btn-light h-11 rounded-full border border-white/95 px-6">
          {p.again}
        </button>
      </div>
    );
  }

  const micLabel = !live ? p.micStart : textMode ? p.captionText : muted ? p.micUnmute : p.micMute;

  return (
    <div className="flex flex-col items-center gap-[10px]">
      <div className="flex items-center gap-[26px] mobile:gap-3">
        <button type="button" onClick={onRepeat} disabled={!live} className={glassButton}>
          {p.repeat}
        </button>

        <div className="relative flex h-[68px] w-[68px] items-center justify-center">
          {listening && !reduced && (
            <>
              <span
                aria-hidden
                className="absolute h-[84px] w-[84px] animate-ping rounded-full border border-violet/35"
                style={{ animationDuration: "2.4s" }}
              />
              <span
                aria-hidden
                className="absolute h-[112px] w-[112px] animate-ping rounded-full border border-violet/15"
                style={{ animationDuration: "3s" }}
              />
            </>
          )}
          <button
            type="button"
            onClick={onMic}
            disabled={!live}
            aria-label={micLabel}
            aria-pressed={live && !textMode ? muted : undefined}
            className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full border-[1.5px] border-white/60 text-white shadow-[0_10px_26px_-2px_rgba(124,58,237,0.5)] transition-transform active:scale-95 disabled:opacity-60"
            style={{ background: "linear-gradient(225deg, #7c3aed 14.6%, #f472b6 85.4%)" }}
          >
            {muted && live && !textMode ? (
              <MicOff className="h-6 w-6" aria-hidden />
            ) : (
              <Mic className="h-6 w-6" aria-hidden />
            )}
          </button>
        </div>

        <button type="button" onClick={onSkip} disabled={!live} className={glassButton}>
          {p.skip}
        </button>
      </div>
      <p className="text-center text-[12px] font-medium text-muted">{textMode && live ? p.captionText : p.caption}</p>
    </div>
  );
}
