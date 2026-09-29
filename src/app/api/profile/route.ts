import { NextResponse } from "next/server";
import { extractProfileWithAI } from "@/lib/ai";
import { aiFailure, parseBody } from "@/lib/api";
import { ProfileRequestSchema } from "@/lib/schema";

export async function POST(req: Request) {
  const body = await parseBody(req, ProfileRequestSchema);
  if ("error" in body) return body.error;

  try {
    const profile = await extractProfileWithAI(body.data.text);
    return NextResponse.json({ profile });
  } catch (err) {
    return aiFailure("profile", err);
  }
}
