"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Nav } from "./Nav";

const DESIGN_W = 1440;
const DESIGN_H = 900;
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Full-screen, never-scrolling canvas. The whole UI is laid out at the 1440x900 design size
 * and scaled uniformly to fit the window, so every screen fills the viewport exactly
 * like the mockup, on any screen size.
 */
export function Stage({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState<number | null>(null);
  const toast = useAppStore((s) => s.toast);

  useIsoLayoutEffect(() => {
    const fit = () => setScale(Math.max(0.3, Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <>
      <div className="atmosphere" aria-hidden />
      <div className="fixed inset-0 z-10 overflow-hidden">
        <div
          className="stage"
          style={{
            transform: `translate(-50%, -50%) scale(${scale ?? 1})`,
            visibility: scale === null ? "hidden" : "visible",
          }}
        >
          <Nav />
          <main className="absolute left-[120px] top-[96px] h-[780px] w-[1200px]">{children}</main>

          <AnimatePresence>
            {toast && (
              <motion.div
                key={toast}
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="glass glass-strong absolute bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-full px-5 py-3 text-[14px] font-medium text-ink"
              >
                {toast}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
