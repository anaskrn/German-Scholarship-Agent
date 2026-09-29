"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useAppStore, useT } from "@/lib/store";

const MAX_CV_CHARS = 5000;

export default function LandingPage() {
  const router = useRouter();
  const { t } = useT();
  const rawInput = useAppStore((s) => s.rawInput);
  const setRawInput = useAppStore((s) => s.setRawInput);
  const showToast = useAppStore((s) => s.showToast);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cvName, setCvName] = useState<string | null>(null);

  const start = (text: string) => {
    if (!text.trim()) {
      showToast(t.landing.emptyHint);
      document.getElementById("prompt")?.focus();
      return;
    }
    setRawInput(text);
    router.push("/analyzing");
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const isText = /\.(txt|md)$/i.test(file.name) || file.type.startsWith("text/");
    if (!isText) return showToast(t.landing.cvUnsupported);
    const text = (await file.text()).trim();
    if (!text) return showToast(t.landing.cvEmpty);
    // The CV text is appended to the box so the user can see exactly what will be analyzed.
    setRawInput(`${rawInput.trim()}${rawInput.trim() ? "\n\n" : ""}${text.slice(0, MAX_CV_CHARS)}`);
    setCvName(file.name);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex h-full flex-col items-center pt-[146px] text-center">
      <h1 className="font-display text-[68px] font-semibold leading-[72px] tracking-[-0.035em]">
        <span className="block text-ink">{t.landing.headline1}</span>
        <span className="text-gradient block">{t.landing.headline2}</span>
      </h1>

      <p className="mt-[14px] h-[60px] max-w-[680px] text-[19px] leading-[30px] text-muted">{t.landing.subline}</p>

      {/* Prompt box */}
      <div className="glass glass-strong mt-[34px] w-[780px] px-[27px] pb-[21px] pt-[22px] text-left focus-within:shadow-[0_16px_44px_-8px_rgba(75,47,168,0.22)]">
        <textarea
          id="prompt"
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter submits, Shift+Enter adds a line. Ignore Enter while composing (Chinese/Japanese IME).
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              start(rawInput);
            }
          }}
          placeholder={t.landing.placeholder}
          aria-label={t.landing.placeholder}
          maxLength={6000}
          className="thin-scroll block h-[52px] w-full resize-none bg-transparent text-[17px] leading-[26px] text-ink outline-none placeholder:text-muted/70"
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="soft-tag h-[30px] rounded-full px-3 text-[12px] font-medium transition-colors hover:bg-violet/15"
            >
              {cvName ? t.landing.cvAttached(cvName) : t.landing.attachCv}
            </button>
            {cvName && (
              <button
                type="button"
                onClick={() => setCvName(null)}
                aria-label={t.landing.cvRemove}
                title={t.landing.cvRemove}
                className="h-6 w-6 rounded-full text-[15px] leading-none text-muted hover:bg-white/70 hover:text-ink"
              >
                ×
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => start(rawInput)}
            className="btn-primary flex h-[42px] items-center gap-2 rounded-full px-5"
          >
            {t.landing.match}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {/* Example chips */}
      <div className="mt-[26px] flex items-center justify-center gap-[10px]">
        <span className="mr-1 text-[13px] text-muted">{t.landing.examplesLabel}</span>
        {t.landing.examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => start(example)}
            className="glass lift h-[38px] whitespace-nowrap rounded-full px-[18px] text-[13px] font-medium text-ink"
            style={{ borderRadius: 9999 }}
          >
            {example}
          </button>
        ))}
      </div>

      <p className="absolute bottom-1 left-0 right-0 text-center text-[11.5px] text-muted/80">{t.landing.privacy}</p>
    </div>
  );
}
