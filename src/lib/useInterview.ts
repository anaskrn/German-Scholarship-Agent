"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { errorKind, postJson } from "./client-api";
import { Translations } from "./i18n";
import {
  averageMetrics,
  interviewQuestions,
  isQuestion,
  isSubstantiveAnswer,
  Metrics,
  parseFeedback,
  TOTAL_QUESTIONS,
  wordsPerMinute,
} from "./practice";
import { Lang, Scholarship } from "./schema";
import { useVoice, VoiceIssue, voiceConfigured, VoiceTurn } from "./voice";

export interface InterviewTurn {
  id: number;
  role: "interviewer" | "you";
  text: string;
}

export type HudState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "typing" | "ended";
type Phase = "consent" | "live" | "ended";

/**
 * One interview practice session: consent, live voice (or typing), transcript, per-answer AI feedback.
 * Voice providers live in voice.ts; everything here works the same for voice and for the text-only fallback.
 */
export function useInterview({ lang, scholarship, t }: { lang: Lang; scholarship: Scholarship; t: Translations }) {
  const [phase, setPhase] = useState<Phase>("consent");
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [asked, setAsked] = useState(0);
  const [issue, setIssue] = useState<VoiceIssue | null>(null);
  const [metricsList, setMetricsList] = useState<Metrics[]>([]);
  const [tip, setTip] = useState<string | null>(null);
  const [wpm, setWpm] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedbackPaused, setFeedbackPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const idRef = useRef(0);
  const askedRef = useRef(0);
  const lastQuestionRef = useRef("");
  const answersRef = useRef<Array<{ question: string; answer: string }>>([]);
  const listenStartRef = useRef(0);
  const textStartedRef = useRef(false);
  const pausedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const questions = useMemo(
    () => interviewQuestions(lang, scholarship.name, scholarship.values),
    [lang, scholarship.name, scholarship.values],
  );

  const addTurn = useCallback((role: InterviewTurn["role"], text: string) => {
    setTurns((prev) => [...prev, { id: ++idRef.current, role, text }]);
  }, []);

  /** AI-estimated feedback for one answer. On any failure the last values stay and the UI keeps working. */
  const rate = useCallback(
    async (question: string, answer: string, secs: number) => {
      const pace = wordsPerMinute(answer, secs);
      if (pace) setWpm(pace);
      setBusy(true);
      try {
        const res = await postJson("/api/feedback", {
          kind: "answer",
          lang,
          scholarshipId: scholarship.id,
          question,
          answer,
        });
        if (!res.ok) throw new Error(await errorKind(res));
        const f = parseFeedback(await res.json());
        if (!f) throw new Error("invalid");
        setMetricsList((prev) => [
          ...prev,
          { clarity: f.clarity, structure: f.structure, authenticity: f.authenticity },
        ]);
        setTip(f.tip);
        setFeedbackPaused(false);
      } catch {
        setFeedbackPaused(true);
        clearTimeout(pausedTimer.current);
        pausedTimer.current = setTimeout(() => setFeedbackPaused(false), 6000);
      } finally {
        setBusy(false);
      }
    },
    [lang, scholarship.id],
  );

  const handleTurn = useCallback(
    (turn: VoiceTurn) => {
      // Silence comes back as "..." from speech-to-text: neither shown nor rated.
      if (turn.role === "you" && !isSubstantiveAnswer(turn.text)) return;
      addTurn(turn.role, turn.text);
      if (turn.role === "interviewer") {
        // A question counts as the next one only after the student answered the previous one, so
        // clarifications such as "Are you still there?" do not advance "Question N of 5".
        if (
          isQuestion(turn.text) &&
          askedRef.current < TOTAL_QUESTIONS &&
          answersRef.current.length >= askedRef.current
        ) {
          askedRef.current += 1;
          setAsked(askedRef.current);
          lastQuestionRef.current = turn.text;
        }
        return;
      }
      answersRef.current.push({ question: lastQuestionRef.current, answer: turn.text });
      const secs = listenStartRef.current ? Math.max(0, (Date.now() - listenStartRef.current) / 1000 - 1) : 0;
      void rate(lastQuestionRef.current, turn.text, secs);
    },
    [addTurn, rate],
  );

  const voice = useVoice({ onTurn: handleTurn, onIssue: setIssue });
  const voiceRef = useRef(voice);
  useEffect(() => {
    voiceRef.current = voice;
  });

  // When listening starts, remember the moment (used to estimate speaking pace).
  const prevState = useRef(voice.state);
  useEffect(() => {
    if (voice.state === "listening" && prevState.current !== "listening") listenStartRef.current = Date.now();
    prevState.current = voice.state;
  }, [voice.state]);

  // ---- text-only flow (scripted questions) ----
  const askQuestion = useCallback(
    (index: number) => {
      const q = questions[index];
      addTurn("interviewer", q);
      lastQuestionRef.current = q;
      askedRef.current = index + 1;
      setAsked(index + 1);
    },
    [addTurn, questions],
  );

  const finishText = useCallback(async () => {
    setBusy(true);
    try {
      if (answersRef.current.length > 0) {
        const res = await postJson("/api/feedback", {
          kind: "summary",
          lang,
          scholarshipId: scholarship.id,
          turns: answersRef.current,
        });
        if (res.ok) {
          const s = (await res.json()) as { strength: string; improve: string; tip: string };
          addTurn(
            "interviewer",
            [
              `${t.practice.summaryStrength}: ${s.strength}`,
              `${t.practice.summaryImprove}: ${s.improve}`,
              `${t.practice.summaryTip}: ${s.tip}`,
            ].join("\n"),
          );
        }
      }
    } catch {
      // the session still ends cleanly without a summary
    } finally {
      setBusy(false);
      voiceRef.current.end();
      setPhase("ended");
    }
  }, [addTurn, lang, scholarship.id, t.practice]);

  // Text mode takes over (by choice or as a fallback): ask the next scripted question.
  useEffect(() => {
    if (phase !== "live" || voice.provider !== "text-only" || voice.state !== "listening") return;
    if (textStartedRef.current) return;
    textStartedRef.current = true;
    if (askedRef.current < TOTAL_QUESTIONS) askQuestion(askedRef.current);
    else void finishText();
  }, [phase, voice.provider, voice.state, askQuestion, finishText]);

  const submitAnswer = useCallback(
    (text: string) => {
      const answer = text.trim();
      if (!answer || busy) return;
      addTurn("you", answer);
      answersRef.current.push({ question: lastQuestionRef.current, answer });
      void rate(lastQuestionRef.current, answer, 0);
      if (askedRef.current < TOTAL_QUESTIONS) askQuestion(askedRef.current);
      else void finishText();
    },
    [addTurn, askQuestion, busy, finishText, rate],
  );

  // ---- controls ----
  const begin = useCallback(
    async (mode: "voice" | "text") => {
      setPhase("live");
      setIssue(null);
      const ctx = {
        lang,
        foundationName: scholarship.name,
        values: scholarship.values,
        selectionProcess: scholarship.selectionProcess,
      };
      if (mode === "text") {
        voiceRef.current.switchToText();
        return;
      }
      if (!voiceConfigured) setIssue("unavailable");
      await voiceRef.current.start(ctx);
    },
    [lang, scholarship],
  );

  const endSession = useCallback(() => {
    voiceRef.current.end();
    setPhase("ended");
  }, []);

  const restart = useCallback(() => {
    voiceRef.current.end();
    voiceRef.current.resetProvider();
    clearTimeout(pausedTimer.current);
    askedRef.current = 0;
    answersRef.current = [];
    lastQuestionRef.current = "";
    textStartedRef.current = false;
    setTurns([]);
    setAsked(0);
    setMetricsList([]);
    setTip(null);
    setWpm(null);
    setIssue(null);
    setFeedbackPaused(false);
    setSeconds(0);
    setPhase("consent");
  }, []);

  const repeat = useCallback(() => {
    if (voiceRef.current.provider === "elevenlabs") voiceRef.current.sendText("Please repeat the last question.");
    else if (lastQuestionRef.current) addTurn("interviewer", lastQuestionRef.current);
  }, [addTurn]);

  const skip = useCallback(() => {
    if (voiceRef.current.provider === "elevenlabs") {
      voiceRef.current.sendText("Let's skip this question. Please ask the next one.");
    } else if (askedRef.current < TOTAL_QUESTIONS) askQuestion(askedRef.current);
    else void finishText();
  }, [askQuestion, finishText]);

  // Esc ends the session cleanly.
  useEffect(() => {
    if (phase !== "live") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") endSession();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, endSession]);

  // REC timer
  useEffect(() => {
    if (phase !== "live") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => () => clearTimeout(pausedTimer.current), []);

  const textMode = voice.provider === "text-only";
  const hud: HudState =
    phase === "consent"
      ? "idle"
      : phase === "ended"
        ? "ended"
        : textMode
          ? busy
            ? "thinking"
            : "typing"
          : voice.state === "idle"
            ? "connecting"
            : voice.state === "ended"
              ? "ended"
              : voice.state;

  const lastQuestionTurn = [...turns].reverse().find((x) => x.role === "interviewer");
  const previousQuestion =
    turns.filter((x) => x.role === "interviewer").length > 1
      ? [...turns].filter((x) => x.role === "interviewer").slice(-2)[0]
      : undefined;

  return {
    phase,
    turns,
    asked,
    progress: phase === "ended" ? 1 : Math.min(asked, TOTAL_QUESTIONS) / TOTAL_QUESTIONS,
    issue,
    hud,
    textMode,
    busy,
    seconds,
    metrics: averageMetrics(metricsList),
    tip,
    wpm,
    feedbackPaused,
    currentQuestion: lastQuestionTurn,
    previousQuestion,
    muted: voice.muted,
    setMuted: voice.setMuted,
    getFrequencyData: voice.getFrequencyData,
    begin,
    endSession,
    restart,
    repeat,
    skip,
    submitAnswer,
  };
}
