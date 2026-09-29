"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { countWords, errorKind, plain, postJson } from "@/lib/client-api";
import { printLetter } from "@/lib/export";
import { Draft, useAppStore, useT } from "@/lib/store";

type Mode = "improve" | "shorten" | "translate";

interface Suggestion {
  mode: Mode;
  /** the passage that was sent, and where it sits in the body */
  source: string;
  wholeBody: boolean;
  feedback: string;
  alternatives: string[];
}

interface Props {
  scholarshipId: string;
  name: string;
  draft: Draft | undefined;
  onDraftChange: (patch: Partial<Omit<Draft, "savedAt">>) => void;
}

/** Paragraph around the caret (used when nothing is selected for Improve / Shorten). */
function paragraphAt(text: string, caret: number): string {
  const start = text.lastIndexOf("\n\n", Math.max(0, caret - 1));
  const end = text.indexOf("\n\n", caret);
  return text.slice(start === -1 ? 0 : start + 2, end === -1 ? text.length : end).trim();
}

export function Editor({ scholarshipId, name, draft, onDraftChange }: Props) {
  const { t, lang } = useT();
  const showToast = useAppStore((s) => s.showToast);

  const title = draft?.title ?? t.workspace.defaultTitle(name);
  const salutation = draft?.salutation ?? t.workspace.salutation;
  const body = draft?.body ?? "";

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [busy, setBusy] = useState<Mode | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  // "Saved 2m ago" ticks along without any user action.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(id);
  }, []);
  const minutes = draft?.savedAt ? Math.floor((now - draft.savedAt) / 60_000) : null;
  const savedLabel =
    minutes === null ? t.workspace.notSaved : minutes < 1 ? t.workspace.savedNow : t.workspace.savedMinutes(minutes);

  // Title grows with its content (2 lines in the design).
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  const runTool = async (mode: Mode) => {
    const el = bodyRef.current;
    const selected = el && el.selectionEnd > el.selectionStart ? body.slice(el.selectionStart, el.selectionEnd).trim() : "";
    const wholeBody = mode === "translate" && !selected;
    const source = selected || (wholeBody ? body.trim() : paragraphAt(body, el?.selectionStart ?? 0));

    if (!source) return showToast(t.workspace.toolNeedsText);

    setBusy(mode);
    setSuggestion(null);
    try {
      const res = await postJson("/api/coach/edit", { lang, scholarshipId, mode, text: source.slice(0, 8000) });
      if (!res.ok) return showToast(t.workspace.errors[await errorKind(res)]);
      const data = (await res.json()) as { feedback: string; alternatives: string[] };
      setSuggestion({
        mode,
        source,
        wholeBody,
        feedback: plain(data.feedback ?? ""),
        alternatives: (data.alternatives ?? []).map(plain).filter(Boolean),
      });
    } catch {
      showToast(t.workspace.errors.failed);
    } finally {
      setBusy(null);
    }
  };

  /** Applies a suggestion. Only ever runs after an explicit click on "Use this". */
  const accept = (text: string) => {
    if (!suggestion) return;
    let next: string;
    if (suggestion.wholeBody) {
      next = text;
    } else {
      const idx = body.indexOf(suggestion.source);
      // The user kept typing and the passage moved or changed: append instead of overwriting anything.
      next = idx === -1 ? `${body}\n\n${text}` : body.slice(0, idx) + text + body.slice(idx + suggestion.source.length);
    }
    onDraftChange({ body: next });
    setSuggestion(null);
  };

  const generatePdf = () => {
    if (!body.trim()) return showToast(t.workspace.pdfEmpty);
    const ok = printLetter({ lang, title, salutation, body });
    showToast(ok ? t.workspace.pdfHint : t.workspace.popupBlocked);
  };

  const tools: Array<{ mode: Mode; label: string }> = [
    { mode: "improve", label: t.workspace.improve },
    { mode: "shorten", label: t.workspace.shorten },
    { mode: "translate", label: t.workspace.translate },
  ];

  return (
    <section className="glass flex h-full min-w-0 flex-1 flex-col px-[37px] pb-[30px] pt-[31px]">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex shrink-0 items-center gap-2">
          {tools.map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              disabled={busy !== null}
              onClick={() => runTool(mode)}
              className="soft-tag h-8 whitespace-nowrap rounded-full px-[14px] text-[13px] font-medium transition-colors hover:bg-violet/15 disabled:opacity-60"
            >
              {busy === mode ? t.workspace.toolWorking : label}
            </button>
          ))}
        </div>
        <span className="ml-3 flex min-w-0 items-center gap-[7px] whitespace-nowrap text-[12.5px] text-muted" aria-live="polite">
          <span className={`h-[6px] w-[6px] shrink-0 rounded-full ${minutes === null ? "bg-neutral-line" : "bg-[#22c55e]"}`} />
          <span className="truncate">{savedLabel}</span>
        </span>
      </div>

      {/* Suggestion panel (Improve / Shorten / Translate). Nothing changes until "Use this". */}
      <AnimatePresence initial={false}>
        {suggestion && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="thin-scroll mt-4 max-h-[210px] overflow-y-auto rounded-[18px] bg-white/75 p-4 text-[13.5px] leading-[21px] text-ink">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-violet-dark">
                  {suggestion.mode === "translate" ? t.workspace.translation : t.workspace.suggestion}
                </span>
                <button
                  type="button"
                  onClick={() => setSuggestion(null)}
                  aria-label={t.workspace.dismiss}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-white hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              {suggestion.feedback && (
                <p className="mb-2 text-muted">
                  <span className="font-medium text-ink">{t.workspace.feedback}: </span>
                  {suggestion.feedback}
                </p>
              )}
              <ul className="space-y-2">
                {suggestion.alternatives.map((alt, i) => (
                  <li key={i} className="rounded-2xl bg-white/80 p-3">
                    <p className="whitespace-pre-wrap">{alt}</p>
                    <button
                      type="button"
                      onClick={() => accept(alt)}
                      className="btn-primary mt-2 h-8 rounded-full px-4 text-[12.5px]"
                    >
                      {suggestion.wholeBody ? t.workspace.replaceAll : t.workspace.useThis}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title */}
      <textarea
        ref={titleRef}
        rows={1}
        value={title}
        onChange={(e) => onDraftChange({ title: e.target.value.replace(/\n/g, " ") })}
        aria-label={t.workspace.defaultTitle(name)}
        className="mt-[19px] block w-full resize-none overflow-hidden bg-transparent font-display text-[30px] font-semibold leading-[36px] tracking-[-0.02em] text-ink outline-none"
      />

      {/* Salutation + body */}
      <input
        value={salutation}
        onChange={(e) => onDraftChange({ salutation: e.target.value })}
        aria-label={t.workspace.salutation}
        className="mt-[14px] w-full bg-transparent text-[16px] font-medium leading-[24px] text-ink outline-none"
      />
      <div className="relative mt-[10px] min-h-0 flex-1">
        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => onDraftChange({ body: e.target.value })}
          placeholder={t.workspace.bodyPlaceholder}
          aria-label={t.workspace.docs["motivation letter"]}
          className="thin-scroll h-full w-full resize-none bg-transparent text-[16px] leading-[27px] text-ink/85 outline-none placeholder:text-muted/60"
        />
        {!body && (
          <button
            type="button"
            onClick={() => onDraftChange({ body: t.workspace.exampleBody(name) })}
            className="absolute bottom-1 left-0 text-[13px] font-medium text-violet-dark underline-offset-2 hover:underline"
          >
            {t.workspace.insertExample}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[13px] text-muted">{t.workspace.words(countWords(body))}</span>
        <button type="button" onClick={generatePdf} className="btn-primary h-[42px] rounded-full px-5">
          {t.workspace.generatePdf}
        </button>
      </div>
    </section>
  );
}

