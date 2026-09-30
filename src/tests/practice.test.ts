import { describe, expect, it } from "vitest";
import {
  averageMetrics,
  interviewOpening,
  interviewQuestions,
  isQuestion,
  isSubstantiveAnswer,
  paceOf,
  parseFeedback,
  TOTAL_QUESTIONS,
  wordsPerMinute,
} from "@/lib/practice";

describe("feedback parsing", () => {
  it("clamps scores to integers within 0-100 and keeps the tip short and plain", () => {
    const f = parseFeedback({
      clarity: 104.6,
      structure: -12,
      authenticity: 77.4,
      tip: "**Add** one  concrete\nexample.",
    });
    expect(f).toEqual({ clarity: 100, structure: 0, authenticity: 77, tip: "Add one concrete example." });
    expect(parseFeedback({ clarity: 50, structure: 50, authenticity: 50, tip: "x".repeat(400) })?.tip).toHaveLength(
      160,
    );
  });

  it("rejects malformed model output instead of showing made-up numbers", () => {
    expect(parseFeedback({ clarity: "high", structure: 1, authenticity: 1, tip: "x" })).toBeNull();
    expect(parseFeedback({ clarity: 1 })).toBeNull();
    expect(parseFeedback(null)).toBeNull();
  });

  it("averages the answers so far", () => {
    expect(averageMetrics([])).toBeNull();
    expect(
      averageMetrics([
        { clarity: 80, structure: 60, authenticity: 90 },
        { clarity: 60, structure: 70, authenticity: 70 },
      ]),
    ).toEqual({ clarity: 70, structure: 65, authenticity: 80 });
  });
});

describe("interview helpers", () => {
  it("recognises interviewer questions (also Chinese question marks)", () => {
    expect(isQuestion("Why did you choose us?")).toBe(true);
    expect(isQuestion("你为什么选择我们？")).toBe(true);
    expect(isQuestion("Thank you, that was a good answer.")).toBe(false);
  });

  it("computes pace from words and seconds, and ignores too little speech", () => {
    const text = Array(64).fill("word").join(" ");
    expect(wordsPerMinute(text, 30)).toBe(128);
    expect(wordsPerMinute("hi there", 2)).toBeNull();
    expect(wordsPerMinute("one two", 30)).toBeNull();
    expect(paceOf(90)).toBe("slow");
    expect(paceOf(128)).toBe("natural");
    expect(paceOf(200)).toBe("fast");
  });

  it("has the scripted fallback questions in all languages, mentioning the foundation", () => {
    for (const lang of ["en", "de", "zh"] as const) {
      const qs = interviewQuestions(lang, "Heinrich-Böll-Stiftung", ["ecology", "democracy", "gender democracy"]);
      expect(qs).toHaveLength(TOTAL_QUESTIONS);
      expect(qs[1]).toContain("Heinrich-Böll-Stiftung");
    }
    expect(interviewQuestions("en", "X", ["a", "b", "c", "d"])[2]).toContain("a, b, c");
    expect(interviewQuestions("en", "X", ["a", "b", "c", "d"])[2]).not.toContain("d");
  });
});

describe("silence handling", () => {
  it("does not treat speech-to-text silence as an answer", () => {
    for (const silence of ["...", "…", "  ", "uh", "Yes.", "。。。", "嗯"])
      expect(isSubstantiveAnswer(silence)).toBe(false);
  });
  it("accepts real answers in all languages", () => {
    expect(isSubstantiveAnswer("I study renewable energy.")).toBe(true);
    expect(isSubstantiveAnswer("Ich studiere erneuerbare Energien.")).toBe(true);
    expect(isSubstantiveAnswer("我在柏林学习可再生能源。")).toBe(true);
  });
});

describe("voice agent opening", () => {
  it("is written in the selected language, names the foundation and is question 1", () => {
    const en = interviewOpening("en", "Heinrich-Böll-Stiftung");
    const de = interviewOpening("de", "Heinrich-Böll-Stiftung");
    const zh = interviewOpening("zh", "Heinrich-Böll-Stiftung");
    for (const text of [en, de, zh]) {
      expect(text).toContain("Heinrich-Böll-Stiftung");
      expect(isQuestion(text)).toBe(true);
    }
    expect(de).toMatch(/Hallo und willkommen/);
    expect(zh).toMatch(/[㐀-鿿]{10}/);
    expect(en).toMatch(/welcome/);
  });
});
