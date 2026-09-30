"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useIsMobile } from "@/lib/useMobile";
import { Nav } from "./Nav";

const DESIGN_W = 1440;
const DESIGN_H = 900;
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function Toast({ className }: { className: string }) {
  const toast = useAppStore((s) => s.toast);
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className={`glass glass-strong z-[70] text-[14px] font-medium text-ink ${className}`}
          style={{ borderRadius: 9999 }}
        >
          {toast}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Full-screen, never-scrolling app shell.
 * - Desktop: the UI is laid out at the 1440x900 design size and scaled uniformly to fit the window,
 *   so every screen fills the viewport exactly like the mockup.
 * - Mobile (< 900px): a fluid full-height column (nav + content). The page itself never scrolls;
 *   long screens scroll inside the content area.
 */
export function Stage({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [scale, setScale] = useState<number | null>(null);

  useIsoLayoutEffect(() => {
    const fit = () => setScale(Math.max(0.3, Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  if (isMobile) {
    return (
      <>
        <div className="atmosphere" aria-hidden />
        <div
          data-overlay-root
          className="fixed inset-0 z-10 flex flex-col overflow-hidden"
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <Nav />
          <main className="thin-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
            {children}
          </main>
          <Toast className="absolute bottom-6 left-4 right-4 px-5 py-3 text-center" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="atmosphere" aria-hidden />
      <div className="fixed inset-0 z-10 overflow-hidden">
        <div
          className="stage"
          data-overlay-root
          style={{
            transform: `translate(-50%, -50%) scale(${scale ?? 1})`,
            visibility: scale === null ? "hidden" : "visible",
          }}
        >
          <Nav />
          <main className="absolute left-[120px] top-[96px] h-[780px] w-[1200px]">{children}</main>
          <Toast className="absolute bottom-6 left-1/2 -translate-x-1/2 px-5 py-3" />
        </div>
      </div>
    </>
  );
}
