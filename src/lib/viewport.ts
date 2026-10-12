"use client";

import { useEffect, useRef } from "react";

/**
 * Keeps `--app-vvh` (visible viewport height in px) on the document element so
 * dialogs can size themselves to the area that is actually visible when the
 * on-screen keyboard is open.
 *
 * When a dialog is open, also keeps `--app-vp-top` (the visual viewport offset
 * from the top of the layout viewport) so the dialog can be positioned relative
 * to the area that is actually visible, and lets callers ask the active input
 * to scroll into the visible area without jumping the whole dialog.
 *
 * Falls back to no-op when `window.visualViewport` is unavailable, and removes
 * the properties plus all listeners on unmount.
 */
export function useVisualViewportMetrics() {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!visualViewport) return;

    const root = document.documentElement;

    const apply = () => {
      root.style.setProperty(
        "--app-vvh",
        `${Math.round(visualViewport.height)}px`,
      );
      // Visual viewport offset is only meaningful relative to a known anchor
      // element, so the consumer that owns `overlayRef`/`sheetRef` is
      // responsible for reading these values while the dialog is open.
      root.style.setProperty(
        "--app-vp-top",
        `${Math.round(visualViewport.pageTop)}px`,
      );
      root.style.setProperty(
        "--app-vp-left",
        `${Math.round(visualViewport.pageLeft)}px`,
      );
    };

    apply();
    visualViewport.addEventListener("resize", apply);
    visualViewport.addEventListener("scroll", apply);

    return () => {
      visualViewport.removeEventListener("resize", apply);
      visualViewport.removeEventListener("scroll", apply);
      root.style.removeProperty("--app-vvh");
      root.style.removeProperty("--app-vp-top");
      root.style.removeProperty("--app-vp-left");
    };
  }, []);

  return {
    overlayRef,
    sheetRef,
    scrollActiveElementIntoVisible: (activeElement: Element) => {
      const sheet = sheetRef.current;
      if (!sheet || !visualViewport ||
          !sheet.contains(activeElement) ||
          !sheet.isConnected) return;

      // Only adjust if the active element is outside the visible part of the
      // sheet. Use the sheet's own scroll container, not the window, so the
      // dialog itself does not jump.
      const sheetRect = sheet.getBoundingClientRect();
      const elementRect = activeElement.getBoundingClientRect();
      const visibleTop = Math.max(
        sheetRect.top,
        visualViewport.pageTop,
      );
      const visibleBottom = Math.min(
        sheetRect.bottom,
        visualViewport.pageTop + visualViewport.height,
      );

      if (elementRect.top < visibleTop) {
        sheet.scrollTop -= visibleTop - elementRect.top + 4;
      } else if (elementRect.bottom > visibleBottom) {
        sheet.scrollTop += elementRect.bottom - visibleBottom + 4;
      }
    },
  };
}

/**
 * Thin wrapper kept so existing call sites that import
 * `useVisualViewportHeightVar` keep compiling while this library is consolidated
 * onto `useVisualViewportMetrics`.
 *
 * This hook does not do anything new: the dialog positioning and active-field
 * scroll-to-view behavior now live entirely in `useVisualViewportMetrics` and
 * the local dialog lifecycle in `src/app/navigation/page.tsx`.
 */
export function useVisualViewportHeightVar() {
  useVisualViewportMetrics();
}

export type VisualViewportMetrics = ReturnType<typeof useVisualViewportMetrics>;
