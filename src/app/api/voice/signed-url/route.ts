import { NextResponse } from "next/server";

/**
 * Signed URL for a PRIVATE ElevenLabs agent. ELEVENLABS_API_KEY stays on the server and never reaches the client.
 * Without the key this returns 501 and the client connects to the public agent by its id instead.
 */
export async function GET() {
  const key = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  if (!key || !agentId) return NextResponse.json({ error: "not_configured" }, { status: 501 });

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": key }, cache: "no-store", signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) {
      console.warn(`[voice] signed url request failed: ${res.status}`);
      return NextResponse.json({ error: res.status === 429 ? "rate_limited" : "failed" }, { status: 502 });
    }
    const { signed_url } = (await res.json()) as { signed_url?: string };
    if (!signed_url) return NextResponse.json({ error: "failed" }, { status: 502 });
    return NextResponse.json({ signedUrl: signed_url }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.warn("[voice] signed url request failed: network");
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
