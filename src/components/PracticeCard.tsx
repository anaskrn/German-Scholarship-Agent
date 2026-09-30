"use client";

import { Translations } from "@/lib/i18n";

/** Optional beta step. This button is the only way into the interview practice (step 4). */
export function PracticeCard({ t, onStart }: { t: Translations; onStart: () => void }) {
  return (
    <section
      className="glass glass-beta flex shrink-0 flex-col items-start gap-2 px-5 py-[18px]"
      style={{ background: "rgba(255, 255, 255, 0.66)" }}
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted/90">
          {t.workspace.practiceLabel}
        </span>
        <span className="rounded-[9px] border-[1.2px] border-violet bg-violet/10 px-[9px] py-[3px] text-[10.5px] font-semibold tracking-[0.12em] text-violet-dark">
          {t.nav.beta}
        </span>
      </div>
      <h2 className="font-display text-[20px] font-semibold leading-[24px] tracking-[-0.01em] text-ink">
        {t.workspace.practiceTitle}
      </h2>
      <p className="text-[13px] leading-[19px] text-muted">{t.workspace.practiceText}</p>
      <button
        type="button"
        onClick={onStart}
        className="mt-1 flex w-full items-center justify-center rounded-[20px] py-3 text-[14px] font-medium text-white shadow-[0_8px_10px_-4px_rgba(124,58,237,0.35)] transition-transform active:scale-[0.98]"
        style={{ background: "linear-gradient(186deg, var(--violet) 13%, var(--pink) 87%)" }}
      >
        {t.workspace.practiceCta}
      </button>
    </section>
  );
}
