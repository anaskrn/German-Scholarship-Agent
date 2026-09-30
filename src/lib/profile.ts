import { Profile, ProfileSchema, TOPICS, Topic } from "./schema";

/*
  Profile helpers that work WITHOUT the LLM:
  - heuristicProfile: keyword extraction (EN / DE / ZH) used as fallback and as a safety net
  - normalizeProfile: cleans whatever the LLM returned into a valid Profile
  - mergeProfiles: LLM values win, the heuristic fills the gaps
*/

export const emptyProfile: Profile = {
  phase: null,
  fieldOfStudy: null,
  gradesBand: null,
  firstGeneration: null,
  topics: [],
  religion: null,
  politicalAffinity: null,
  unionMember: null,
  languageSkills: [],
  goals: null,
  countryOfStudy: null,
};

const TOPIC_KEYWORDS: Record<Topic, string[]> = {
  ecology: [
    "ecolog",
    "environment",
    "climate",
    "sustainab",
    "renewable",
    "energy",
    "umwelt",
    "klima",
    "nachhaltig",
    "energie",
    "环境",
    "气候",
    "可持续",
    "能源",
    "生态",
    "solar",
    "recycl",
    "biodivers",
    "naturschutz",
    "环保",
  ],
  social: [
    "social",
    "volunteer",
    "charity",
    "community",
    "ehrenamt",
    "sozial",
    "gemeinschaft",
    "志愿",
    "社会",
    "公益",
    "社区",
    "refugee",
    "geflüchtet",
    "flüchtling",
    "non-profit",
    "nonprofit",
    "ngo",
    "food bank",
    "难民",
    "慈善",
  ],
  politics: [
    "politic",
    "policy",
    "government",
    "politik",
    "politisch",
    "政治",
    "政策",
    "parliament",
    "bundestag",
    "partei",
    "parlament",
    "议会",
  ],
  democracy: [
    "democra",
    "human rights",
    "civic",
    "demokratie",
    "menschenrecht",
    "民主",
    "人权",
    "student council",
    "fachschaft",
    "asta",
    "debate",
    "学生会",
  ],
  business: [
    "business",
    "econom",
    "entrepreneur",
    "startup",
    "start-up",
    "management",
    "finance",
    "wirtschaft",
    "unternehm",
    "gründ",
    "商",
    "经济",
    "创业",
    "管理",
    "金融",
  ],
  technology: [
    "software",
    "computer",
    "informatic",
    "engineering",
    "technolog",
    "machine learning",
    "artificial intelligence",
    "data science",
    "informatik",
    "ingenieur",
    "计算机",
    "软件",
    "工程",
    "技术",
    "人工智能",
    "programming",
    "python",
    "developer",
    "coding",
    "programmier",
    "编程",
    "开发",
    "maschinenbau",
    "mechanical engineering",
    "electrical engineering",
    "elektrotechnik",
    "ingenieur",
    "机械",
    "电子工程",
  ],
  research: [
    "research",
    "science",
    "phd",
    "academic",
    "thesis",
    "forschung",
    "wissenschaft",
    "promotion",
    "研究",
    "科学",
    "学术",
    "论文",
    "publication",
    "laboratory",
    "hiwi",
    "thesis",
    "abschlussarbeit",
    "实验室",
    "论文",
  ],
  education: [
    "education",
    "teaching",
    "teacher",
    "school",
    "bildung",
    "lehr",
    "schule",
    "教育",
    "教学",
    "tutor",
    "nachhilfe",
    "mentor",
    "teach",
    "lehrer",
    "辅导",
    "老师",
  ],
  law: ["law", "legal", "jura", "recht", "法律", "法学"],
  health: ["health", "medic", "nursing", "gesundheit", "medizin", "健康", "医学"],
  equality: [
    "equality",
    "gender",
    "diversity",
    "inclusion",
    "discriminat",
    "gleichstellung",
    "vielfalt",
    "平等",
    "性别",
    "多元",
  ],
  international: [
    "international",
    "erasmus",
    "abroad",
    "exchange",
    "intercultural",
    "ausland",
    "austausch",
    "interkulturell",
    "国际",
    "留学",
    "交换",
    "跨文化",
  ],
  culture: [
    "culture",
    "art",
    "music",
    "history",
    "philosoph",
    "literature",
    "kultur",
    "musik",
    "geschichte",
    "文化",
    "艺术",
    "音乐",
    "历史",
    "哲学",
  ],
  faith: ["church", "faith", "religio", "kirche", "glaube", "gemeinde", "教会", "信仰", "宗教"],
  labor: ["trade union", "labor", "labour", "worker", "gewerkschaft", "arbeiter", "工会", "劳工", "工人"],
};

// Short ASCII keywords ("law", "art") must match whole words, otherwise "start-up" would hit "art".
function keywordMatches(text: string, kw: string): boolean {
  if (/^[a-z]{1,5}$/.test(kw)) return new RegExp(`\\b${kw}\\b`).test(text);
  return text.includes(kw);
}

function topicsFromText(text: string): Topic[] {
  const t = text.toLowerCase();
  return TOPICS.filter((topic) => TOPIC_KEYWORDS[topic].some((kw) => keywordMatches(t, kw)));
}

const FIELDS: Array<[RegExp, string]> = [
  [
    /software engineering|software development|computer science|informatik|informatics|计算机科学|软件工程|软件/i,
    "Computer Science",
  ],
  [
    /electrical engineering|mechanical engineering|civil engineering|engineering|maschinenbau|elektrotechnik|bauingenieur|ingenieur|工程/i,
    "Engineering",
  ],
  [
    /renewable energy|environmental (?:science|engineering|studies)|climate science|umweltwissenschaft|energietechnik|环境科学|环境工程|能源/i,
    "Environmental / Energy",
  ],
  [
    /economics|business administration|finance|management|volkswirtschaft|betriebswirtschaft|wirtschaft|经济|金融|管理/i,
    "Economics / Business",
  ],
  [/\blaw\b|\bjura\b|rechtswissenschaft|法学|法律/i, "Law"],
  [/medicine|medizin|nursing|医学/i, "Medicine"],
  [
    /physics|chemistry|biology|mathematics|\bmaths\b|physik|chemie|biologie|mathematik|物理|化学|生物|数学/i,
    "Natural Sciences",
  ],
  [/political science|sociology|politikwissenschaft|soziologie|政治学|社会学/i, "Social Sciences"],
  [
    /philosophy|literature studies|linguistics|history (?:major|degree|studies)|geschichtswissenschaft|philosophie|literaturwissenschaft|历史学|哲学|文学/i,
    "Humanities",
  ],
  [/pedagog|lehramt|teacher training|bildungswissenschaft|教育学|师范/i, "Education"],
  [
    /\barchitecture\b|graphic design|industrial design|\bmusic\b|fine arts|kunst|musik|architektur|艺术|设计|音乐|建筑/i,
    "Arts / Design",
  ],
];

const LANGUAGES: Array<[RegExp, string]> = [
  [/english|englisch|英语|英文/i, "English"],
  [/german\b|deutsch(?!land)|德语|德文/i, "German"],
  [/chinese|mandarin|chinesisch|中文|汉语|普通话/i, "Chinese"],
  [/french|französisch|法语/i, "French"],
  [/spanish|spanisch|西班牙语/i, "Spanish"],
  [/arabic|arabisch|阿拉伯语/i, "Arabic"],
  [/turkish|türkisch|土耳其语/i, "Turkish"],
];

const LANG_TRIGGER =
  "languages?|sprachen|sprachkenntnisse|kenntnisse|语言|speak|speaks|spoke|fluent|fluency|proficien\\w*|native|mother tongue|muttersprache|spreche|sprechen|会说|母语|流利|熟练";
const LANG_LEVEL =
  "native|fluent|muttersprache|母语|流利|熟练|\\b[abc][12]\\b|basic|intermediate|advanced|grundkenntnisse|fließend|verhandlungssicher";

/** A language counts as a skill only when stated as one ("Languages: German (native)", "I speak English"), not because a word like "Deutschland" appears. */
function languagesFromText(text: string): string[] {
  return LANGUAGES.filter(([re]) => {
    const l = re.source;
    const skill = new RegExp(`(?:${LANG_TRIGGER})[^.]{0,80}?(?:${l})|(?:${l})[^.,;\\n]{0,25}?(?:${LANG_LEVEL})`, "i");
    return skill.test(text);
  }).map(([, name]) => name);
}

/*
  Evidence patterns. Sensitive attributes (religion, party, union) and "first generation" are only accepted when the
  text DECLARES them ("I am Catholic", "member of the SPD", "Mitglied der Gewerkschaft"), never because a word merely
  appears ("volunteered at a Catholic hospital", "tutored Muslim refugee children").
*/
const FILLER = String.raw`(?:(?:a|an|the|practicing|practising|devout|committed|active|believing|proud|roman|praktizierende[rn]?|gläubige[rn]?|ein|eine|einen)\s+){0,3}`;
const FAITH_WORDS: Record<"catholic" | "protestant" | "jewish" | "muslim", string> = {
  catholic: "catholic|katholi\\w*|天主教\\w*",
  protestant: "protestant\\w*|evangelical|evangelisch\\w*|lutheran|lutheraner\\w*|新教\\w*|基督新教",
  jewish: "jewish|jüdisch\\w*|jude|jüdin|犹太\\w*",
  muslim: "muslim\\w*|islam\\w*|穆斯林|伊斯兰\\w*",
};
const faithDeclared = (words: string) =>
  new RegExp(
    `(?:\\bi am|\\bi'm|\\bi’m|\\bas an?|\\bbeing an?|\\bmy faith is|\\bmy religion is|\\breligion\\s*[:：-]?|\\bfaith\\s*[:：-]?|\\bconfession\\s*[:：-]?|\\bkonfession\\s*[:：-]?|\\bbekenntnis\\s*[:：-]?|\\bich bin|\\bbin|我是|我的信仰是|信仰|宗教\\s*[:：]?)\\s*${FILLER}(?:${words})` +
      `|(?:member of|mitglied (?:der|einer|in der|im)|engagiert in)\\s+(?:the |a |der |einer |die )?[\\w ]{0,25}?(?:${words})[\\w ]{0,15}?(?:church|community|congregation|parish|student|kirche|gemeinde|studierendengemeinde|hochschulgemeinde)`,
    "i",
  );

const OTHER_FAITH =
  "buddhis\\w*|hindu\\w*|sikh\\w*|orthodox|baha\\w*|atheis\\w*|agnostic\\w*|konfessionslos|佛教\\w*|印度教\\w*|无神论\\w*";

const PARTIES: Record<"spd" | "fdp" | "csu" | "greens" | "cdu" | "linke", string> = {
  spd: "spd|social democrat\\w*|sozialdemokrat\\w*|jusos|社民党?",
  fdp: "fdp|free democrat\\w*|freie demokraten|julis|自民党?",
  csu: "csu|基社盟",
  greens: "green party|die grünen|bündnis 90|grüne jugend|\\bgrüne\\b|greens|绿党",
  cdu: "cdu|christian democrat\\w*|christdemokrat\\w*|junge union|rcds|基民盟",
  linke: "die linke|left party|linkspartei|linksjugend|左翼党",
};
const partyDeclared = (words: string) =>
  new RegExp(
    `(?:member|mitglied|supporter|support|supporting|close to|nahe|nahestehend|affiliated|joined|beigetreten|active in|aktiv (?:bei|in)|engagiert (?:bei|in)|党员|成员|支持|加入)[^.\\n;]{0,40}?(?:${words})` +
      `|(?:${words})[- ]?(?:member|mitglied|youth|jugend|hochschulgruppe|党员|成员)`,
    "i",
  );

const UNION_DECLARED =
  /union member|member of (?:a |the |my )?(?:trade )?union|gewerkschaftsmitglied|mitglied (?:der|einer|in der|bei der) gewerkschaft|mitglied (?:bei|in) (?:verdi|ig metall|der gew)|(?:dgb|verdi|ig metall)[- ]?mitglied|工会会员|加入(?:了)?工会/i;

const FIRST_GEN_EVIDENCE =
  /first[- ]generation|first in my family|first (?:person|one) in (?:my|the) family|first to (?:attend|go to|study at) (?:university|college)|(?:my )?parents? (?:did ?n[o']t|did not|never|have not|haven't) (?:go|went|attend\w*|study|studied)|non-academic|no academic background|arbeiterkind|nicht-?akademisch|kein(?:e)? akademisch|erste[rn]? in meiner familie|第一代大学生|家里第一个|家中第一|非学术家庭/i;

/** Any mention of grades/results at all. Without one, no grade band can be claimed. */
const GRADE_CONTEXT =
  /grade|gpa|\bnote\b|noten|abschlussnote|durchschnitt|average|cum laude|honou?rs|distinction|first[- ]class|dean'?s list|top\s?\d+|class rank|rank(?:ed)?\b|sehr gut|\bgut\b|成绩|绩点|平均分|优秀|\b[1-4][.,]\d\b/i;

const PHASE_EVIDENCE: Record<NonNullable<Profile["phase"]>, RegExp> = {
  phd: /\b(?:ph\.?d|doctora\w*|dissertation|promotion|doktorand\w*)\b|博士/i,
  master: /\b(?:master\w*|m\.?sc|msc|m\.a\.|m\.eng)\b|硕士|研究生/i,
  bachelor: /\b(?:bachelor\w*|b\.?sc|bsc|b\.a\.|undergrad\w*)\b|本科|学士/i,
  "pre-university": /\b(?:abitur|high[- ]school|pre-?university|schüler\w*|gymnasium|a-levels?)\b|高中/i,
};

const GERMANY_EVIDENCE =
  /\bgermany\b|deutschland|berlin|münchen|munich|hamburg|köln|cologne|frankfurt|stuttgart|düsseldorf|dresden|leipzig|heidelberg|freiburg|\bbonn\b|aachen|karlsruhe|darmstadt|hannover|bremen|nürnberg|nuremberg|mannheim|münster|göttingen|tübingen|\bjena\b|konstanz|potsdam|technische universität|\buniversität|hochschule|fachhochschule|\bTU\b|\bLMU\b|\bRWTH\b|德国|柏林|慕尼黑|汉堡|斯图加特|亚琛/i;

export function heuristicProfile(text: string): Profile {
  const t = text.toLowerCase();
  const has = (re: RegExp) => re.test(t);

  let phase: Profile["phase"] = null;
  if (has(/\b(ph\.?d|doctora\w*|dissertation|promotion)\b|博士/)) phase = "phd";
  else if (has(/\b(master\w*|m\.?sc|msc|m\.a\.)\b|硕士|研究生/)) phase = "master";
  else if (has(/\b(bachelor\w*|b\.?sc|bsc|undergrad\w*)\b|本科/)) phase = "bachelor";
  else if (has(/\b(abitur|high[- ]school|pre-?university|schüler\w*|gymnasium)\b|高中/)) phase = "pre-university";

  let gradesBand: Profile["gradesBand"] = null;
  if (
    has(
      /top of (my|the) class|(?:excellent|outstanding|exceptional|top) (?:grades?|results?|marks?|academic|gpa|record|performance|degree)|(?:grades?|results?|gpa|average)[^.\n]{0,25}(?:excellent|outstanding)|summa cum|magna cum|straight a|first[- ]class|with distinction|dean'?s list|sehr gut|mit auszeichnung|\b1[.,][0-5]\b(?!\s?(?:years?|jahre\w*|monat\w*|months?|%|k\b|gb))|gpa (of )?(3\.[7-9]|4\.0)|优秀|top\s?\d+%|jahrgangsbest/,
    )
  )
    gradesBand = "excellent";
  else if (has(/\bgood grades|\bgut\b|\b2[.,][0-3]\b|成绩(良好|不错)/)) gradesBand = "good";

  let religion: Profile["religion"] = null;
  for (const [faith, words] of Object.entries(FAITH_WORDS) as Array<[keyof typeof FAITH_WORDS, string]>) {
    if (faithDeclared(words).test(text)) {
      religion = faith;
      break;
    }
  }

  if (!religion && faithDeclared(OTHER_FAITH).test(text)) religion = "other";

  let politicalAffinity: Profile["politicalAffinity"] = null;
  for (const [party, words] of Object.entries(PARTIES) as Array<[keyof typeof PARTIES, string]>) {
    if (partyDeclared(words).test(text)) {
      politicalAffinity = party;
      break;
    }
  }

  const firstGeneration = FIRST_GEN_EVIDENCE.test(text) ? true : null;
  const unionMember = UNION_DECLARED.test(text) ? true : null;

  const fieldHit = FIELDS.find(([re]) => re.test(text));
  const languageSkills = languagesFromText(text);

  return {
    phase,
    fieldOfStudy: fieldHit ? fieldHit[1] : null,
    gradesBand,
    firstGeneration,
    topics: topicsFromText(text),
    religion,
    politicalAffinity,
    unionMember,
    languageSkills,
    goals: null,
    countryOfStudy: GERMANY_EVIDENCE.test(text) ? "Germany" : null,
  };
}

/** Coerces whatever the model returned into a valid Profile (unknown values become null). */
export function normalizeProfile(raw: unknown): Profile {
  const parsed = ProfileSchema.safeParse(raw);
  if (parsed.success) return parsed.data;

  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | null =>
    typeof v === "string" && (allowed as readonly string[]).includes(v.toLowerCase()) ? (v.toLowerCase() as T) : null;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const bool = (v: unknown) => (typeof v === "boolean" ? v : null);
  const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

  return {
    phase: pick(r.phase, ["bachelor", "master", "phd", "pre-university"] as const),
    fieldOfStudy: str(r.fieldOfStudy),
    gradesBand: pick(r.gradesBand, ["excellent", "good", "average"] as const),
    firstGeneration: bool(r.firstGeneration),
    topics: strArr(r.topics).filter((x): x is Topic => (TOPICS as readonly string[]).includes(x)),
    religion: pick(r.religion, ["catholic", "protestant", "jewish", "muslim", "other"] as const),
    politicalAffinity: pick(r.politicalAffinity, ["spd", "fdp", "csu", "greens", "cdu", "linke"] as const),
    unionMember: bool(r.unionMember),
    languageSkills: strArr(r.languageSkills),
    goals: str(r.goals),
    countryOfStudy: str(r.countryOfStudy),
  };
}

/** LLM values win; the keyword heuristic fills anything the LLM left empty. */
export function mergeProfiles(llm: Profile, fallback: Profile): Profile {
  return {
    phase: llm.phase ?? fallback.phase,
    fieldOfStudy: llm.fieldOfStudy ?? fallback.fieldOfStudy,
    gradesBand: llm.gradesBand ?? fallback.gradesBand,
    firstGeneration: llm.firstGeneration ?? fallback.firstGeneration,
    topics: Array.from(new Set([...llm.topics, ...fallback.topics])),
    religion: llm.religion ?? fallback.religion,
    politicalAffinity: llm.politicalAffinity ?? fallback.politicalAffinity,
    unionMember: llm.unionMember ?? fallback.unionMember,
    languageSkills: Array.from(new Set([...llm.languageSkills, ...fallback.languageSkills])),
    goals: llm.goals ?? fallback.goals,
    countryOfStudy: llm.countryOfStudy ?? fallback.countryOfStudy,
  };
}

// ---------------------------------------------------------------------------------------------
// Grounding: nothing the AI says may enter the profile unless the user's own text supports it.
// ---------------------------------------------------------------------------------------------

const wordsOf = (value: string) => value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

/** True if enough of the value's words (or Chinese character pairs) actually occur in the source text. */
function groundedIn(value: string, source: string, ratio = 0.5): boolean {
  const src = source.toLowerCase();
  const cjk = (value.match(/[㐀-鿿]+/g) ?? []).join("");
  if (cjk.length >= 2) {
    const grams = Array.from({ length: cjk.length - 1 }, (_, i) => cjk.slice(i, i + 2));
    return grams.filter((g) => src.includes(g)).length / grams.length >= ratio;
  }
  const long = wordsOf(value).filter((w) => w.length >= 4);
  if (long.length === 0) {
    // very short values such as "PhD": must appear as a whole word
    return wordsOf(value).some(
      (w) => w.length >= 2 && new RegExp(`(?:^|[^\\p{L}\\p{N}])${w}(?:$|[^\\p{L}\\p{N}])`, "u").test(src),
    );
  }
  // compare word stems (first 6 letters) so "engineer" supports "engineering"
  return long.filter((w) => src.includes(w.slice(0, 6))).length / long.length >= ratio;
}

/**
 * Returns a copy of `profile` that contains only facts supported by `source` (the text the user wrote
 * and/or the text of their CV):
 * - religion, party, union and first-generation status are taken ONLY from explicit statements (the AI cannot add them)
 * - grade band needs a mention of grades/results; "excellent" additionally needs top-result evidence
 * - study level needs its own keyword in the text; field/goal/country/languages must be traceable to the text
 * - topics need keyword evidence
 * Anything unsupported becomes null / empty, so the UI shows "not mentioned" instead of a guess.
 */
export function verifyProfile(profile: Profile, source: string): Profile {
  const evidence = heuristicProfile(source);

  const phase = profile.phase && PHASE_EVIDENCE[profile.phase].test(source) ? profile.phase : evidence.phase;

  let gradesBand: Profile["gradesBand"] = null;
  if (GRADE_CONTEXT.test(source) && profile.gradesBand) {
    gradesBand =
      profile.gradesBand === "excellent" && evidence.gradesBand !== "excellent"
        ? evidence.gradesBand
        : profile.gradesBand;
  } else if (evidence.gradesBand) {
    gradesBand = evidence.gradesBand;
  }

  const supportedTopics = new Set(evidence.topics);
  const topics = Array.from(new Set([...profile.topics.filter((t) => supportedTopics.has(t)), ...evidence.topics]));

  const fieldOfStudy =
    profile.fieldOfStudy && groundedIn(profile.fieldOfStudy, source) ? profile.fieldOfStudy : evidence.fieldOfStudy;

  const goals = profile.goals && groundedIn(profile.goals, source) ? profile.goals : null;

  // The AI's country only survives if the text supports it; otherwise use the country the text itself points to.
  const claimedCountry = profile.countryOfStudy;
  const supportedCountry =
    claimedCountry && !/german|deutschland/i.test(claimedCountry) && groundedIn(claimedCountry, source, 1)
      ? claimedCountry
      : null;
  const countryOfStudy = supportedCountry ?? evidence.countryOfStudy;

  // The model may name languages in the text's own language ("Deutsch", "英语"): normalise to one canonical name first.
  const canonicalLanguage = (l: string) => LANGUAGES.find(([re]) => re.test(l))?.[1] ?? l;
  const stated = new Set(evidence.languageSkills);
  const languageSkills = Array.from(
    new Set([
      ...profile.languageSkills
        .map(canonicalLanguage)
        .filter((l) => (LANGUAGES.some(([, n]) => n === l) ? stated.has(l) : groundedIn(l, source, 1))),
      ...evidence.languageSkills,
    ]),
  );

  return {
    phase,
    fieldOfStudy,
    gradesBand,
    firstGeneration: evidence.firstGeneration, // explicit statements only
    topics,
    religion: evidence.religion, // explicit statements only
    politicalAffinity: evidence.politicalAffinity, // explicit statements only
    unionMember: evidence.unionMember, // explicit statements only
    languageSkills,
    goals,
    countryOfStudy,
  };
}
