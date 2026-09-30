import { z } from "zod";
import { Lang } from "./schema";

/** The interview has about five short questions; progress is shown as "Question N of 5". */
export const TOTAL_QUESTIONS = 5;

/** Per-answer feedback estimated by the AI. Clearly labelled "AI-estimated" in the UI. */
export const FeedbackSchema = z.object({
  clarity: z.number(),
  structure: z.number(),
  authenticity: z.number(),
  tip: z.string(),
});

export interface Metrics {
  clarity: number;
  structure: number;
  authenticity: number;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 0)));

/** Validates the model output: scores become integers within 0-100, the tip stays short, plain text. */
export function parseFeedback(raw: unknown): (Metrics & { tip: string }) | null {
  const parsed = FeedbackSchema.safeParse(raw);
  if (!parsed.success) return null;
  const f = parsed.data;
  const tip = f.tip
    .replace(/[*_`#]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  return { clarity: clamp(f.clarity), structure: clamp(f.structure), authenticity: clamp(f.authenticity), tip };
}

/** Average over all answers so far; null while nothing has been rated. */
export function averageMetrics(list: Metrics[]): Metrics | null {
  if (list.length === 0) return null;
  const avg = (pick: (m: Metrics) => number) => Math.round(list.reduce((sum, m) => sum + pick(m), 0) / list.length);
  return {
    clarity: avg((m) => m.clarity),
    structure: avg((m) => m.structure),
    authenticity: avg((m) => m.authenticity),
  };
}

/** An interviewer turn that asks something counts as the next question. */
export function isQuestion(text: string): boolean {
  return /[?？]/.test(text);
}

const CJK = /[㐀-鿿]/g;

/**
 * Speech-to-text returns "..." or a single filler word for silence. That is not an answer: it must not be rated
 * or shown (it would drag the scores down). Needs at least 3 words, or 5 Chinese characters.
 */
export function isSubstantiveAnswer(text: string): boolean {
  const cleaned = text.replace(/[.…。,，!?！？\s-]+/g, " ").trim();
  if (!cleaned) return false;
  const cjk = cleaned.match(CJK)?.length ?? 0;
  const words = cleaned.replace(CJK, " ").match(/\S+/g)?.length ?? 0;
  return cjk >= 5 || words + cjk >= 3;
}

/** Spoken words per minute; Chinese counts characters (about 1.7 characters per word). */
export function wordsPerMinute(text: string, seconds: number): number | null {
  if (seconds < 3) return null;
  const cjk = text.match(CJK)?.length ?? 0;
  const others = text.replace(CJK, " ").match(/\S+/g)?.length ?? 0;
  const words = others + cjk / 1.7;
  if (words < 3) return null;
  return Math.round((words / seconds) * 60);
}

export type Pace = "slow" | "natural" | "fast";
export function paceOf(wpm: number): Pace {
  return wpm < 110 ? "slow" : wpm > 170 ? "fast" : "natural";
}

/** Scripted questions for the text-only fallback (the voice agent asks its own). */
export function interviewQuestions(lang: Lang, name: string, values: string[]): string[] {
  const v = values.slice(0, 3).join(", ");
  if (lang === "de") {
    return [
      "Erzähl mir etwas über dich.",
      `Warum hast du dich für die ${name} entschieden?`,
      `Die ${name} legt Wert auf ${v}. Erzähl von einer Erfahrung, die einen dieser Werte zeigt.`,
      "Erzähl von einer Situation, in der etwas nicht nach Plan lief. Was hast du getan?",
      "Was würdest du in die Gemeinschaft der Stiftung einbringen, und was willst du in den nächsten fünf Jahren erreichen?",
    ];
  }
  if (lang === "zh") {
    return [
      "请介绍一下你自己。",
      `你为什么选择${name}？`,
      `${name}重视${v}。请讲一段体现其中一项价值的经历。`,
      "请讲一次事情没有按计划进行的经历。你是怎么做的？",
      "你会为基金会的社群带来什么？未来五年你想实现什么？",
    ];
  }
  return [
    "Tell me about yourself.",
    `Why did you choose the ${name}?`,
    `${name} values ${v}. Tell me about an experience that shows one of these values.`,
    "Tell me about a time something did not go as planned. What did you do?",
    "What would you bring to the community of the foundation, and what do you want to achieve in the next five years?",
  ];
}

/**
 * First thing the voice agent says, per language. It is sent with every session (together with the language) so the
 * agent speaks the language selected in the app, whatever its default is. It is question 1, so it ends with "?".
 */
export function interviewOpening(lang: Lang, name: string): string {
  if (lang === "de") {
    return `Hallo und willkommen zu deinem Probeinterview für die ${name}. Ich stelle dir etwa fünf kurze Fragen. Nimm dir Zeit und antworte in deinen eigenen Worten. Lass uns anfangen: Kannst du mir ein wenig über dich erzählen?`;
  }
  if (lang === "zh") {
    return `你好，欢迎参加${name}的模拟面试。我会问你大约五个简短的问题。请慢慢来，用你自己的话回答。我们开始吧：你能先简单介绍一下你自己吗？`;
  }
  return `Hello, and welcome to your practice interview for the ${name}. I will ask you about five short questions. Take your time and answer in your own words. Let's begin: could you tell me a little about yourself?`;
}
