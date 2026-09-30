"use client";

import { Check } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { LANGS, Lang } from "@/lib/schema";
import { useAppStore, useT } from "@/lib/store";

const LANG_LABEL: Record<Lang, string> = { en: "EN", de: "DE", zh: "中文" };

/** Which step is current, and which are done, for the current route. */
function stepState(pathname: string): { active: number; done: number[] } {
  if (pathname.startsWith("/workspace")) return { active: 2, done: [0, 1] };
  if (pathname.startsWith("/analyzing") || pathname.startsWith("/matches")) return { active: 1, done: [0] };
  return { active: 0, done: [] };
}

export function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const { t, lang } = useT();
  const setLang = useAppStore((s) => s.setLang);
  const showToast = useAppStore((s) => s.showToast);
  const matches = useAppStore((s) => s.matches);
  const hasMatches = matches.length > 0;

  const { active, done } = stepState(pathname);
  const steps = [t.nav.describe, t.nav.matches, t.nav.apply];

  const goToStep = (i: number) => {
    if (i === 0) return router.push("/");
    if (!hasMatches) return showToast(t.nav.locked);
    if (i === 1) return router.push("/matches");
    // Apply: continue with the best match (or the one already open)
    if (!pathname.startsWith("/workspace")) router.push(`/workspace/${matches[0].scholarshipId}`);
  };

  return (
    <header className="absolute left-[120px] top-6 z-50 w-[1200px]">
      <nav className="glass grid h-[60px] grid-cols-[1fr_auto_1fr] items-center rounded-[30px] px-[21px]">
        {/* Left: logo + wordmark */}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex w-fit items-center gap-[10px]"
          aria-label="ScholarPath"
        >
          <span
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] font-display text-[15px] font-semibold text-white"
            style={{ background: "var(--brand-gradient)" }}
          >
            S
          </span>
          <span className="font-display text-[19px] font-semibold tracking-[-0.01em] text-ink">ScholarPath</span>
        </button>

        {/* Center: step indicator (exactly centered) */}
        <ol className="flex items-center" aria-label={t.nav.stepsLabel}>
          {steps.map((label, i) => {
            const isActive = i === active;
            const isDone = done.includes(i);
            const locked = i > 0 && !hasMatches;
            return (
              <li key={i} className="flex items-center">
                {i > 0 && (
                  <span
                    aria-hidden
                    className="mx-1 h-[2px] w-7 rounded-full"
                    style={{
                      background: done.includes(i - 1) ? "var(--brand-gradient)" : "rgba(184, 179, 204, 0.45)",
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => goToStep(i)}
                  aria-current={isActive ? "step" : undefined}
                  aria-disabled={locked || undefined}
                  className={`flex h-9 items-center gap-2 rounded-full px-3 text-[14px] transition-colors ${
                    isActive
                      ? "bg-white/90 font-semibold text-ink shadow-[0_4px_14px_-4px_rgba(75,47,168,0.22)]"
                      : `font-medium ${locked ? "cursor-default text-muted/70" : "text-muted hover:text-ink"}`
                  }`}
                >
                  <StepDot n={i + 1} state={isActive ? "active" : isDone ? "done" : "todo"} />
                  {label}
                </button>
              </li>
            );
          })}
        </ol>

        {/* Right: language toggle */}
        <div className="flex items-center justify-end gap-4">
          <div
            role="group"
            aria-label={t.nav.langLabel}
            className="flex h-[34px] items-center gap-[2px] rounded-full border border-white/80 bg-white/40 p-[3px]"
          >
            {LANGS.map((code) => (
              <button
                key={code}
                type="button"
                lang={code === "zh" ? "zh-Hans" : code}
                aria-pressed={lang === code}
                onClick={() => setLang(code)}
                className={`h-7 min-w-[41px] rounded-full px-2 text-[12px] transition-all ${
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
        className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-white"
        style={{ background: "var(--brand-gradient)" }}
      >
        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  return (
    <span
      className={`flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] font-semibold ${
        state === "active" ? "bg-ink text-white" : "border-[1.5px] border-neutral-line text-muted"
      }`}
    >
      {n}
    </span>
  );
}
