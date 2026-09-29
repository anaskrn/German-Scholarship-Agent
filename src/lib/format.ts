import { Translations } from "./i18n";
import { Lang, Scholarship } from "./schema";

/** Localized label for a document key from the dataset ("CV", "motivation letter", ...). */
export function docLabel(t: Translations, key: string): string {
  return t.workspace.docs[key.toLowerCase()] ?? key;
}

export function docKey(key: string): string {
  return key.toLowerCase();
}

export function deadlineLabel(t: Translations, label: string): string {
  return t.deadlineLabels[label.toLowerCase()] ?? label;
}

/** Returns a formatted date only if it is still in the future; stale dates are never shown as if current. */
export function upcomingDate(date: string | null, lang: Lang): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime()) || d.getTime() < Date.now()) return null;
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : lang, { dateStyle: "medium" }).format(d);
}

export function formatVerified(date: string, lang: Lang): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : lang, { dateStyle: "medium" }).format(d);
}

export function scholarshipText(s: Scholarship, lang: Lang) {
  return s.text[lang];
}

export function localizedName(s: Scholarship, lang: Lang): string {
  return s.displayName[lang] ?? s.displayName.en;
}
