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
  /** what the agent says first, in the selected language */
  opening: string;
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

type SessionPart = { signedUrl: string } | { agentId: string; connectionType: "webrtc" };

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

  // Per session we send the selected language and first message. If the agent's dashboard does not allow these
  // overrides (Security tab), the first attempt fails and we connect again with the agent's own settings.
  const heardAgentRef = useRef(false);
  const overridesRef = useRef(false);
  const pendingRef = useRef<{ session: SessionPart; vars: Record<string, string> } | null>(null);
  const ignoreUntilRef = useRef(0);
  const failRef = useRef<(message: string, disconnected: boolean) => void>(() => {});

  const conversation = useConversation({
    micMuted: muted,
    onConnect: () => update("listening"),
    onMessage: ({ role, message }) => {
      if (!message?.trim()) return;
      heardAgentRef.current = true;
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
      if (Date.now() < ignoreUntilRef.current) return; // the attempt we ended ourselves
      if (details.reason === "error") failRef.current(details.message, true);
      else update("ended");
    },
    onError: (message) => {
      console.warn("[voice] error:", String(message).slice(0, 120));
      failRef.current(String(message), false);
    },
  });
  const conv = useLatest(conversation);

  useEffect(() => {
    failRef.current = (message, disconnected) => {
      if (Date.now() < ignoreUntilRef.current) return; // the failed attempt closing down
      // The server accepts the connection and only then rejects language / first-message overrides that the
      // agent's dashboard does not allow. Until the agent has said something, try again with its own settings.
      if (!heardAgentRef.current && overridesRef.current && pendingRef.current) {
        const { session, vars } = pendingRef.current;
        overridesRef.current = false;
        ignoreUntilRef.current = Date.now() + 1200;
        update("connecting");
        try {
          conv.current.endSession();
        } catch {
          // already closed
        }
        setTimeout(() => {
          try {
            conv.current.startSession({ ...session, dynamicVariables: vars });
          } catch {
            update("ended");
            onIssue("connection_failed");
          }
        }, 600);
        return;
      }
      if (disconnected) update("ended");
      onIssue(issueFromMessage(message));
    };
  });

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
        const session: SessionPart = signedUrl ? { signedUrl } : { agentId: AGENT_ID, connectionType: "webrtc" };
        const vars = {
          foundation_name: ctx.foundationName,
          foundation_values: ctx.values.join(", "),
          selection_process: ctx.selectionProcess,
          language: ctx.lang === "de" ? "German" : ctx.lang === "zh" ? "Simplified Chinese" : "English",
        };
        heardAgentRef.current = false;
        overridesRef.current = true;
        ignoreUntilRef.current = 0;
        pendingRef.current = { session, vars };
        conv.current.startSession({
          ...session,
          dynamicVariables: vars,
          // speak (and listen in) the language selected in the app, starting with a greeting in that language
          overrides: { agent: { language: ctx.lang, firstMessage: ctx.opening } },
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
      void textRef.current.start({ lang: "en", opening: "", foundationName: "", values: [], selectionProcess: "" });
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
      void text.start({ lang: "en", opening: "", foundationName: "", values: [], selectionProcess: "" });
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
