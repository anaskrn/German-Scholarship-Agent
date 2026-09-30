import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { translations } from "./i18n";
import { Lang, MatchResult, Profile } from "./schema";

export type DocStatus = "complete" | "in-progress" | "incomplete";

export interface Draft {
  /** null = use the localized default title */
  title: string | null;
  /** null = use the localized default salutation */
  salutation: string | null;
  body: string;
  savedAt: number | null;
}

interface AppState {
  hydrated: boolean;

  lang: Lang;
  setLang: (lang: Lang) => void;

  rawInput: string;
  setRawInput: (text: string) => void;

  /** Text extracted from an attached PDF CV (kept in this browser only). */
  cv: { name: string; text: string; pages: number } | null;
  setCv: (cv: AppState["cv"]) => void;

  profile: Profile | null;
  matches: MatchResult[];
  /** LLM explanations for the top matches, in the language they were written in. */
  explanations: { lang: Lang; byId: Record<string, string> } | null;
  /** true when the AI was unavailable and template explanations are shown */
  aiDegraded: boolean;
  setAnalysis: (a: Pick<AppState, "profile" | "matches" | "explanations" | "aiDegraded">) => void;
  setExplanations: (explanations: AppState["explanations"], degraded: boolean) => void;

  docStatus: Record<string, Record<string, DocStatus>>;
  setDocStatus: (scholarshipId: string, docKey: string, status: DocStatus) => void;

  drafts: Record<string, Draft>;
  updateDraft: (scholarshipId: string, patch: Partial<Omit<Draft, "savedAt">>) => void;

  toast: string | null;
  showToast: (message: string) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hydrated: false,

      lang: "en",
      setLang: (lang) => set({ lang }),

      rawInput: "",
      setRawInput: (rawInput) => set({ rawInput }),

      cv: null,
      setCv: (cv) => set({ cv }),

      profile: null,
      matches: [],
      explanations: null,
      aiDegraded: false,
      setAnalysis: ({ profile, matches, explanations, aiDegraded }) =>
        set({ profile, matches, explanations, aiDegraded }),
      setExplanations: (explanations, aiDegraded) => set({ explanations, aiDegraded }),

      docStatus: {},
      setDocStatus: (id, docKey, status) =>
        set((s) => ({ docStatus: { ...s.docStatus, [id]: { ...s.docStatus[id], [docKey]: status } } })),

      drafts: {},
      updateDraft: (id, patch) =>
        set((s) => {
          const current = s.drafts[id] ?? { title: null, salutation: null, body: "", savedAt: null };
          return { drafts: { ...s.drafts, [id]: { ...current, ...patch, savedAt: Date.now() } } };
        }),

      toast: null,
      showToast: (toast) => {
        clearTimeout(toastTimer);
        set({ toast });
        toastTimer = setTimeout(() => set({ toast: null }), 3600);
      },
    }),
    {
      name: "scholarpath-v1",
      storage: createJSONStorage(() => localStorage),
      // Everything stays in this browser (no server-side storage of profile or drafts).
      partialize: (s) => ({
        lang: s.lang,
        rawInput: s.rawInput,
        cv: s.cv,
        profile: s.profile,
        matches: s.matches,
        explanations: s.explanations,
        aiDegraded: s.aiDegraded,
        docStatus: s.docStatus,
        drafts: s.drafts,
      }),
      // Hydrate after mount (see Providers) so server and first client render match.
      skipHydration: true,
      onRehydrateStorage: () => () => useAppStore.setState({ hydrated: true }),
    },
  ),
);

/** Current language + its dictionary. */
export function useT() {
  const lang = useAppStore((s) => s.lang);
  return { lang, t: translations[lang] };
}
