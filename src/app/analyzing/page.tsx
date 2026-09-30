"use client";

import { Component, ReactNode, useSyncExternalStore } from "react";
import AnalyzingClassic from "@/components/analyzing/AnalyzingClassic";
import AnalyzingOrbit from "@/components/analyzing/AnalyzingOrbit";

/*
  Which loading screen is shown:
  - default: the orbit screen (live profile + matching picture)
  - NEXT_PUBLIC_ANALYZING_SCREEN=classic in .env.local switches everything back to the original spinner screen
  - ?loader=classic or ?loader=orbit in the URL overrides it for a single visit (handy for comparing)
  - if the orbit screen ever crashes, the classic screen takes over automatically
*/
const DEFAULT_SCREEN = process.env.NEXT_PUBLIC_ANALYZING_SCREEN === "classic" ? "classic" : "orbit";

function useLoaderVariant(): "orbit" | "classic" {
  const override = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("loader"),
    () => null,
  );
  return override === "classic" || override === "orbit" ? override : DEFAULT_SCREEN;
}

class OrbitBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error("Orbit loading screen failed, falling back to the classic screen:", error.message);
  }
  render() {
    return this.state.failed ? <AnalyzingClassic /> : this.props.children;
  }
}

export default function AnalyzingPage() {
  const variant = useLoaderVariant();
  if (variant === "classic") return <AnalyzingClassic />;
  return (
    <OrbitBoundary>
      <AnalyzingOrbit />
    </OrbitBoundary>
  );
}
