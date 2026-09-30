"use client";

import { Check } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { LANGS, Lang } from "@/lib/schema";
import { useAppStore, useT } from "@/lib/store";
import { useIsMobile } from "@/lib/useMobile";

const LANG_LABEL: Record<Lang, string> = { en: "EN", de: "DE", zh: "中文" };

/** Which step is current, and which are done, for the current route. Step 4 (Practice) is optional and beta. */
function stepState(pathname: string): { active: number; done: number[] } {
  if (pathname.startsWith("/practice")) return { active: 3, done: [0, 1, 2] };
  if (pathname.startsWith("/workspace")) return { active: 2, done: [0, 1] };
  if (pathname.startsWith("/analyzing") || pathname.startsWith("/matches")) return { active: 1, done: [0] };
  return { active: 0, done: [] };
}

export function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { t, lang } = useT();
  const setLang = useAppStore((s) => s.setLang);
  const showToast = useAppStore((s) => s.showToast);
  const matches = useAppStore((s) => s.matches);
  const practiceScholarshipId = useAppStore((s) => s.practiceScholarshipId);
  const hasMatches = matches.length > 0;

  const { active, done } = stepState(pathname);
  const steps = [t.nav.describe, t.nav.matches, t.nav.apply];
  const practiceActive = active === 3;

  const goToStep = (i: number) => {
    if (i === 0) return router.push("/");
    if (!hasMatches) return showToast(t.nav.locked);
    if (i === 1) return router.push("/matches");
    // Apply: continue with the best match (or the one the student was rehearsing for)
    if (!pathname.startsWith("/workspace"))
      router.push(`/workspace/${practiceScholarshipId ?? matches[0].scholarshipId}`);
  };

  return (
    <header className={isMobile ? "relative z-50 mx-3 mt-3 shrink-0" : "absolute left-[120px] top-6 z-50 w-[1200px]"}>
      <nav
        className={`glass items-center ${
          isMobile
            ? "flex h-[52px] justify-between gap-2 px-3"
            : "grid h-[60px] grid-cols-[1fr_auto_1fr] rounded-[30px] px-[21px]"
        }`}
        style={isMobile ? { borderRadius: 9999 } : undefined}
      >
        {/* Left: logo + wordmark */}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex w-fit shrink-0 items-center gap-[10px]"
          aria-label="ScholarPath"
        >
          <span
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] font-display text-[15px] font-semibold text-white"
            style={{ background: "var(--brand-gradient)" }}
          >
            S
          </span>
          <span
            className={`font-display text-[19px] font-semibold tracking-[-0.01em] text-ink ${isMobile ? "hidden min-[560px]:inline" : ""}`}
          >
            ScholarPath
          </span>
        </button>

        {/* Center: step indicator (exactly centered on desktop; labels collapse to the active one on mobile) */}
        <ol className="flex items-center" aria-label={t.nav.stepsLabel}>
          {steps.map((label, i) => {
            const isActive = i === active;
            const isDone = done.includes(i);
            const locked = i > 0 && !hasMatches;
            const compact = isMobile && !isActive;
            return (
              <li key={i} className="flex items-center">
                {i > 0 && (
                  <span
                    aria-hidden
                    className={`h-[2px] rounded-full ${isMobile ? "mx-0.5 w-2.5 max-[399px]:w-1.5" : "mx-1 w-[10px]"}`}
                    style={{
                      background: done.includes(i - 1) ? "var(--brand-gradient)" : "rgba(184, 179, 204, 0.45)",
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => goToStep(i)}
                  aria-label={label}
                  aria-current={isActive ? "step" : undefined}
                  aria-disabled={locked || undefined}
                  className={`flex h-9 items-center rounded-full text-[14px] transition-colors ${
                    compact
                      ? "w-8 justify-center max-[399px]:w-7"
                      : isMobile
                        ? "gap-1.5 px-2.5 max-[399px]:px-1.5"
                        : "gap-2 px-3"
                  } ${
                    isActive
                      ? "bg-white/90 font-semibold text-ink shadow-[0_4px_14px_-4px_rgba(75,47,168,0.22)]"
                      : `font-medium ${locked ? "cursor-default text-muted/70" : isDone ? "text-ink" : "text-muted hover:text-ink"}`
                  }`}
                >
                  <StepDot n={i + 1} state={isActive ? "active" : isDone ? "done" : "todo"} />
                  {/* Very narrow phones: the numbered dots alone show the step (the label stays as aria-label). */}
                  {!compact && <span className={isMobile ? "max-[399px]:hidden" : ""}>{label}</span>}
                </button>
              </li>
            );
          })}

          {/* Step 4: optional BETA step. Never clickable here: it is opened from the workspace button. */}
          <li className="flex items-center">
            <span
              aria-hidden
              className={`mx-1 flex items-center gap-[3px] ${isMobile ? "mx-0.5" : ""}`}
              data-testid="practice-connector"
            >
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className={`h-[2.5px] w-[2.5px] rounded-full ${practiceActive ? "bg-violet/90" : "bg-neutral-line"}`}
                />
              ))}
            </span>
            <span
              aria-label={`${t.nav.practice} (${t.nav.beta}). ${t.nav.practiceHint}`}
              aria-current={practiceActive ? "step" : undefined}
              aria-disabled="true"
              className={`flex h-9 items-center rounded-full text-[14px] ${
                !isMobile || practiceActive
                  ? isMobile
                    ? "gap-1.5 px-2.5 max-[399px]:px-1.5"
                    : "gap-2 px-3"
                  : "w-8 justify-center max-[399px]:w-7"
              } ${
                practiceActive
                  ? "bg-white/90 font-semibold text-ink shadow-[0_4px_14px_-4px_rgba(75,47,168,0.22)]"
                  : "cursor-default font-medium text-muted/75"
              }`}
            >
              <span
                aria-hidden
                className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  practiceActive
                    ? "bg-ink text-white"
                    : "border-[1.5px] border-dashed border-neutral-line text-muted/80"
                }`}
              >
                4
              </span>
              {(!isMobile || practiceActive) && (
                <span className={isMobile ? "max-[399px]:hidden" : ""}>{t.nav.practice}</span>
              )}
              {!isMobile && (
                <span
                  aria-hidden
                  className="rounded-md bg-violet/[0.12] px-[6px] py-[2px] text-[9px] font-semibold tracking-[0.1em] text-violet-dark"
                >
                  {t.nav.beta}
                </span>
              )}
            </span>
          </li>
        </ol>

        {/* Right: language toggle */}
        <div className="flex shrink-0 items-center justify-end gap-4">
          <div
            role="group"
            aria-label={t.nav.langLabel}
            className={`flex items-center gap-[2px] rounded-full border border-white/80 bg-white/40 p-[3px] ${isMobile ? "h-[32px]" : "h-[34px]"}`}
          >
            {LANGS.map((code) => (
              <button
                key={code}
                type="button"
                lang={code === "zh" ? "zh-Hans" : code}
                aria-pressed={lang === code}
                onClick={() => setLang(code)}
                className={`h-7 rounded-full text-[12px] transition-all ${isMobile ? "min-w-[30px] px-1.5 max-[399px]:min-w-[26px] max-[399px]:px-1" : "min-w-[41px] px-2"} ${
                  lang === code
                    ? "bg-white font-semibold text-ink shadow-[0_2px_8px_-2px_rgba(75,47,168,0.25)]"
                    : "font-medium text-muted hover:text-ink"
                }`}
              >
                {LANG_LABEL[code]}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}

function StepDot({ n, state }: { n: number; state: "active" | "done" | "todo" }) {
  if (state === "done") {
    return (
      <span
        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: "var(--brand-gradient)" }}
      >
        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  return (
    <span
      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
        state === "active" ? "bg-ink text-white" : "border-[1.5px] border-neutral-line text-muted"
      }`}
    >
      {n}
    </span>
  );
}
