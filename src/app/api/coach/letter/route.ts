import { NextResponse } from "next/server";
import { generateLetterWithAI } from "@/lib/ai";
import { aiFailure, parseBody } from "@/lib/api";
import { getScholarshipById } from "@/lib/matching";
import { MIN_SOURCE_CHARS } from "@/lib/letter";
import { LetterRequestSchema } from "@/lib/schema";

// Writing and fact-checking a letter takes 20-45 s; the platform default (10 s on a free Vercel plan) is far too short.
// 60 s is allowed on every plan. The generation itself works against a 52 s deadline (see ai.ts).
export const maxDuration = 60;

/** First draft of the motivation letter from the student's CV / description. The client applies it on click. */
export async function POST(req: Request) {
  const body = await parseBody(req, LetterRequestSchema);
  if ("error" in body) return body.error;

  const scholarship = getScholarshipById(body.data.scholarshipId);
  if (!scholarship) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // Too little to work with: an honest answer beats a letter padded with invented detail.
  if (body.data.text.trim().length < MIN_SOURCE_CHARS) {
    return NextResponse.json({ error: "too_little" }, { status: 422 });
  }

  try {
    const result = await generateLetterWithAI({ lang: body.data.lang, scholarship, source: body.data.text });
    return NextResponse.json(result);
  } catch (err) {
    return aiFailure("letter", err);
  }
}
