import { Translations } from "./i18n";
import { emptyProfile } from "./profile";
import { Profile } from "./schema";

/*
  Turns a (verified) Profile into what the loading screen shows. Everything on that screen comes from here,
  so it can only ever display facts that are really in the profile: nothing is invented for decoration.
*/

export const ROW_KEYS = ["level", "field", "background", "interests", "goal"] as const;
type RowKey = (typeof ROW_KEYS)[number];

export interface FactRow {
  key: RowKey;
  /** null = the profile has nothing for this row ("Not mentioned") */
  value: string | null;
}

interface Chip {
  text: string;
  /** index of the profile row this chip belongs to (chips appear when that row is done) */
  row: number;
}

const MAX_CHIP = 22;
const clip = (s: string, n = MAX_CHIP) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

function fieldLabel(field: string | null, t: Translations): string | null {
  if (!field) return null;
  return t.analyzing.orbit.fields[field.toLowerCase()] ?? field; // known canonical labels are translated, free text is shown as written
}
const languageLabel = (name: string, t: Translations) => t.analyzing.orbit.languages[name] ?? name;
const countryLabel = (name: string, t: Translations) => t.analyzing.orbit.countries[name] ?? name;

export function profileRows(profile: Profile, t: Translations): FactRow[] {
  const o = t.analyzing.orbit;
  const background = [
    profile.firstGeneration ? o.firstGenStudent : null,
    profile.gradesBand ? o.grades[profile.gradesBand] : null,
    profile.languageSkills.length
      ? profile.languageSkills
          .slice(0, 2)
          .map((l) => languageLabel(l, t))
          .join(", ")
      : null,
  ].filter((x): x is string => Boolean(x));

  return [
    { key: "level", value: profile.phase ? o.levels[profile.phase] : null },
    { key: "field", value: fieldLabel(profile.fieldOfStudy, t) },
    { key: "background", value: background.length ? background[0] : null },
    {
      key: "interests",
      value: profile.topics.length
        ? profile.topics
            .slice(0, 2)
            .map((x) => o.topicShort[x])
            .join(" · ")
        : null,
    },
    { key: "goal", value: profile.goals },
  ];
}

/**
 * Chips for the two inner rings. Inner ring (4 diagonal slots): who you are. Middle ring (4 slots): interests & skills.
 * A slot stays empty when the profile has nothing for it.
 */
export interface OrbitChips {
  inner: Array<Chip | null>; // top-left, top-right, bottom-left, bottom-right
  middle: Array<Chip | null>; // top, right, bottom, left
}

export function profileChips(profile: Profile, t: Translations): OrbitChips {
  const o = t.analyzing.orbit;
  const inner: Array<Chip | null> = [
    profile.phase ? { text: o.levels[profile.phase], row: 1 } : null,
    profile.fieldOfStudy ? { text: clip(fieldLabel(profile.fieldOfStudy, t) ?? ""), row: 2 } : null,
    profile.firstGeneration ? { text: o.firstGenChip, row: 3 } : null,
    profile.gradesBand ? { text: o.grades[profile.gradesBand], row: 3 } : null,
  ];

  const topics = profile.topics.map((x) => ({ text: o.topicShort[x], row: 4 }));
  const langs = profile.languageSkills.map((l) => ({ text: languageLabel(l, t), row: 3 }));
  const country = profile.countryOfStudy ? [{ text: countryLabel(profile.countryOfStudy, t), row: 5 }] : [];

  const middle: Array<Chip | null> = [null, null, null, null];
  middle[3] = langs.shift() ?? null; // left
  middle[0] = topics.shift() ?? null; // top
  middle[1] = topics.shift() ?? null; // right
  middle[2] = topics.shift() ?? langs.shift() ?? country.shift() ?? null; // bottom

  // anything left over fills free slots, so real facts are not hidden just because another kind is missing
  const leftovers = [...topics, ...langs, ...country];
  for (const ring of [middle, inner]) {
    for (let i = 0; i < ring.length && leftovers.length; i++) if (!ring[i]) ring[i] = leftovers.shift() ?? null;
  }
  return { inner, middle };
}

/** The profile as known after the first `done` rows have been read (drives the live scores while facts appear). */
export function partialProfile(profile: Profile, done: number): Profile {
  const p: Profile = { ...emptyProfile };
  if (done >= 1) p.phase = profile.phase;
  if (done >= 2) p.fieldOfStudy = profile.fieldOfStudy;
  if (done >= 3) {
    p.firstGeneration = profile.firstGeneration;
    p.gradesBand = profile.gradesBand;
    p.languageSkills = profile.languageSkills;
    // declared by the user; used for matching only, never displayed on this screen
    p.religion = profile.religion;
    p.politicalAffinity = profile.politicalAffinity;
    p.unionMember = profile.unionMember;
  }
  if (done >= 4) p.topics = profile.topics;
  if (done >= 5) {
    p.goals = profile.goals;
    p.countryOfStudy = profile.countryOfStudy;
  }
  return p;
}
