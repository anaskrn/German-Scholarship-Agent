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
  ],
  politics: ["politic", "policy", "government", "politik", "politisch", "政治", "政策"],
  democracy: ["democra", "human rights", "civic", "demokratie", "menschenrecht", "民主", "人权"],
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
  ],
  education: ["education", "teaching", "teacher", "school", "bildung", "lehr", "schule", "教育", "教学"],
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
  [/software|computer science|informatik|computer|计算机|软件/i, "Computer Science"],
  [/electrical|mechanical|civil|engineering|ingenieur|工程/i, "Engineering"],
  [/renewable|energy|environmental|climate|umwelt|能源|环境/i, "Environmental / Energy"],
  [/econom|business|finance|management|wirtschaft|经济|金融|管理/i, "Economics / Business"],
  [/law|jura|rechtswissenschaft|法学|法律/i, "Law"],
  [/medic|medizin|nursing|医学/i, "Medicine"],
  [
    /physics|chemistry|biology|mathematics|maths|physik|chemie|biologie|mathematik|物理|化学|生物|数学/i,
    "Natural Sciences",
  ],
  [/politic|sociolog|political science|politik|soziologie|政治|社会学/i, "Social Sciences"],
  [/history|philosoph|literature|linguistic|geschichte|philosophie|literatur|历史|哲学|文学/i, "Humanities"],
  [/education|pedagog|lehramt|教育/i, "Education"],
  [/art|design|music|architecture|kunst|musik|architektur|艺术|设计|音乐|建筑/i, "Arts / Design"],
];

const LANGUAGES: Array<[RegExp, string]> = [
  [/english|englisch|英语|英文/i, "English"],
  [/german|deutsch|德语|德文/i, "German"],
  [/chinese|mandarin|chinesisch|中文|汉语|普通话/i, "Chinese"],
  [/french|französisch|法语/i, "French"],
  [/spanish|spanisch|西班牙语/i, "Spanish"],
  [/arabic|arabisch|阿拉伯语/i, "Arabic"],
  [/turkish|türkisch|土耳其语/i, "Turkish"],
];

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
      /top of (my|the) class|excellent|outstanding|summa cum|straight a|sehr gut|\b1[.,][0-3]\b|gpa (of )?(3\.[7-9]|4\.0)|优秀|top\s?\d+%|jahrgangsbest/,
    )
  )
    gradesBand = "excellent";
  else if (has(/\bgood grades|\bgut\b|\b2[.,][0-3]\b|成绩(良好|不错)/)) gradesBand = "good";

  let religion: Profile["religion"] = null;
  if (has(/catholic|katholi|天主教/)) religion = "catholic";
  else if (has(/protestant|evangelisch|evangelical|lutheran|新教/)) religion = "protestant";
  else if (has(/jewish|jüdisch|犹太/)) religion = "jewish";
  else if (has(/muslim|islam|穆斯林|伊斯兰/)) religion = "muslim";

  let politicalAffinity: Profile["politicalAffinity"] = null;
  if (has(/\bspd\b|social democrat|sozialdemokrat|社民/)) politicalAffinity = "spd";
  else if (has(/\bfdp\b|free democrat|freie demokraten|自民/)) politicalAffinity = "fdp";
  else if (has(/\bcsu\b|基社盟/)) politicalAffinity = "csu";
  else if (has(/green party|die grünen|bündnis 90|\bgrüne\b|绿党/)) politicalAffinity = "greens";
  else if (has(/\bcdu\b|christian democrat|christdemokrat|基民盟/)) politicalAffinity = "cdu";
  else if (has(/die linke|left party|linkspartei|左翼党/)) politicalAffinity = "linke";

  const firstGeneration = has(
    /first[- ]generation|first in my family|non-academic|arbeiterkind|nicht-?akademisch|第一代大学生|家里第一个/,
  )
    ? true
    : null;
  const unionMember = has(/union member|gewerkschaftsmitglied|member of (a |the )?union|工会会员/) ? true : null;

  const fieldHit = FIELDS.find(([re]) => re.test(text));
  const languageSkills = LANGUAGES.filter(([re]) => re.test(text)).map(([, name]) => name);

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
    countryOfStudy: has(/germany|deutschland|berlin|munich|münchen|hamburg|德国|柏林|慕尼黑/) ? "Germany" : null,
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
