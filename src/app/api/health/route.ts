import { NextResponse } from "next/server";

/**
 * Which services this deployment is configured for (no secrets, only yes / no).
 * Without the Mistral key the app still opens and falls back to simple texts, so a missing key is easy to overlook.
 */
export async function GET() {
  return NextResponse.json(
    {
      mistral: Boolean(process.env.MISTRAL_API_KEY),
      voiceAgent: Boolean(process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
