import { useSyncExternalStore } from "react";

/** Below this width the fluid mobile layout is used; above it the scaled 1440x900 desktop canvas. */
export const MOBILE_QUERY = "(max-width: 899px)";

/** True on phones and small tablets. Matches the `mobile:` Tailwind variant in globals.css. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(MOBILE_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false, // server render: desktop
  );
}
