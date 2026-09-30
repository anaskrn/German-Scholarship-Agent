import { z } from "zod";

export type Lang = "en" | "de" | "zh";
export const LANGS: Lang[] = ["en", "de", "zh"];

/** Canonical interest topics. The LLM and the keyword fallback both map user text onto these. */
export const TOPICS = [
  "ecology",
  "social",
  "politics",
  "democracy",
  "business",
  "technology",
  "research",
  "education",
  "law",
  "health",
  "equality",
  "international",
  "culture",
  "faith",
  "labor",
] as const;
export type Topic = (typeof TOPICS)[number];

const AFFINITIES = [
  "neutral",
  "catholic",
  "protestant",
  "jewish",
  "muslim",
  "spd",
  "fdp",
  "csu",
  "greens",
  "cdu",
  "linke",
  "dgb",
  "business",
] as const;
export type Affinity = (typeof AFFINITIES)[number];

export const FAITH_AFFINITIES: Affinity[] = ["catholic", "protestant", "jewish", "muslim"];

const LocalizedStringSchema = z.object({
  en: z.string(),
  de: z.string(),
  zh: z.string().optional(),
});

const DeadlineSchema = z.object({
  label: z.string(),
  date: z.string().nullable(),
  note: z.string().optional(),
});

const TextBlockSchema = z.object({
  values: z.array(z.string()),
  selectionProcess: z.string(),
  essayFocus: z.string(),
});

export const ScholarshipSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** short label for compact UI (loading screen) and a 2-letter abbreviation for the orbit nodes */
  shortName: z.string(),
  abbr: z.string(),
  displayName: LocalizedStringSchema,
  type: z.string(),
  orientation: LocalizedStringSchema,
  affinity: z.enum(AFFINITIES),
  tag: z.object({ en: z.string(), de: z.string(), zh: z.string() }),
  topics: z.array(z.enum(TOPICS)),
  values: z.array(z.string()),
  text: z.object({
    en: TextBlockSchema,
    de: TextBlockSchema,
    zh: TextBlockSchema,
  }),
  phases: z.array(z.string()),
  hardFilters: z.array(z.string()),
  deadlines: z.array(DeadlineSchema),
  selectionProcess: z.string(),
  essayFocus: z.string(),
  documents: z.array(z.string()),
  funding: z.object({ note: z.string() }),
  url: z.string(),
  lastVerified: z.string(),
});
export type Scholarship = z.infer<typeof ScholarshipSchema>;

/** Profile extracted from the user's free text. Unknown fields stay null / empty. */
export const ProfileSchema = z.object({
  phase: z.enum(["bachelor", "master", "phd", "pre-university"]).nullable(),
  fieldOfStudy: z.string().nullable(),
  gradesBand: z.enum(["excellent", "good", "average"]).nullable(),
  firstGeneration: z.boolean().nullable(),
  topics: z.array(z.enum(TOPICS)),
  religion: z.enum(["catholic", "protestant", "jewish", "muslim", "other"]).nullable(),
  politicalAffinity: z.enum(["spd", "fdp", "csu", "greens", "cdu", "linke"]).nullable(),
  unionMember: z.boolean().nullable(),
  languageSkills: z.array(z.string()),
  goals: z.string().nullable(),
  countryOfStudy: z.string().nullable(),
});
export type Profile = z.infer<typeof ProfileSchema>;

/** Structured "why it matches" facts, rendered into text per language (also used as LLM input). */
export type Reason =
  | { code: "excellence" }
  | { code: "topics"; topics: Topic[] }
  | { code: "affinity"; affinity: Affinity }
  | { code: "union" }
  | { code: "faith" }
  | { code: "firstGen" }
  | { code: "neutral" }
  | { code: "general" };

export type Caution = "faithUnknown" | "faithMismatch" | null;

export interface MatchResult {
  scholarshipId: string;
  score: number;
  reasons: Reason[];
  caution: Caution;
}

// ---- API payload schemas (validated on the server) ----

export const ProfileRequestSchema = z.object({ text: z.string().min(1).max(20000) });

export const ExplainRequestSchema = z.object({
  lang: z.enum(["en", "de", "zh"]),
  profile: ProfileSchema,
  matches: z
    .array(
      z.object({
        scholarshipId: z.string(),
        score: z.number(),
        reasons: z.array(z.any()),
        caution: z.string().nullable().optional(),
      }),
    )
    .max(5),
});

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8000),
});

export const CoachRequestSchema = z.object({
  lang: z.enum(["en", "de", "zh"]),
  scholarshipId: z.string(),
  draft: z.string().max(12000).default(""),
  messages: z.array(ChatMessageSchema).min(1).max(30),
});

export const SuggestionsRequestSchema = z.object({
  lang: z.enum(["en", "de", "zh"]),
  scholarshipId: z.string(),
  draft: z.string().max(12000).default(""),
});

export const EditRequestSchema = z.object({
  lang: z.enum(["en", "de", "zh"]),
  scholarshipId: z.string(),
  mode: z.enum(["improve", "shorten", "translate"]),
  text: z.string().min(1).max(8000),
});
