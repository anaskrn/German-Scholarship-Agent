"use client";

import { ArrowUp, RotateCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { errorKind, plain, postJson } from "@/lib/client-api";
import { localizedName, scholarshipText } from "@/lib/format";
import { Scholarship } from "@/lib/schema";
import { useAppStore, useT } from "@/lib/store";

interface Tip {
  title: string;
  text: string;
  isQuestion: boolean;
}
interface Message {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
}

interface Props {
  scholarship: Scholarship;
  draft: string;
}

export function Assistant({ scholarship, draft }: Props) {
  const { t, lang } = useT();
  const hydrated = useAppStore((s) => s.hydrated);

  const [tips, setTips] = useState<Tip[] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  /** Template tips built from the dataset: used whenever the AI cannot answer. */
  const fallbackTips = useCallback((): Tip[] => {
    const values = scholarshipText(scholarship, lang).values.slice(0, 2).join(lang === "zh" ? "、" : ", ");
    return [
      { title: t.workspace.tips.openingTitle, text: t.workspace.tips.openingText, isQuestion: false },
      {
        title: t.workspace.tips.linkTitle,
        text: t.workspace.tips.linkText(localizedName(scholarship, lang), values),
        isQuestion: false,
      },
      { title: t.workspace.tips.questionTitle, text: t.workspace.tips.questionText, isQuestion: true },
    ];
  }, [scholarship, lang, t]);

  const loadTips = useCallback(async () => {
    try {
      const res = await postJson("/api/coach/suggestions", {
        lang,
        scholarshipId: scholarship.id,
        draft: draftRef.current.slice(0, 6000),
      });
      if (!res.ok) throw new Error("tips failed");
      const data = (await res.json()) as { suggestions: Tip[] };
      const cleaned = data.suggestions.map((s) => ({ ...s, title: plain(s.title), text: plain(s.text) })).slice(0, 3);
      setTips(cleaned.length ? cleaned : fallbackTips());
    } catch {
      setTips(fallbackTips());
    }
  }, [lang, scholarship.id, fallbackTips]);

  // Tips (and the chat) belong to one scholarship + language: the page re-mounts this component when either changes.
  useEffect(() => {
    if (!hydrated) return;
    void loadTips();
    return () => abortRef.current?.abort();
  }, [hydrated, loadTips]);

  // Follow the conversation, but never scroll past the tip cards when they first load.
  useEffect(() => {
    if (messages.length > 0) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;

    const history: Message[] = [...messages.filter((m) => !m.isError), { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const fail = (kind: "rate_limited" | "no_key" | "failed") =>
      setMessages([...history, { role: "assistant", content: t.workspace.errors[kind], isError: true }]);

    try {
      const res = await postJson(
        "/api/coach",
        {
          lang,
          scholarshipId: scholarship.id,
          draft: draftRef.current.slice(0, 12000),
          messages: history.slice(-12).map(({ role, content }) => ({ role, content })),
        },
        controller.signal,
      );
      if (!res.ok || !res.body) return fail(res.ok ? "failed" : await errorKind(res));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: plain(acc) }]);
      }
      if (!acc.trim()) fail("failed");
    } catch {
      if (!controller.signal.aborted) fail("failed");
    } finally {
      setBusy(false);
    }
  };

  const onTip = (tip: Tip) => {
    if (tip.isQuestion) {
      // A question for the user: show it in the thread and let them answer.
      setMessages((m) => [...m, { role: "assistant", content: tip.text }]);
      inputRef.current?.focus();
    } else {
      void send(`${tip.title}: ${tip.text}`);
    }
  };

  return (
    <aside className="glass flex h-full w-[300px] shrink-0 flex-col rounded-[26px] px-[22px] pb-[14px] pt-5 mobile:w-full mobile:min-h-0 mobile:flex-1 mobile:shrink mobile:px-4">
      <header className="flex items-center gap-[11px]">
        <span
          className="h-[26px] w-[26px] shrink-0 rounded-full"
          style={{ background: "linear-gradient(135deg, var(--orange), var(--pink) 50%, var(--violet-light))" }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-semibold leading-[17px] text-ink">{t.workspace.assistantTitle}</h2>
          <p className="text-[11px] leading-[15px] text-muted">{t.workspace.assistantSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setTips(null);
            void loadTips();
          }}
          aria-label={t.workspace.refreshTips}
          title={t.workspace.refreshTips}
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-white/70 hover:text-ink"
        >
          <RotateCw className={`h-3.5 w-3.5 ${tips === null ? "animate-spin" : ""}`} aria-hidden />
        </button>
      </header>

      <div ref={scrollRef} className="thin-scroll -mr-2 mt-[14px] flex min-h-0 flex-1 flex-col gap-[14px] overflow-y-auto pr-2">
        {tips === null ? (
          <p className="px-1 text-[12.5px] text-muted">{t.workspace.loadingCards}</p>
        ) : (
          tips.map((tip) => (
            <button
              key={tip.title}
              type="button"
              onClick={() => onTip(tip)}
              disabled={busy}
              className="rounded-[18px] bg-white/75 px-[17px] py-4 text-left transition-colors hover:bg-white disabled:opacity-70"
            >
              <h3 className={`text-[13px] font-semibold leading-[18px] ${tip.isQuestion ? "text-violet-dark" : "text-ink"}`}>
                {tip.title}
              </h3>
              <p className="mt-[6px] text-[12.5px] leading-[20px] text-muted">{tip.text}</p>
            </button>
          ))
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`whitespace-pre-wrap rounded-[18px] px-[14px] py-[10px] text-[13px] leading-[20px] ${
              m.role === "user"
                ? "ml-8 rounded-br-md bg-ink text-white"
                : m.isError
                  ? "mr-4 rounded-bl-md bg-warning-bg text-warning-text"
                  : "mr-4 rounded-bl-md bg-white/80 text-ink"
            }`}
          >
            {m.content || <span className="text-muted">…</span>}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="mt-3 flex h-[52px] shrink-0 items-center rounded-full bg-white/75 pl-[17px] pr-[10px] focus-within:bg-white"
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.workspace.askPlaceholder}
          aria-label={t.workspace.askPlaceholder}
          maxLength={2000}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-muted mobile:text-[16px]"
        />
        <button
          type="submit"
          disabled={!input.trim() || busy}
          aria-label={t.workspace.send}
          className="btn-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        >
          <ArrowUp className="h-4 w-4" aria-hidden />
        </button>
      </form>
      <p className="mt-2 text-center text-[10.5px] leading-[14px] text-muted/80">{t.workspace.aiNote}</p>
    </aside>
  );
}
