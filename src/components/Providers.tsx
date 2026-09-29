"use client";

import { MotionConfig } from "framer-motion";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Stage } from "./Stage";

export function Providers({ children }: { children: React.ReactNode }) {
  const lang = useAppStore((s) => s.lang);

  // Restore saved state from localStorage after mount (keeps server and first client render identical).
  useEffect(() => {
    void useAppStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-Hans" : lang;
  }, [lang]);

  return (
    <MotionConfig reducedMotion="user">
      <Stage>{children}</Stage>
    </MotionConfig>
  );
}
