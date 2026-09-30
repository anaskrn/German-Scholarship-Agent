export type PracticeGuard = "wait" | "ok" | { redirect: string };

/**
 * /practice is only reachable from the workspace button:
 * no profile -> landing, no chosen scholarship -> workspace (which continues with the best match).
 */
export function practiceGuard(state: {
  hydrated: boolean;
  hasProfile: boolean;
  scholarshipId: string | null;
  scholarshipExists: boolean;
}): PracticeGuard {
  if (!state.hydrated) return "wait";
  if (!state.hasProfile) return { redirect: "/" };
  if (!state.scholarshipId || !state.scholarshipExists) return { redirect: "/workspace" };
  return "ok";
}
