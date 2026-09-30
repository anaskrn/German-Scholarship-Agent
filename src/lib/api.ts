import { NextResponse } from "next/server";
import { z } from "zod";
import { classifyAiError } from "./ai";

/** Validates a JSON request body. Returns the parsed data or a ready-made 400 response. */
export async function parseBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<{ data: z.infer<T> } | { error: NextResponse }> {
  try {
    const parsed = schema.safeParse(await req.json());
    if (parsed.success) return { data: parsed.data };
  } catch {
    // fall through to 400
  }
  return { error: NextResponse.json({ error: "bad_request" }, { status: 400 }) };
}

/**
 * Turns a provider failure into a small JSON error the UI can explain.
 * Only the error kind is logged, never user text (sensitive data is never logged).
 */
export function aiFailure(route: string, err: unknown): NextResponse {
  const kind = classifyAiError(err);
  const e = err as { name?: string; statusCode?: number; lastError?: { statusCode?: number } };
  console.warn(
    `[${route}] AI call failed: ${kind} (${e?.name}, status ${e?.statusCode ?? e?.lastError?.statusCode ?? "n/a"})`,
  );
  const status = kind === "rate_limited" ? 429 : kind === "no_key" ? 503 : 502;
  return NextResponse.json({ error: kind }, { status });
}
