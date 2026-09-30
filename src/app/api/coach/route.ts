import { NextResponse } from "next/server";
import { streamCoachReply } from "@/lib/ai";
import { aiFailure, parseBody } from "@/lib/api";
import { getScholarshipById } from "@/lib/matching";
import { CoachRequestSchema } from "@/lib/schema";

/** Streams the assistant's reply as plain text. */
export async function POST(req: Request) {
  const body = await parseBody(req, CoachRequestSchema);
  if ("error" in body) return body.error;

  const scholarship = getScholarshipById(body.data.scholarshipId);
  if (!scholarship) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  try {
    const result = streamCoachReply({
      lang: body.data.lang,
      scholarship,
      draft: body.data.draft,
      messages: body.data.messages,
    });
    // Pull the first chunk so provider errors (429, auth) surface as a proper status
    // instead of an empty 200 stream.
    const reader = result.textStream[Symbol.asyncIterator]();
    const first = await reader.next();
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          if (!first.done) controller.enqueue(encoder.encode(first.value));
          for (;;) {
            const next = await reader.next();
            if (next.done) break;
            controller.enqueue(encoder.encode(next.value));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (err) {
    return aiFailure("coach", err);
  }
}
