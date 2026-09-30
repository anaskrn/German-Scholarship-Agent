import { z } from "zod";
import { Lang } from "./schema";

/*
  Helpers for the motivation-letter generator. No LLM here: these functions check what the model wrote
  against the student's own material and assemble the final letter, so they can be unit-tested.
*/

export const LetterDraftSchema = z.object({
  /** full name exactly as written in the student's material, or null */
  applicantName: z.string().nullable(),
  paragraphs: z
    .array(
      z.object({
        text: z.string(),
        /** short verbatim snippets from the student's material that this paragraph is based on */
        cvQuotes: z.array(z.string()),
      }),
    )
    .min(3)
    .max(7),
});
export type LetterDraft = z.infer<typeof LetterDraftSchema>;

type LetterIssue = "empty" | "language" | "numbers" | "quotes" | "short";

export interface LetterAssessment {
  issues: LetterIssue[];
  /** share of the quoted snippets that really occur in the student's material (0-1) */
  quoteRatio: number;
  words: number;
  /** true when the letter must not be shown as is (wrong language, invented numbers, ungrounded) */
  blocking: boolean;
}

/** Below this the material is too short to write an honest personal letter (it would be padded with invention). */
export const MIN_SOURCE_CHARS = 150;

/** Below this many characters the student gave us too little to write a full letter from. */
const THIN_SOURCE_CHARS = 400;

const MIN_LENGTH: Record<Lang, { full: number; thin: number }> = {
  en: { full: 290, thin: 110 },
  de: { full: 270, thin: 100 },
  zh: { full: 520, thin: 200 },
};

/** Minimum length (in editor words) of a complete letter for this language and amount of material. */
export function letterMinWords(lang: Lang, source: string): number {
  return source.length < THIN_SOURCE_CHARS ? MIN_LENGTH[lang].thin : MIN_LENGTH[lang].full;
}

/** A letter at or above this share of the minimum is accepted without a second attempt. */
export const MIN_WORDS_FOR_ACCEPT = 0.75;

/** Letters and digits only, lower-case: lets a quote match across line breaks, hyphenation and punctuation. */
const squash = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

const CJK = /[㐀-鿿]/g;
const cjkCount = (s: string) => s.match(CJK)?.length ?? 0;

function letterLength(text: string): number {
  // same counting rule as the editor's word count: one CJK character = one word
  return text.match(/[㐀-鿿]|[^\s㐀-鿿]+/g)?.length ?? 0;
}

const STOP: Record<"en" | "de", string[]> = {
  en: ["the", "and", "of", "to", "my", "with", "that", "for", "have", "is"],
  de: ["der", "die", "und", "ich", "mit", "das", "für", "von", "ist", "meine"],
};

/** True when the text is clearly written in `lang` (not in another of the three languages). */
export function isWrittenIn(lang: Lang, text: string): boolean {
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  if (letters === 0) return false;
  const cjkShare = cjkCount(text) / letters;
  if (lang === "zh") return cjkShare > 0.6;
  if (cjkShare > 0.05) return false;
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  const hits = (code: "en" | "de") => words.filter((w) => STOP[code].includes(w)).length;
  const other = lang === "en" ? "de" : "en";
  return hits(lang) > hits(other);
}

/** Checks a generated letter against the student's material. */
export function assessLetter(input: {
  draft: LetterDraft;
  lang: Lang;
  /** the student's own text (CV and/or description) */
  source: string;
  /** scholarship data the model was allowed to use (numbers in it are fine to repeat) */
  allowedFacts: string;
}): LetterAssessment {
  const { draft, lang, source, allowedFacts } = input;
  const body = draft.paragraphs.map((p) => p.text).join("\n\n");
  const issues: LetterIssue[] = [];

  const words = letterLength(body);
  if (draft.paragraphs.every((p) => !p.text.trim())) issues.push("empty");

  if (!isWrittenIn(lang, body)) issues.push("language");

  // Every number in the letter (years, grades, counts) must come from the student's material or the scholarship data.
  const allowed = new Set(`${source} ${allowedFacts}`.match(/\d+/g) ?? []);
  if ((body.match(/\d+/g) ?? []).some((n) => !allowed.has(n))) issues.push("numbers");

  // Every paragraph has to be anchored in real material: the quoted snippets must occur in the source.
  const haystack = squash(source);
  const quotes = draft.paragraphs.flatMap((p) => p.cvQuotes).filter((q) => squash(q).length >= 4);
  const verified = quotes.filter((q) => haystack.includes(squash(q))).length;
  const quoteRatio = quotes.length === 0 ? 0 : verified / quotes.length;
  const thin = source.length < THIN_SOURCE_CHARS;
  if (quotes.length === 0 || quoteRatio < 0.5 || (!thin && verified < 3)) issues.push("quotes");

  if (words < letterMinWords(lang, source)) issues.push("short");

  return {
    issues,
    quoteRatio,
    words,
    blocking: issues.some((i) => i !== "short"),
  };
}

const SEGMENTER_LOCALE: Record<Lang, string> = { en: "en", de: "de", zh: "zh" };

/** The letter's sentences in reading order (paragraph by paragraph), as numbered for the fact-check. */
export function letterSentences(draft: LetterDraft, lang: Lang): string[] {
  const seg = new Intl.Segmenter(SEGMENTER_LOCALE[lang], { granularity: "sentence" });
  return draft.paragraphs.flatMap((p) => Array.from(seg.segment(p.text), (x) => x.segment.trim()).filter(Boolean));
}

/** Removes sentences by their position in `letterSentences` (0-based). Empty paragraphs disappear. */
export function removeSentences(draft: LetterDraft, lang: Lang, indices: number[]): LetterDraft {
  const drop = new Set(indices);
  const seg = new Intl.Segmenter(SEGMENTER_LOCALE[lang], { granularity: "sentence" });
  let i = 0;
  const paragraphs = draft.paragraphs
    .map((p) => {
      const kept: string[] = [];
      for (const { segment } of seg.segment(p.text)) {
        if (!segment.trim()) continue;
        if (!drop.has(i++)) kept.push(segment.trim());
      }
      return { ...p, text: kept.join(lang === "zh" ? "" : " ") };
    })
    .filter((p) => p.text);
  return { ...draft, paragraphs };
}

const CLOSING: Record<Lang, string> = {
  en: "Sincerely,",
  de: "Mit freundlichen Grüßen",
  zh: "此致\n敬礼！",
};
/** A fixed, fact-free last sentence: the letter ends properly even if the fact-check removed the closing paragraph. */
const THANKS: Record<Lang, string> = {
  en: "Thank you for considering my application. I would be glad to contribute to your community and to learn from it.",
  de: "Vielen Dank, dass Sie sich die Zeit für meine Bewerbung nehmen. Ich würde mich freuen, mich in Ihre Gemeinschaft einzubringen und von ihr zu lernen.",
  zh: "感谢您审阅我的申请。我期待有机会融入贵基金会的学术共同体，并在其中学习与贡献。",
};
const NAME_PLACEHOLDER: Record<Lang, string> = { en: "[Your name]", de: "[Vorname Nachname]", zh: "[你的姓名]" };

/** Words that may start a German sentence in lower case after "Sehr geehrte …,". Never includes nouns or "Ich". */
const DE_LOWER_START = new Set([
  "hiermit",
  "mit",
  "seit",
  "als",
  "durch",
  "während",
  "nach",
  "für",
  "bereits",
  "schon",
  "im",
  "in",
  "am",
  "zu",
  "bei",
  "von",
  "vor",
  "aus",
  "auf",
  "um",
  "dank",
  "ausgehend",
  "gerade",
  "besonders",
  "da",
  "weil",
  "wenn",
  "obwohl",
  "aufgrund",
  "angesichts",
  "zunächst",
  "zuerst",
  "heute",
  "derzeit",
  "momentan",
  "aktuell",
  "der",
  "die",
  "das",
  "dem",
  "den",
  "ein",
  "eine",
  "einen",
  "einem",
  "mein",
  "meine",
  "meinen",
  "meinem",
  "meiner",
  "meines",
]);

/**
 * The letter starts right after the salutation, which ends with a comma in German ("Sehr geehrte …,"),
 * so a function word at the start is written in lower case ("hiermit bewerbe ich mich …").
 */
export function adaptOpening(lang: Lang, body: string): string {
  if (lang !== "de") return body;
  const m = body.match(/^(\p{L}+)/u);
  if (!m || !DE_LOWER_START.has(m[1].toLowerCase())) return body;
  return m[1].toLowerCase() + body.slice(m[1].length);
}

/** Drops markdown the model sometimes adds, and stray salutations it was told not to write. */
function cleanParagraph(text: string): string {
  return text
    .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/[`*]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

/** Builds the final letter body: paragraphs, localized closing and the name (only when the material states it). */
export function assembleLetter(draft: LetterDraft, lang: Lang, source: string): string {
  const paragraphs = draft.paragraphs.map((p) => cleanParagraph(p.text)).filter(Boolean);
  const name = draft.applicantName?.trim();
  const nameIsReal = Boolean(name) && name!.length <= 80 && squash(source).includes(squash(name!));
  const text = adaptOpening(lang, [...paragraphs, THANKS[lang]].join("\n\n"));
  return `${text}\n\n${CLOSING[lang]}\n\n${nameIsReal ? name : NAME_PLACEHOLDER[lang]}`;
}
