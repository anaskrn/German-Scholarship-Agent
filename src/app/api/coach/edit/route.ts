import { NextResponse } from "next/server";
import { editWithAI } from "@/lib/ai";
import { aiFailure, parseBody } from "@/lib/api";
import { getScholarshipById } from "@/lib/matching";
import { EditRequestSchema } from "@/lib/schema";

/** Improve / Shorten / Translate for a passage. Returns suggestions only; the client applies them on accept. */
export async function POST(req: Request) {
  const body = await parseBody(req, EditRequestSchema);
  if ("error" in body) return body.error;

  const scholarship = getScholarshipById(body.data.scholarshipId);
  if (!scholarship) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  try {
    const result = await editWithAI({
      lang: body.data.lang,
      scholarship,
      mode: body.data.mode,
      text: body.data.text,
    });
    return NextResponse.json(result);
  } catch (err) {
    return aiFailure("edit", err);
  }
}
