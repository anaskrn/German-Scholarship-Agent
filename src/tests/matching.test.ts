import { describe, expect, it } from "vitest";
import { getAllScholarships, matchScholarships } from "@/lib/matching";
import { emptyProfile, heuristicProfile, mergeProfiles, normalizeProfile } from "@/lib/profile";

describe("matchScholarships", () => {
  it("scores all 13 scholarships, sorted, within 0-100", () => {
    const res = matchScholarships(emptyProfile);
    expect(res).toHaveLength(getAllScholarships().length);
    for (let i = 1; i < res.length; i++) expect(res[i - 1].score).toBeGreaterThanOrEqual(res[i].score);
    res.forEach((r) => {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.reasons.length).toBeGreaterThan(0);
    });
  });

  it("puts the matching party foundation first when the user names an affinity", () => {
    const p = heuristicProfile("I study political science, I am close to the Green party and care about climate and democracy");
    expect(matchScholarships(p)[0].scholarshipId).toBe("boell");
  });

  it("keeps faith-based foundations low unless the user states that faith", () => {
    const unknown = matchScholarships(emptyProfile).find((r) => r.scholarshipId === "cusanuswerk")!;
    expect(unknown.score).toBeLessThanOrEqual(56);
    expect(unknown.caution).toBe("faithUnknown");

    const catholic = matchScholarships(heuristicProfile("I am Catholic and study theology")).find(
      (r) => r.scholarshipId === "cusanuswerk",
    )!;
    expect(catholic.caution).toBeNull();
    expect(catholic.score).toBeGreaterThan(unknown.score);

    const other = matchScholarships(heuristicProfile("I am Muslim")).find((r) => r.scholarshipId === "cusanuswerk")!;
    expect(other.caution).toBe("faithMismatch");
    expect(other.score).toBeLessThanOrEqual(28);
  });

  it("only claims an excellence focus for the foundation that has one", () => {
    const res = matchScholarships(heuristicProfile("Master student, top of my class with excellent grades"));
    for (const r of res) {
      const hasExcellence = r.reasons.some((x) => x.code === "excellence");
      expect(hasExcellence).toBe(r.scholarshipId === "studienstiftung");
    }
  });

  it("rates excellent grades highest for the excellence foundation", () => {
    const p = heuristicProfile("Master student, top of my class with excellent grades");
    expect(matchScholarships(p)[0].scholarshipId).toBe("studienstiftung");
  });
});

describe("profile helpers", () => {
  it("extracts basics from EN, DE and ZH text", () => {
    expect(heuristicProfile("PhD funding in Berlin").phase).toBe("phd");
    expect(heuristicProfile("PhD funding in Berlin").countryOfStudy).toBe("Germany");
    expect(heuristicProfile("Ich studiere Informatik im Master").fieldOfStudy).toBe("Computer Science");
    expect(heuristicProfile("我是计算机专业的硕士生").phase).toBe("master");
  });

  it("does not infer sensitive attributes from unrelated text", () => {
    const p = heuristicProfile("Master's in Software Engineering, start-up experience");
    expect(p.religion).toBeNull();
    expect(p.politicalAffinity).toBeNull();
    expect(p.topics).not.toContain("culture");
  });

  it("normalizes junk model output and merges with the fallback", () => {
    const n = normalizeProfile({ phase: "MASTER", religion: "pastafarian", topics: ["ecology", "nonsense"], gradesBand: 5 });
    expect(n.phase).toBe("master");
    expect(n.religion).toBeNull();
    expect(n.topics).toEqual(["ecology"]);
    const merged = mergeProfiles(n, heuristicProfile("PhD in Berlin"));
    expect(merged.phase).toBe("master");
    expect(merged.countryOfStudy).toBe("Germany");
  });
});
