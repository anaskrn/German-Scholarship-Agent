const CJK = "\\u3000-\\u303f\\u3400-\\u9fff\\uff00-\\uffef";
const GAP_IN_CJK = new RegExp(`([${CJK}])[ \\t]+(?=[${CJK}])`, "g");

/**
 * Cleans text extracted from a PDF (text layer or OCR):
 * - maps "lookalike" CJK radicals (e.g. ⼩ U+2F29) that many PDF fonts use to the real characters (小)
 * - removes the spaces OCR inserts between Chinese characters
 * - collapses stray whitespace
 */
export function cleanExtractedText(s: string): string {
  return s
    .replace(/\u0000/g, "")
    .replace(/[⺀-⿟]/g, (c) => c.normalize("NFKC"))
    .replace(GAP_IN_CJK, "$1")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
