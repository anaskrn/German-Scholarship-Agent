import { NextResponse } from "next/server";
import { explainMatchesWithAI } from "@/lib/ai";
import { aiFailure, parseBody } from "@/lib/api";
import { ExplainRequestSchema } from "@/lib/schema";

export async function POST(req: Request) {
  const body = await parseBody(req, ExplainRequestSchema);
  if ("error" in body) return body.error;

  try {
    const explanations = await explainMatchesWithAI({
      lang: body.data.lang,
      profile: body.data.profile,
      matches: body.data.matches,
    });
    return NextResponse.json({ explanations });
  } catch (err) {
    return aiFailure("explain", err);
  }
}
