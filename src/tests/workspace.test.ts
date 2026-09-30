import { describe, expect, it } from "vitest";
import {
  additionalDocuments,
  applicationProgress,
  isTicked,
  LETTER_KEY,
  readyCount,
  toggledStatus,
} from "@/lib/documents";
import { practiceGuard } from "@/lib/guards";
import { getAllScholarships } from "@/lib/matching";
import { translations } from "@/lib/i18n";

describe("documents checklist", () => {
  const docs = ["motivation letter", "CV", "transcript", "reference letter"];

  it("only the motivation letter is written in the app, the rest is a checklist", () => {
    expect(additionalDocuments(docs)).toEqual(["CV", "transcript", "reference letter"]);
    expect(additionalDocuments(docs)).not.toContain(LETTER_KEY);
  });

  it("every scholarship in the dataset has the letter plus at least one document to prepare", () => {
    for (const s of getAllScholarships()) {
      expect(s.documents.map((d) => d.toLowerCase())).toContain(LETTER_KEY);
      expect(additionalDocuments(s.documents).length).toBeGreaterThan(0);
    }
  });

  it("ticking toggles between complete and incomplete", () => {
    expect(toggledStatus(undefined)).toBe("complete");
    expect(toggledStatus("incomplete")).toBe("complete");
    expect(toggledStatus("in-progress")).toBe("complete");
    expect(toggledStatus("complete")).toBe("incomplete");
  });

  it("counts ready documents and never counts the letter as done", () => {
    const statuses = { cv: "complete", transcript: "complete", "motivation letter": "complete" } as const;
    expect(isTicked(statuses, "cv")).toBe(true);
    expect(isTicked(statuses, "reference letter")).toBe(false);
    expect(readyCount(statuses, docs)).toBe(2);
    expect(applicationProgress(statuses, docs)).toEqual({ done: 2, total: 4 });
    expect(applicationProgress(undefined, docs)).toEqual({ done: 0, total: 4 });
  });
});

describe("practice route guard", () => {
  const base = { hydrated: true, hasProfile: true, scholarshipId: "boell", scholarshipExists: true };

  it("waits for the stored state before deciding", () => {
    expect(practiceGuard({ ...base, hydrated: false })).toBe("wait");
  });
  it("sends visitors without a profile to the landing page", () => {
    expect(practiceGuard({ ...base, hasProfile: false })).toEqual({ redirect: "/" });
  });
  it("sends direct visits without a chosen scholarship to the workspace", () => {
    expect(practiceGuard({ ...base, scholarshipId: null })).toEqual({ redirect: "/workspace" });
    expect(practiceGuard({ ...base, scholarshipExists: false })).toEqual({ redirect: "/workspace" });
  });
  it("lets the student in after the workspace button", () => {
    expect(practiceGuard(base)).toBe("ok");
  });
});

describe("stepper and workspace texts", () => {
  it("exist in all three languages", () => {
    for (const lang of ["en", "de", "zh"] as const) {
      const t = translations[lang];
      for (const v of [t.nav.practice, t.nav.practiceHint, t.nav.beta]) expect(v.length).toBeGreaterThan(1);
      const w = t.workspace;
      for (const v of [
        w.writeHere,
        w.writing,
        w.additionalDocs,
        w.prepareHint,
        w.practiceLabel,
        w.practiceTitle,
        w.practiceText,
        w.practiceCta,
      ]) {
        expect(v.length).toBeGreaterThan(1);
      }
      expect(w.readyCount(3, 5)).toContain("3");
      expect(w.readyCount(3, 5)).toContain("5");
    }
  });
});
