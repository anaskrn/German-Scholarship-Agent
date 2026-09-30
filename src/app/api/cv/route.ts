import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { cleanExtractedText } from "@/lib/text";

const MAX_BYTES = 4 * 1024 * 1024; // stays under the 4.5 MB request limit of serverless hosting
const MAX_CHARS = 12_000; // plenty for a CV; keeps the AI prompt small

/**
 * Reads the text out of an uploaded PDF CV. The file is processed in memory and never stored or logged.
 * Scanned PDFs (images only) contain no text: those return "no_text".
 */
export async function POST(req: Request) {
  let file: File | null = null;
  try {
    const form = await req.formData();
    const entry = form.get("file");
    if (entry instanceof File) file = entry;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  // Check the real file signature, not just the name or the browser-reported type.
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    return NextResponse.json({ error: "not_pdf" }, { status: 415 });
  }

  try {
    const pdf = await getDocumentProxy(bytes);
    const { text, totalPages } = await extractText(pdf, { mergePages: true });
    const clean = cleanExtractedText(text);
    if (clean.length < 40) return NextResponse.json({ error: "no_text" }, { status: 422 });
    return NextResponse.json({ text: clean.slice(0, MAX_CHARS), pages: totalPages, truncated: clean.length > MAX_CHARS });
  } catch {
    // Corrupted or password-protected PDF
    return NextResponse.json({ error: "unreadable" }, { status: 422 });
  }
}
