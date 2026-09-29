import scholarshipsData from "../../data/scholarships.json";
import { z } from "zod";
import {
  Caution,
  FAITH_AFFINITIES,
  MatchResult,
  Profile,
  Reason,
  Scholarship,
  ScholarshipSchema,
  Topic,
} from "./schema";

// Validated once at load: a broken dataset fails loudly instead of rendering wrong data.
const scholarships: Scholarship[] = z.array(ScholarshipSchema).parse(scholarshipsData);

export function getAllScholarships(): Scholarship[] {
  return scholarships;
}

export function getScholarshipById(id: string): Scholarship | undefined {
  return scholarships.find((s) => s.id === id);
}

const BASE = 40;

/**
 * Deterministic 0-100 fit score for every scholarship (no LLM involved).
 * Faith-based foundations stay in the list but are capped when the user
 * has not said they belong to that faith, or has named a different one.
 */
export function matchScholarships(profile: Profile): MatchResult[] {
  const userTopics = new Set<Topic>(profile.topics);

  const results = scholarships.map((s, index): MatchResult & { index: number } => {
    let score = BASE;
    const reasons: Reason[] = [];
    let caution: Caution = null;

    // Academic strength: the flagship excellence foundation weighs it most.
    if (profile.gradesBand === "excellent") {
      score += s.affinity === "neutral" ? 16 : 6;
      // Only claim an "excellence focus" for the foundation that actually has one.
      if (s.affinity === "neutral") reasons.push({ code: "excellence" });
    } else if (profile.gradesBand === "good") {
      score += s.affinity === "neutral" ? 8 : 3;
    }

    // Overlap between the user's interests and the foundation's topics.
    const overlap = s.topics.filter((t) => userTopics.has(t));
    if (overlap.length > 0) {
      score += Math.min(overlap.length, 3) * 8;
      reasons.push({ code: "topics", topics: overlap.slice(0, 3) });
    }

    // Political / union / business affinity.
    if (profile.politicalAffinity && s.affinity === profile.politicalAffinity) {
      score += 30;
      reasons.push({ code: "affinity", affinity: s.affinity });
    } else if (profile.politicalAffinity && isPartyAffinity(s.affinity)) {
      score -= 8;
    }
    if (profile.unionMember && s.affinity === "dgb") {
      score += 28;
      reasons.push({ code: "union" });
    }

    // First-generation students: foundations known for supporting educational advancement.
    if (profile.firstGeneration && (s.id === "fes" || s.id === "boeckler")) {
      score += 10;
      reasons.push({ code: "firstGen" });
    }

    // The neutral foundation is the natural default when no affiliation is stated.
    if (s.affinity === "neutral") {
      score += profile.politicalAffinity || profile.religion ? 2 : 8;
      reasons.push({ code: "neutral" });
    }

    // Faith-based foundations.
    if ((FAITH_AFFINITIES as string[]).includes(s.affinity)) {
      if (profile.religion === s.affinity) {
        score += 32;
        reasons.push({ code: "faith" });
      } else if (profile.religion) {
        score = Math.min(score, 28);
        caution = "faithMismatch";
      } else {
        score = Math.min(score - 10, 56);
        caution = "faithUnknown";
      }
    }

    if (reasons.length === 0) reasons.push({ code: "general" });

    return {
      scholarshipId: s.id,
      score: Math.round(Math.max(8, Math.min(score, 98))),
      reasons,
      caution,
      index,
    };
  });

  // Stable sort: higher score first, dataset order breaks ties.
  results.sort((a, b) => b.score - a.score || a.index - b.index);
  return results.map(({ scholarshipId, score, reasons, caution }) => ({ scholarshipId, score, reasons, caution }));
}

function isPartyAffinity(a: string): boolean {
  return ["spd", "fdp", "csu", "greens", "cdu", "linke"].includes(a);
}
