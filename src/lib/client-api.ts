export type AiErrorKind = "no_key" | "rate_limited" | "failed";

/** Reads the error kind the API routes return ({ error: "rate_limited" | ... }). */
export async function errorKind(res: Response): Promise<AiErrorKind> {
  try {
    const { error } = (await res.json()) as { error?: string };
    if (error === "rate_limited" || error === "no_key") return error;
  } catch {
    // ignore, fall through
  }
  return "failed";
}

export async function postJson(url: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(40_000),
  });
}

/** The models sometimes answer with light markdown; the UI shows plain text. */
export function plain(text: string): string {
  return text
    .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
    .replace(/(^|\s)\*(?!\s)([\s\S]+?)\*(?=\s|[.,;:!?]|$)/g, "$1$2")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/[`*]/g, "");
}

export function countWords(text: string): number {
  // Chinese has no spaces: count each CJK character as one word.
  return text.match(/[㐀-鿿]|[^\s㐀-鿿]+/g)?.length ?? 0;
}
