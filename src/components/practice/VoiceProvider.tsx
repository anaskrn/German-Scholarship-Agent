"use client";

import { ConversationProvider } from "@elevenlabs/react";

/** The ElevenLabs SDK's hooks need this provider around the practice screen. */
export function VoiceProvider({ children }: { children: React.ReactNode }) {
  return <ConversationProvider>{children}</ConversationProvider>;
}
