import { docKey } from "./format";
import type { DocStatus } from "./store";

/** The only document written inside ScholarPath. Everything else is prepared by the student. */
export const LETTER_KEY = "motivation letter";

/** Documents the student prepares on their own (from the scholarship's `documents` field). */
export function additionalDocuments(documents: string[]): string[] {
  return documents.filter((d) => docKey(d) !== LETTER_KEY);
}

/** A document counts as ready when its checkbox is ticked (stored as the "complete" status). */
export function isTicked(statuses: Record<string, DocStatus> | undefined, key: string): boolean {
  return statuses?.[key] === "complete";
}

export function toggledStatus(current: DocStatus | undefined): DocStatus {
  return current === "complete" ? "incomplete" : "complete";
}

export function readyCount(statuses: Record<string, DocStatus> | undefined, documents: string[]): number {
  return additionalDocuments(documents).filter((d) => isTicked(statuses, docKey(d))).length;
}

/** Application progress: ready documents out of all documents (the letter counts as one, never as done). */
export function applicationProgress(
  statuses: Record<string, DocStatus> | undefined,
  documents: string[],
): { done: number; total: number } {
  return { done: readyCount(statuses, documents), total: documents.length };
}
