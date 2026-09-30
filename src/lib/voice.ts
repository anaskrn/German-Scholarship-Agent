"use client";

import { useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Lang } from "./schema";

/*
  Provider-agnostic voice layer for the interview practice.
  The UI only talks to `VoiceControls`. Each provider implements it as a small hook:
  - "elevenlabs": ElevenLabs Agents (official React SDK), live voice
  - "text-only": no audio, the student types (fallback when the microphone, the free minutes or the connection fail)
  Adding another provider (e.g. Mistral Voxtral STT + TTS, or the browser Web Speech API) means writing one more
  `useXyzVoice` hook and adding it to `useVoice` below.
*/

type VoiceState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "ended";
type VoiceProvider = "elevenlabs" | "text-only";
export type VoiceIssue = "mic_denied" | "unavailable" | "connection_failed" | "quota";

export interface VoiceTurn {
  role: "interviewer" | "you";
  text: string;
}

interface VoiceContext {
  lang: Lang;
  foundationName: string;
  values: string[];
  selectionProcess: string;
}

export interface VoiceHandlers {
  onTurn: (turn: VoiceTurn) => void;
  onIssue: (issue: VoiceIssue) => void;
}

export interface VoiceControls {
  provider: VoiceProvider;
  /** continue without audio (the student chose text only) */
  switchToText: () => void;
  /** go back to the default provider (a new session after a fallback) */
  resetProvider: () => void;
  state: VoiceState;
  muted: boolean;
  /** false: the provider could not start (the issue was reported and the text fallback is active) */
  start: (ctx: VoiceContext) => Promise<boolean>;
  end: () => void;
  setMuted: (muted: boolean) => void;
  /** a typed message to the agent (e.g. "please repeat the question") */
  sendText: (text: string) => void;
  /** current audio spectrum (input while listening, output while speaking); null without audio */
  getFrequencyData: () => Uint8Array | null;
}

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?? "";

/** True when an ElevenLabs agent is configured for this deployment. */
export const voiceConfigured = Boolean(AGENT_ID);

/** Always points at the latest value without re-rendering (assigned in an effect, never during render). */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

function issueFromMessage(message: string): VoiceIssue {
  return /quota|limit|exceed|insufficient|credit|subscription|minutes/i.test(message) ? "quota" : "connection_failed";
}

function useElevenLabsVoice(onTurn: VoiceHandlers["onTurn"], onIssue: (issue: VoiceIssue) => void): VoiceControls {
  const [state, setState] = useState<VoiceState>("idle");
  const [muted, setMutedState] = useState(false);
  const stateRef = useRef<VoiceState>("idle");
  const update = useCallback((next: VoiceState | ((prev: VoiceState) => VoiceState)) => {
    stateRef.current = typeof next === "function" ? next(stateRef.current) : next;
    setState(stateRef.current);
  }, []);

  const conversation = useConversation({
    micMuted: muted,
    onConnect: () => update("listening"),
    onMessage: ({ role, message }) => {
      if (!message?.trim()) return;
      if (role === "user") update("thinking");
      onTurn({ role: role === "agent" ? "interviewer" : "you", text: message.trim() });
    },
    onModeChange: ({ mode }) =>
      update((prev) => {
        if (prev === "idle" || prev === "connecting" || prev === "ended") return prev;
        if (mode === "speaking") return "speaking";
        // the agent stopped talking; "thinking" lasts until it starts answering
        return prev === "thinking" ? prev : "listening";
      }),
    onDisconnect: (details) => {
      update("ended");
      if (details.reason === "error") onIssue(issueFromMessage(details.message));
    },
    onError: (message) => {
      console.warn("[voice] error:", String(message).slice(0, 120));
      onIssue(issueFromMessage(String(message)));
    },
  });
  const conv = useLatest(conversation);

  const start = useCallback(
    async (ctx: VoiceContext) => {
      if (!AGENT_ID) {
        onIssue("unavailable");
        return false;
      }
      update("connecting");
      // Ask for the microphone first so a denial gives a clear message instead of a generic connection error.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        update("idle");
        onIssue("mic_denied");
        return false;
      }
      try {
        // Private agent: the server signs a short-lived URL (the API key never reaches the browser).
        // No key configured ({ signedUrl: null }): connect to the public agent by its id.
        const res = await fetch("/api/voice/signed-url", { cache: "no-store" });
        if (!res.ok) throw new Error("no session");
        const { signedUrl } = (await res.json()) as { signedUrl: string | null };
        const session = signedUrl ? { signedUrl } : { agentId: AGENT_ID, connectionType: "webrtc" as const };
        conv.current.startSession({
          ...session,
          dynamicVariables: {
            foundation_name: ctx.foundationName,
            foundation_values: ctx.values.join(", "),
            selection_process: ctx.selectionProcess,
            language: ctx.lang === "de" ? "German" : ctx.lang === "zh" ? "Simplified Chinese" : "English",
          },
        });
        return true;
      } catch {
        update("idle");
        onIssue("connection_failed");
        return false;
      }
    },
    [conv, onIssue, update],
  );

  const end = useCallback(() => {
    if (stateRef.current !== "idle" && stateRef.current !== "ended") {
      try {
        conv.current.endSession();
      } catch {
        // already closed
      }
    }
    update("ended");
  }, [conv, update]);

  return {
    provider: "elevenlabs",
    switchToText: () => {},
    resetProvider: () => {},
    state,
    muted,
    start,
    end,
    setMuted: setMutedState,
    sendText: (text) => {
      try {
        conv.current.sendUserMessage(text);
      } catch {
        // not connected (anymore)
      }
    },
    getFrequencyData: () => {
      if (stateRef.current !== "listening" && stateRef.current !== "speaking") return null;
      try {
        return stateRef.current === "speaking"
          ? conv.current.getOutputByteFrequencyData()
          : conv.current.getInputByteFrequencyData();
      } catch {
        return null;
      }
    },
  };
}

function useTextVoice(): VoiceControls {
  const [state, setState] = useState<VoiceState>("idle");
  return {
    provider: "text-only",
    switchToText: () => {},
    resetProvider: () => {},
    state,
    muted: false,
    start: async () => {
      setState("listening");
      return true;
    },
    end: () => setState("ended"),
    setMuted: () => {},
    sendText: () => {},
    getFrequencyData: () => null,
  };
}

/** The voice session the UI uses: live ElevenLabs voice, falling back to typing whenever it cannot run. */
export function useVoice(handlers: VoiceHandlers): VoiceControls {
  const [provider, setProvider] = useState<VoiceProvider>(voiceConfigured ? "elevenlabs" : "text-only");
  const handlersRef = useLatest(handlers);
  const text = useTextVoice();
  const textRef = useLatest(text);

  const onIssue = useCallback(
    (issue: VoiceIssue) => {
      setProvider("text-only");
      void textRef.current.start({ lang: "en", foundationName: "", values: [], selectionProcess: "" });
      handlersRef.current.onIssue(issue);
    },
    [handlersRef, textRef],
  );
  const onTurn = useCallback((turn: VoiceTurn) => handlersRef.current.onTurn(turn), [handlersRef]);
  const eleven = useElevenLabsVoice(onTurn, onIssue);

  // Leaving the page (or closing the tab) ends the live session.
  const endRef = useLatest(eleven.end);
  useEffect(() => {
    const stop = () => endRef.current();
    window.addEventListener("pagehide", stop);
    return () => {
      window.removeEventListener("pagehide", stop);
      stop();
    };
  }, [endRef]);

  const active = provider === "elevenlabs" ? eleven : text;
  return {
    ...active,
    provider,
    switchToText: () => {
      setProvider("text-only");
      void text.start({ lang: "en", foundationName: "", values: [], selectionProcess: "" });
    },
    resetProvider: () => setProvider(voiceConfigured ? "elevenlabs" : "text-only"),
    start: async (ctx) => {
      if (provider === "text-only") return text.start(ctx);
      return eleven.start(ctx);
    },
    end: () => {
      eleven.end();
      text.end();
    },
  };
}
