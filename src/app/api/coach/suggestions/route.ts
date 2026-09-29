import { NextResponse } from "next/server";
import { suggestWithAI } from "@/lib/ai";
import { aiFailure, parseBody } from "@/lib/api";
import { getScholarshipById } from "@/lib/matching";
import { SuggestionsRequestSchema } from "@/lib/schema";

export async function POST(req: Request) {
  const body = await parseBody(req, SuggestionsRequestSchema);
  if ("error" in body) return body.error;

  const scholarship = getScholarshipById(body.data.scholarshipId);
  if (!scholarship) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  try {
    const suggestions = await suggestWithAI({ lang: body.data.lang, scholarship, draft: body.data.draft });
    return NextResponse.json({ suggestions });
  } catch (err) {
    return aiFailure("suggestions", err);
  }
}
