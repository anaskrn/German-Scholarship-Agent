import { NextResponse } from "next/server";
import { feedbackWithAI, interviewSummaryWithAI } from "@/lib/ai";
import { aiFailure, parseBody } from "@/lib/api";
import { getScholarshipById } from "@/lib/matching";
import { FeedbackRequestSchema } from "@/lib/schema";

/** Interview practice: AI-estimated feedback for one answer, or a short summary of the session. */
export async function POST(req: Request) {
  const body = await parseBody(req, FeedbackRequestSchema);
  if ("error" in body) return body.error;

  const scholarship = getScholarshipById(body.data.scholarshipId);
  if (!scholarship) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  try {
    if (body.data.kind === "answer") {
      const { lang, question, answer } = body.data;
      return NextResponse.json(await feedbackWithAI({ lang, scholarship, question, answer }));
    }
    const { lang, turns } = body.data;
    return NextResponse.json(await interviewSummaryWithAI({ lang, scholarship, turns }));
  } catch (err) {
    return aiFailure("feedback", err);
  }
}
