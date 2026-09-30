"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Scholarship } from "@/lib/schema";
import { useT } from "@/lib/store";
import { useIsMobile } from "@/lib/useMobile";
import { useInterview } from "@/lib/useInterview";
import { voiceConfigured } from "@/lib/voice";
import { ConsentDialog } from "./ConsentDialog";
import { Controls } from "./Controls";
import { FeedbackCard } from "./FeedbackCard";
import { HUD_SIZE, VoiceHud } from "./VoiceHud";
import { TranscriptCard } from "./TranscriptCard";

const clockOf = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

/** Interview practice (step 4, BETA): Figma node 56:2. */
export function PracticeScreen({ scholarship }: { scholarship: Scholarship }) {
  const router = useRouter();
  const { t, lang } = useT();
  const isMobile = useIsMobile();
  const iv = useInterview({ lang, scholarship, t });
  const p = t.practice;

  const backToWorkspace = () => router.push(`/workspace/${scholarship.id}`);

  // The answer belongs to the question it follows.
  const answer = useMemo(() => {
    if (!iv.currentQuestion) return undefined;
    const after = iv.turns.slice(iv.turns.findIndex((x) => x.id === iv.currentQuestion!.id) + 1);
    return [...after].reverse().find((x) => x.role === "you");
  }, [iv.turns, iv.currentQuestion]);

  const [stateTitle, stateHint] = p.states[iv.hud];
  const live = iv.phase === "live";
  const ended = iv.phase === "ended";
  const notice = iv.issue ? p.issues[iv.issue] : iv.feedbackPaused ? p.feedbackPaused : null;

  const onMic = () => {
    if (!live) return;
    if (iv.textMode) document.getElementById("answer-input")?.focus();
    else iv.setMuted(!iv.muted);
  };

  const title = (
    <div className="flex items-center justify-center gap-3">
      <h1 className="font-display text-[36px] font-semibold leading-[44px] tracking-[-0.025em] text-ink mobile:text-[28px] mobile:leading-[36px]">
        {p.title}
      </h1>
      <span className="rounded-[11px] border-[1.2px] border-violet bg-violet/10 px-[10px] py-1 text-[11px] font-semibold tracking-[0.12em] text-violet-dark">
        {t.nav.beta}
      </span>
    </div>
  );
  const subline = <p className="text-center text-[13.5px] text-muted">{p.experimental}</p>;
  const noticeEl = notice && (
    <p
      role="status"
      className="mx-auto max-w-[620px] rounded-full bg-white/70 px-4 py-1.5 text-center text-[12.5px] font-medium text-violet-dark"
    >
      {notice}
    </p>
  );
  const endButton = live && (
    <button
      type="button"
      onClick={iv.endSession}
      className="btn-light h-9 rounded-full border border-white/95 px-4 text-[13px]"
    >
      {p.end}
    </button>
  );

  const hud = (
    <VoiceHud
      state={iv.hud}
      progress={iv.progress}
      title={stateTitle}
      hint={stateHint}
      getFrequencyData={iv.getFrequencyData}
    />
  );
  const transcript = (
    <TranscriptCard
      t={t}
      foundationName={scholarship.name}
      live={live}
      textMode={iv.textMode}
      busy={iv.busy}
      clock={clockOf(iv.seconds)}
      questionNumber={iv.asked}
      previousQuestion={iv.previousQuestion}
      current={iv.currentQuestion}
      answer={answer}
      listening={iv.hud === "listening"}
      ended={ended}
      onSubmit={iv.submitAnswer}
    />
  );
  const feedback = <FeedbackCard t={t} metrics={iv.metrics} tip={iv.tip} wpm={iv.wpm} questionNumber={iv.asked} />;
  const controls = (
    <Controls
      t={t}
      live={live}
      ended={ended}
      textMode={iv.textMode}
      listening={iv.hud === "listening"}
      muted={iv.muted}
      onRepeat={iv.repeat}
      onSkip={iv.skip}
      onMic={onMic}
      onBack={backToWorkspace}
      onAgain={iv.restart}
    />
  );

  return (
    <>
      {isMobile ? (
        <div className="flex flex-col items-center gap-4 pb-6">
          <div className="flex flex-col gap-1">
            {title}
            {subline}
          </div>
          {noticeEl}
          <div className="relative h-[340px] w-[340px] shrink-0">
            <div
              className="absolute left-0 top-0 origin-top-left"
              style={{ transform: "scale(0.68)", width: HUD_SIZE, height: HUD_SIZE }}
            >
              {hud}
            </div>
          </div>
          {controls}
          {endButton}
          <div className="flex w-full flex-col gap-4">
            {transcript}
            {feedback}
          </div>
        </div>
      ) : (
        <div className="relative h-full w-full">
          <div className="absolute left-0 right-0 top-2 flex flex-col items-center gap-2">
            {title}
            {subline}
            {noticeEl}
          </div>
          <div className="absolute right-0 top-2">{endButton}</div>
          <div className="absolute" style={{ left: 350, top: 144 }}>
            {hud}
          </div>
          <div className="absolute left-0 top-[174px]">{transcript}</div>
          <div className="absolute left-[920px] top-[174px]">{feedback}</div>
          <div className="absolute left-0 right-0 flex justify-center" style={{ top: 694 }}>
            {controls}
          </div>
        </div>
      )}

      <ConsentDialog
        t={t}
        open={iv.phase === "consent"}
        voiceAvailable={voiceConfigured}
        onVoice={() => void iv.begin("voice")}
        onText={() => void iv.begin("text")}
        onCancel={backToWorkspace}
      />
    </>
  );
}
