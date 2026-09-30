import { describe, expect, it } from "vitest";
import { getAllScholarships, matchScholarships } from "@/lib/matching";
import { emptyProfile, heuristicProfile, mergeProfiles, normalizeProfile, verifyProfile } from "@/lib/profile";
import type { Profile } from "@/lib/schema";
import { profileChips, profileRows, partialProfile } from "@/lib/facts";
import { translations } from "@/lib/i18n";

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
    const p = heuristicProfile(
      "I study political science, I am close to the Green party and care about climate and democracy",
    );
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
    const n = normalizeProfile({
      phase: "MASTER",
      religion: "pastafarian",
      topics: ["ecology", "nonsense"],
      gradesBand: 5,
    });
    expect(n.phase).toBe("master");
    expect(n.religion).toBeNull();
    expect(n.topics).toEqual(["ecology"]);
    const merged = mergeProfiles(n, heuristicProfile("PhD in Berlin"));
    expect(merged.phase).toBe("master");
    expect(merged.countryOfStudy).toBe("Germany");
  });
});

describe("verifyProfile (anti-hallucination)", () => {
  // A profile full of claims the model might invent from a very short input.
  const invented: Profile = {
    phase: "phd",
    fieldOfStudy: "Quantum Computing",
    gradesBand: "excellent",
    firstGeneration: true,
    topics: ["ecology", "politics", "faith"],
    religion: "catholic",
    politicalAffinity: "greens",
    unionMember: true,
    languageSkills: ["French", "German"],
    goals: "Win a Nobel prize in physics",
    countryOfStudy: "Switzerland",
  };

  it("drops every unsupported claim for a tiny input", () => {
    const v = verifyProfile(invented, "PhD funding in Berlin");
    expect(v.phase).toBe("phd"); // "PhD" is in the text
    expect(v.countryOfStudy).toBe("Germany"); // Berlin is in the text, Switzerland is not
    expect(v.fieldOfStudy).toBeNull();
    expect(v.gradesBand).toBeNull();
    expect(v.firstGeneration).toBeNull();
    expect(v.religion).toBeNull();
    expect(v.politicalAffinity).toBeNull();
    expect(v.unionMember).toBeNull();
    expect(v.topics).not.toEqual(expect.arrayContaining(["ecology"]));
    expect(v.topics).not.toContain("politics");
    expect(v.topics).not.toContain("faith");
    expect(v.languageSkills).toEqual([]);
    expect(v.goals).toBeNull();
  });

  it("never takes religion or party from a mere mention", () => {
    const text =
      "Master's in Sociology. I volunteered at a Catholic hospital, tutored Muslim refugee children and wrote a thesis on the Green party and the SPD.";
    const v = verifyProfile({ ...invented, phase: "master" }, text);
    expect(v.religion).toBeNull();
    expect(v.politicalAffinity).toBeNull();
    expect(heuristicProfile(text).religion).toBeNull();
  });

  it("accepts explicit statements (EN / DE / ZH)", () => {
    expect(heuristicProfile("I am a practicing Catholic and study law").religion).toBe("catholic");
    expect(heuristicProfile("Konfession: evangelisch. Ich studiere Physik.").religion).toBe("protestant");
    expect(heuristicProfile("我是穆斯林，正在读硕士").religion).toBe("muslim");
    expect(heuristicProfile("Ich bin Mitglied der SPD und der Gewerkschaft ver.di").politicalAffinity).toBe("spd");
    expect(heuristicProfile("I am a member of the Green party").politicalAffinity).toBe("greens");
    expect(heuristicProfile("Mitglied der Gewerkschaft IG Metall").unionMember).toBe(true);
  });

  it("keeps facts that really are in a CV and drops the rest", () => {
    const cv = `Lena Hartmann, Berlin
M.Sc. Environmental Engineering, TU Berlin, 2024 - present. Grade average so far: 1.3
B.Sc. Civil Engineering, University of Stuttgart. First in my family to attend university.
Founder of a campus climate initiative, debates on democracy. Volunteer tutor for refugee children.
Languages: German (native), English (C1), Spanish (B1)`;
    const v = verifyProfile(
      {
        ...invented,
        phase: "master",
        fieldOfStudy: "Environmental Engineering",
        goals: null,
        countryOfStudy: "Germany",
        languageSkills: ["German", "English", "Spanish", "Japanese"],
      },
      cv,
    );
    expect(v.phase).toBe("master");
    expect(v.fieldOfStudy).toBe("Environmental Engineering");
    expect(v.gradesBand).toBe("excellent");
    expect(v.firstGeneration).toBe(true);
    expect(v.languageSkills.sort()).toEqual(["English", "German", "Spanish"]); // Japanese was invented
    expect(v.religion).toBeNull();
    expect(v.unionMember).toBeNull();
    expect(v.topics).toContain("ecology");
  });

  it("does not turn the word 'Deutschland' into a German language skill, or a CV heading into a field", () => {
    const v = heuristicProfile("Education\nBSc Business Informatics, Universität Mannheim, Deutschland");
    expect(v.languageSkills).not.toContain("German");
    expect(v.fieldOfStudy).not.toBe("Education");
  });

  it("does not claim top grades from an unrelated 'excellent'", () => {
    expect(heuristicProfile("Excellent communication skills, reliable team player").gradesBand).toBeNull();
    expect(
      verifyProfile({ ...invented, gradesBand: "excellent" }, "Excellent communication skills").gradesBand,
    ).toBeNull();
  });
});

describe("loading-screen facts", () => {
  const profile: Profile = {
    ...emptyProfile,
    phase: "master",
    fieldOfStudy: "Software Engineering",
    gradesBand: "excellent",
    firstGeneration: true,
    topics: ["ecology", "social"],
    languageSkills: ["German", "English"],
    religion: "catholic",
    countryOfStudy: "Germany",
  };

  it("shows only what the profile contains, in every language", () => {
    for (const lang of ["en", "de", "zh"] as const) {
      const t = translations[lang];
      const rows = profileRows(profile, t);
      expect(rows.map((r) => r.key)).toEqual(["level", "field", "background", "interests", "goal"]);
      expect(rows[0].value).toBe(t.analyzing.orbit.levels.master);
      expect(rows[4].value).toBeNull(); // no goal in the profile -> "not mentioned", nothing made up
      const all = JSON.stringify(rows) + JSON.stringify(profileChips(profile, t));
      expect(all).not.toMatch(/catholic|katholi|天主教/i); // sensitive declarations are never displayed
    }
  });

  it("places chips deterministically and leaves empty slots empty", () => {
    const { inner, middle } = profileChips({ ...emptyProfile, phase: "phd" }, translations.en);
    expect(inner[0]?.text).toBe("PhD");
    expect([...inner.slice(1), ...middle].every((c) => c === null)).toBe(true);
  });

  it("reveals facts progressively and the last step equals the full profile", () => {
    expect(partialProfile(profile, 0)).toEqual(emptyProfile);
    expect(partialProfile(profile, 1).phase).toBe("master");
    expect(partialProfile(profile, 1).topics).toEqual([]);
    expect(matchScholarships(partialProfile(profile, 5))).toEqual(matchScholarships(profile));
  });
});
