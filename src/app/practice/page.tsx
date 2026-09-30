"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { practiceGuard } from "@/lib/guards";
import { getScholarshipById } from "@/lib/matching";
import { useAppStore } from "@/lib/store";

// The voice SDK is only loaded for this screen (and only in the browser).
const PracticeScreen = dynamic(() => import("@/components/practice/PracticeScreen").then((m) => m.PracticeScreen), {
  ssr: false,
});
const VoiceProvider = dynamic(() => import("@/components/practice/VoiceProvider").then((m) => m.VoiceProvider), {
  ssr: false,
});

/** Step 4 (optional, BETA): interview practice. Only reachable from the workspace button. */
export default function PracticePage() {
  const router = useRouter();
  const hydrated = useAppStore((s) => s.hydrated);
  const hasProfile = useAppStore((s) => s.profile !== null && s.matches.length > 0);
  const scholarshipId = useAppStore((s) => s.practiceScholarshipId);
  const scholarship = scholarshipId ? getScholarshipById(scholarshipId) : undefined;

  const guard = practiceGuard({ hydrated, hasProfile, scholarshipId, scholarshipExists: Boolean(scholarship) });
  useEffect(() => {
    if (typeof guard === "object") router.replace(guard.redirect);
  }, [guard, router]);

  if (guard !== "ok" || !scholarship) return null;
  return (
    <VoiceProvider>
      <PracticeScreen scholarship={scholarship} />
    </VoiceProvider>
  );
}
