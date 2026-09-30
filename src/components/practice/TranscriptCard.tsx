"use client";

import { useState } from "react";
import { Translations } from "@/lib/i18n";
import { InterviewTurn } from "@/lib/useInterview";

interface Props {
  t: Translations;
  foundationName: string;
  live: boolean;
  textMode: boolean;
  busy: boolean;
  /** timer such as "03:12" */
  clock: string;
  /** number of the current question (0 before the first one) */
  questionNumber: number;
  previousQuestion?: InterviewTurn;
  current?: InterviewTurn;
  answer?: InterviewTurn;
  /** the student is being listened to right now (shows the blinking cursor) */
  listening: boolean;
  ended: boolean;
  onSubmit: (text: string) => void;
}

const bubbleLabel = "text-[10px] font-semibold uppercase tracking-[0.1em]";

export function TranscriptCard({
  t,
  foundationName,
  live,
  textMode,
  busy,
  clock,
  questionNumber,
  previousQuestion,
  current,
  answer,
  listening,
  ended,
  onSubmit,
}: Props) {
  const p = t.practice;
  const [draft, setDraft] = useState("");
  const send = () => {
    if (!draft.trim() || busy) return;
    onSubmit(draft);
    setDraft("");
  };

  return (
    <section
      className="glass flex h-[440px] w-[280px] flex-col gap-[14px] p-6 mobile:h-auto mobile:min-h-[360px] mobile:w-full"
      style={{ background: "rgba(255,255,255,0.56)" }}
      aria-label={p.transcript}
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[19px] font-semibold tracking-[-0.01em] text-ink">{p.transcript}</h2>
        {live && (
          <span
            className={`flex items-center gap-[5px] rounded-[10px] px-[9px] py-1 text-[11px] font-semibold ${
              textMode ? "bg-violet/10 text-violet-dark" : "bg-pink/[0.16] text-[#be185d]"
            }`}
          >
            {!textMode && <span className="h-[6px] w-[6px] rounded-full bg-[#e11d74]" aria-hidden />}
            {!textMode && `${p.rec} `}
            {clock}
          </span>
        )}
      </div>

      <p className="text-[12.5px] font-medium text-violet-dark">{p.foundationLine(foundationName)}</p>

      <div className="thin-scroll flex min-h-0 flex-1 flex-col gap-[14px] overflow-y-auto" aria-live="polite">
        {previousQuestion && !ended && (
          <p className="text-[12px] text-muted/65">
            {p.questionLine(Math.max(1, questionNumber - 1), previousQuestion.text)}
          </p>
        )}

        {current && (
          <div className="rounded-[18px] border border-white/95 bg-white/70 px-4 py-[14px]">
            <p className={`${bubbleLabel} text-violet`}>
              {p.interviewer}
              {!ended && questionNumber > 0 ? `  ·  Q${questionNumber}` : ""}
            </p>
            <p className="mt-[6px] whitespace-pre-line text-[14px] font-medium leading-[21px] text-ink">
              {current.text}
            </p>
          </div>
        )}

        {live && !ended && textMode && current ? (
          <div className="rounded-[18px] bg-violet/[0.08] px-4 py-3">
            <div className="flex items-center justify-between">
              <p className={`${bubbleLabel} text-muted`}>{p.you}</p>
              <button
                type="button"
                onClick={send}
                disabled={!draft.trim() || busy}
                className="btn-primary h-7 rounded-full px-3 text-[12px]"
              >
                {p.send}
              </button>
            </div>
            <textarea
              id="answer-input"
              value={draft}
              disabled={busy}
              rows={3}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={p.answerPlaceholder}
              aria-label={p.answerPlaceholder}
              className="thin-scroll mt-[6px] block w-full resize-none bg-transparent text-[14px] leading-[21px] text-ink/90 outline-none placeholder:text-muted/60"
            />
          </div>
        ) : (
          (answer || (listening && current)) && (
            <div className="rounded-[18px] bg-violet/[0.08] px-4 py-[14px]">
              <p className={`${bubbleLabel} text-muted`}>{p.you}</p>
              <p className="mt-[6px] text-[14px] leading-[21px] text-ink/90">
                {answer?.text}
                {listening && (
                  <span className="ml-0.5 inline-block animate-pulse text-violet" aria-hidden>
                    ▍
                  </span>
                )}
              </p>
            </div>
          )
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#22c55e]" aria-hidden />
        <p className="text-[11.5px] text-muted">{textMode ? p.textNote : p.transcribedNote}</p>
      </div>
    </section>
  );
}
