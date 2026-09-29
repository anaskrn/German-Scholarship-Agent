"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

/** /workspace without an id: continue with the best match, or start over. */
export default function WorkspaceIndex() {
  const router = useRouter();
  const hydrated = useAppStore((s) => s.hydrated);
  const best = useAppStore((s) => s.matches[0]?.scholarshipId);

  useEffect(() => {
    if (!hydrated) return;
    router.replace(best ? `/workspace/${best}` : "/");
  }, [hydrated, best, router]);

  return null;
}
