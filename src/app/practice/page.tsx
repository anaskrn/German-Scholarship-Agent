"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { practiceGuard } from "@/lib/guards";
import { getScholarshipById } from "@/lib/matching";
import { useAppStore, useT } from "@/lib/store";

/** Step 4 (optional, BETA): interview practice. Only reachable from the workspace button. */
export default function PracticePage() {
  const router = useRouter();
  const { t } = useT();
  const hydrated = useAppStore((s) => s.hydrated);
  const hasProfile = useAppStore((s) => s.profile !== null && s.matches.length > 0);
  const scholarshipId = useAppStore((s) => s.practiceScholarshipId);
  const scholarship = scholarshipId ? getScholarshipById(scholarshipId) : undefined;

  const guard = practiceGuard({ hydrated, hasProfile, scholarshipId, scholarshipExists: Boolean(scholarship) });
  useEffect(() => {
    if (typeof guard === "object") router.replace(guard.redirect);
  }, [guard, router]);

  if (guard !== "ok") return null;
  return <h1 className="font-display text-[36px] font-semibold">{t.workspace.practiceTitle}</h1>;
}
