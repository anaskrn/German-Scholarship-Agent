"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Mic } from "lucide-react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Translations } from "@/lib/i18n";

interface Props {
  t: Translations;
  open: boolean;
  /** false when no voice agent is configured: only the text mode is offered */
  voiceAvailable: boolean;
  onVoice: () => void;
  onText: () => void;
  onCancel: () => void;
}

/** Shown before the microphone is used: what is sent where, and that we store no audio. */
export function ConsentDialog({ t, open, voiceAvailable, onVoice, onText, onCancel }: Props) {
  const c = t.practice.consent;
  const primaryRef = useRef<HTMLButtonElement>(null);
  // Portal into the scaled stage so the overlay covers the whole canvas (same as the scholarship details).
  const host = useSyncExternalStore(
    () => () => {},
    () => document.querySelector("[data-overlay-root]"),
    () => null,
  );

  useEffect(() => {
    if (!open) return;
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!host) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-[60] flex items-center justify-center bg-ink/25 backdrop-blur-[6px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="consent-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="glass glass-strong w-[520px] p-8 mobile:w-[calc(100%-24px)] mobile:p-5"
            style={{ background: "rgba(255,255,255,0.88)", borderRadius: 28 }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full text-white"
              style={{ background: "linear-gradient(225deg, #7c3aed 14.6%, #f472b6 85.4%)" }}
              aria-hidden
            >
              <Mic className="h-6 w-6" />
            </div>
            <h2 id="consent-title" className="mt-4 font-display text-[26px] font-semibold tracking-[-0.015em] text-ink">
              {c.title}
            </h2>
            <div className="mt-3 space-y-2 text-[14.5px] leading-[22px] text-muted">
              {voiceAvailable ? (
                <>
                  <p>{c.mic}</p>
                  <p>{c.provider}</p>
                  <p className="font-medium text-ink">{c.storage}</p>
                </>
              ) : (
                <p>{c.noVoice}</p>
              )}
              <p>{c.beta}</p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                ref={primaryRef}
                type="button"
                onClick={voiceAvailable ? onVoice : onText}
                className="btn-primary h-11 rounded-full px-6"
              >
                {voiceAvailable ? c.allow : c.startText}
              </button>
              {voiceAvailable && (
                <button
                  type="button"
                  onClick={onText}
                  className="btn-light h-11 rounded-full border border-white/95 px-5"
                >
                  {c.textOnly}
                </button>
              )}
              <button
                type="button"
                onClick={onCancel}
                className="h-11 px-2 text-[14px] font-medium text-muted underline-offset-2 hover:text-ink hover:underline"
              >
                {c.cancel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    host,
  );
}
