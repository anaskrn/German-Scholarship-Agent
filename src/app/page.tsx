"use client";

import { ArrowRight, Check, Loader2, Paperclip } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PdfProgress, readPdfInBrowser } from "@/lib/ocr";
import { useAppStore, useT } from "@/lib/store";

const SERVER_MAX_BYTES = 4 * 1024 * 1024; // above this, the PDF is read in the browser instead of uploaded
const MAX_CV_BYTES = 15 * 1024 * 1024;

export default function LandingPage() {
  const router = useRouter();
  const { t, lang } = useT();
  const rawInput = useAppStore((s) => s.rawInput);
  const setRawInput = useAppStore((s) => s.setRawInput);
  const cv = useAppStore((s) => s.cv);
  const setCv = useAppStore((s) => s.setCv);
  const showToast = useAppStore((s) => s.showToast);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cvBusy, setCvBusy] = useState(false);
  const [cvStatus, setCvStatus] = useState<PdfProgress | null>(null);

  const start = (text: string) => {
    if (cvBusy) return;
    if (!text.trim() && !cv) {
      showToast(t.landing.emptyHint);
      document.getElementById("prompt")?.focus();
      return;
    }
    setRawInput(text);
    router.push("/analyzing");
  };

  /**
   * Reads the CV. Text PDFs go to /api/cv (fast). Scans, and files too big to upload, are read in the browser
   * with OCR. Either way the resulting text is analyzed together with the description.
   */
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) return showToast(t.landing.cvNotPdf);
    if (file.size > MAX_CV_BYTES) return showToast(t.landing.cvTooLarge);

    setCvBusy(true);
    setCvStatus({ phase: "text" });
    try {
      let result: { text: string; pages: number } | null = null;

      if (file.size <= SERVER_MAX_BYTES) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/cv", { method: "POST", body, signal: AbortSignal.timeout(40_000) });
        const data = (await res.json()) as { text?: string; pages?: number; error?: string };
        if (res.ok && data.text) result = { text: data.text, pages: data.pages ?? 1 };
        else if (data.error === "not_pdf") return showToast(t.landing.cvNotPdf);
        else if (data.error !== "no_text") return showToast(t.landing.cvFailed);
      }

      if (!result) result = await readPdfInBrowser(file, lang, setCvStatus);
      if (result.text.replace(/\s/g, "").length < 40) return showToast(t.landing.cvNoText);
      setCv({ name: file.name, text: result.text.slice(0, 12_000), pages: result.pages });
    } catch {
      showToast(t.landing.cvFailed);
    } finally {
      setCvBusy(false);
      setCvStatus(null);
      if (fileRef.current) fileRef.current.value = ""; // allows choosing the same file again
    }
  };

  const cvLabel =
    cvStatus?.phase === "ocr"
      ? t.landing.cvScanning(cvStatus.page, cvStatus.total)
      : cvStatus?.phase === "ocr-load"
        ? t.landing.cvLoadingOcr
        : t.landing.cvReading;

  return (
    <div className="flex h-full flex-col items-center pt-[146px] text-center mobile:h-auto mobile:min-h-full mobile:pt-4">
      <h1 className="font-display text-[68px] font-semibold leading-[72px] tracking-[-0.035em] mobile:text-[38px] mobile:leading-[42px] mobile:tracking-[-0.03em]">
        <span className="block text-ink">{t.landing.headline1}</span>
        <span className="text-gradient block">{t.landing.headline2}</span>
      </h1>

      <p className="mt-[14px] h-[60px] max-w-[680px] text-[19px] leading-[30px] text-muted mobile:mt-3 mobile:h-auto mobile:text-[15.5px] mobile:leading-[24px]">{t.landing.subline}</p>

      {/* Prompt box */}
      <div className="glass glass-strong mt-[34px] w-[780px] px-[27px] pb-[21px] pt-[22px] text-left mobile:mt-6 mobile:w-full mobile:px-4 mobile:pb-4 mobile:pt-4 focus-within:shadow-[0_16px_44px_-8px_rgba(75,47,168,0.22)]">
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
          className="thin-scroll block h-[52px] w-full resize-none bg-transparent text-[17px] leading-[26px] text-ink outline-none placeholder:text-muted/70 mobile:h-[104px] mobile:text-[16px]"
        />
        <div className="mt-2 flex items-center justify-between mobile:mt-3 mobile:flex-col mobile:items-stretch mobile:gap-3">
          <div className="flex items-center gap-2 mobile:w-full">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            {cv ? (
              <>
                <span className="flex h-[42px] max-w-[300px] items-center gap-2 mobile:max-w-none mobile:flex-1 rounded-full bg-success-bg px-4 text-[13.5px] font-semibold text-success">
                  <Check className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden />
                  <span className="truncate">{t.landing.cvAttached(cv.name, cv.pages)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setCv(null)}
                  aria-label={t.landing.cvRemove}
                  title={t.landing.cvRemove}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[18px] leading-none text-muted hover:bg-white/80 hover:text-ink"
                >
                  ×
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={cvBusy}
                onClick={() => fileRef.current?.click()}
                className="soft-tag flex h-[42px] items-center gap-2 mobile:min-h-[44px] mobile:w-full mobile:justify-center rounded-full border border-violet/25 bg-violet/[0.12] px-4 text-[13.5px] font-semibold transition-all hover:bg-violet/20 hover:shadow-[0_6px_16px_-6px_rgba(124,58,237,0.45)] disabled:cursor-wait"
              >
                {cvBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Paperclip className="h-4 w-4" aria-hidden />}
                {cvBusy ? cvLabel : t.landing.attachCv}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => start(rawInput)}
            disabled={cvBusy}
            className="btn-primary flex h-[42px] items-center gap-2 rounded-full px-5 mobile:h-[46px] mobile:w-full mobile:justify-center"
          >
            {t.landing.match}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {/* Example chips */}
      <div className="mt-[26px] flex items-center justify-center gap-[10px] mobile:mt-5 mobile:flex-wrap mobile:gap-2">
        <span className="mr-1 text-[13px] text-muted mobile:mr-0 mobile:w-full">{t.landing.examplesLabel}</span>
        {t.landing.examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => start(example)}
            className="glass lift h-[38px] whitespace-nowrap rounded-full px-[18px] text-[13px] font-medium text-ink mobile:h-auto mobile:min-h-[40px] mobile:whitespace-normal mobile:px-4 mobile:py-2"
            style={{ borderRadius: 9999 }}
          >
            {example}
          </button>
        ))}
      </div>

      <p className="absolute bottom-1 left-0 right-0 text-center text-[11.5px] text-muted/80 mobile:static mobile:mt-6 mobile:px-2 mobile:pb-2">{t.landing.privacy}</p>
    </div>
  );
}
