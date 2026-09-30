import { NextResponse } from "next/server";
import { extractProfileWithAI } from "@/lib/ai";
import { aiFailure, parseBody } from "@/lib/api";
import { verifyProfile } from "@/lib/profile";
import { ProfileRequestSchema } from "@/lib/schema";

export async function POST(req: Request) {
  const body = await parseBody(req, ProfileRequestSchema);
  if ("error" in body) return body.error;

  try {
    // Every fact must be traceable to the user's own text, otherwise it is dropped (no guessing).
    const profile = verifyProfile(await extractProfileWithAI(body.data.text), body.data.text);
    return NextResponse.json({ profile });
  } catch (err) {
    return aiFailure("profile", err);
  }
}
