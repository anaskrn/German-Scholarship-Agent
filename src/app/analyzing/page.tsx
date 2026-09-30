"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { buildAnalysisText, runAnalysis, scholarshipCount } from "@/lib/analysis";
import { useAppStore, useT } from "@/lib/store";

export default function AnalyzingPage() {
  const router = useRouter();
  const { t, lang } = useT();
  const hydrated = useAppStore((s) => s.hydrated);
  const rawInput = useAppStore((s) => s.rawInput);
  const cv = useAppStore((s) => s.cv);
  const setAnalysis = useAppStore((s) => s.setAnalysis);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!hydrated) return;
    const text = buildAnalysisText(rawInput, cv?.text);
    if (!text) {
      router.replace("/");
      return;
    }
    let cancelled = false;
    runAnalysis(text, lang, (s) => !cancelled && setStep(s)).then((result) => {
      if (cancelled) return;
      setStep(3);
      setAnalysis(result);
      setTimeout(() => router.replace("/matches"), 350);
    });
    return () => {
      cancelled = true;
    };
    // Only (re)run when hydration finishes; language switches mid-analysis are handled on the matches page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  return (
    <div className="flex h-full items-center justify-center pb-[6px]">
      <div className="glass glass-strong flex w-[520px] flex-col items-center rounded-[32px] p-10 text-center">
        <SpinnerRing />
        <h1 className="mt-6 font-display text-[28px] font-semibold tracking-[-0.02em] text-ink">
          {t.analyzing.title(scholarshipCount())}
        </h1>
        <p className="mt-[18px] text-[14px] text-muted">{t.analyzing.subtitle}</p>

        <ul className="mt-[22px] flex w-full flex-col gap-[10px]" aria-live="polite">
          {t.analyzing.steps.map((label, i) => (
            <StepRow key={label} label={label} state={step > i ? "done" : step === i ? "active" : "todo"} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function SpinnerRing() {
  const id = useId();
  return (
    <motion.svg
      width="84"
      height="84"
      viewBox="0 0 84 84"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--violet)" />
          <stop offset="100%" stopColor="var(--pink)" />
        </linearGradient>
      </defs>
      <circle cx="42" cy="42" r="38" fill="none" stroke="rgba(184,179,204,0.35)" strokeWidth="5" />
      <circle
        cx="42"
        cy="42"
        r="38"
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${2 * Math.PI * 38 * 0.68} ${2 * Math.PI * 38}`}
        transform="rotate(-90 42 42)"
      />
    </motion.svg>
  );
}

function StepRow({ label, state }: { label: string; state: "done" | "active" | "todo" }) {
  return (
    <motion.li
      layout
      className="flex h-11 items-center gap-3 rounded-2xl bg-white/70 px-4 text-left text-[14px] font-medium"
    >
      {state === "done" ? (
        <motion.span
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          className="flex h-5 w-5 items-center justify-center rounded-full bg-[#22c55e] text-white"
        >
          <Check className="h-3 w-3" strokeWidth={3.5} aria-hidden />
        </motion.span>
      ) : (
        <span
          className={`h-5 w-5 rounded-full border-[1.5px] ${state === "active" ? "border-violet-light" : "border-neutral-line/70"}`}
        />
      )}
      <span className={state === "active" ? "text-violet-dark" : state === "done" ? "text-ink" : "text-muted"}>{label}</span>
    </motion.li>
  );
}
