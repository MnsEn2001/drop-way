"use client";

import { useEffect } from "react";

/**
 * Keeps `--app-vvh` (visible viewport height in px) on the document element so
 * dialogs can size themselves to the area that is actually visible when the
 * on-screen keyboard is open.
 *
 * Falls back to no-op when `window.visualViewport` is unavailable, and removes
 * the property plus both listeners on unmount.
 */
export function useVisualViewportHeightVar() {
  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!visualViewport) return;

    const root = document.documentElement;
    const apply = () => {
      root.style.setProperty(
        "--app-vvh",
        `${Math.round(visualViewport.height)}px`,
      );
    };

    apply();
    visualViewport.addEventListener("resize", apply);
    visualViewport.addEventListener("scroll", apply);

    return () => {
      visualViewport.removeEventListener("resize", apply);
      visualViewport.removeEventListener("scroll", apply);
      root.style.removeProperty("--app-vvh");
    };
  }, []);
}
