"use client";

import { useEffect } from "react";

/** Safe margin (px) kept between the focused field and the keyboard edge. */
const VISIBLE_EDGE_MARGIN = 20;

/**
 * Keeps the visible-viewport CSS variables on the document element so dialogs
 * can size themselves to the area that is actually visible when the on-screen
 * keyboard is open:
 *
 * - `--app-vvh`: `visualViewport.height`
 * - `--app-vp-top`: `visualViewport.pageTop`
 * - `--app-vp-left`: `visualViewport.pageLeft`
 *
 * It only writes CSS custom properties (no React state), so viewport resize
 * never triggers a re-render and never recenters a dialog.
 *
 * Falls back to no-op when `window.visualViewport` is unavailable, and removes
 * the properties plus all listeners on unmount.
 */
export function useVisualViewportMetrics() {
  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!visualViewport) return;

    const root = document.documentElement;

    const apply = () => {
      root.style.setProperty(
        "--app-vvh",
        `${Math.round(visualViewport.height)}px`,
      );
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
}

function getOwningSheet(element: Element | null): HTMLElement | null {
  if (!element || !element.isConnected) return null;
  const sheet = element.closest<HTMLElement>(".modal-sheet");
  if (!sheet || !sheet.classList.contains("modal-sheet")) return null;
  return sheet;
}

function isEditable(element: HTMLElement): boolean {
  const tag = element.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") return true;
  return element.isContentEditable;
}

/**
 * Single shared modal keyboard behavior for every dialog in the app
 * (houses page + navigation page).
 *
 * What it does while a `.modal-sheet` dialog is open:
 *
 * 1. Locks the open-time position of the sheet. When the user focuses a field
 *    the on-screen keyboard shrinks the visual viewport, which used to make
 *    the flex-centered sheet re-center (jump). The sheet's current top offset
 *    is measured once and pinned with `align-self: flex-start` + `margin-top`,
 *    so the dialog keeps the exact position it had when the user touched the
 *    field, no matter how the viewport resizes afterwards.
 * 2. Follows the focused field. On `focusin`, and again on every
 *    `visualViewport` resize/scroll (keyboard animation, scrolling the visual
 *    viewport), the focused input/textarea/select is brought into the visible
 *    area with a 20px safe margin.
 * 3. Scrolls only the dialog's own container. Every adjustment is done through
 *    `sheet.scrollTop` — never `window.scrollTo`, never `scrollIntoView()`,
 *    never a page-level scroll — so the page behind never jumps and the
 *    dialog never moves.
 *
 * It is delegated from `document`/`visualViewport`, so every modal on both
 * pages gets identical behavior without duplicating logic per dialog, and it
 * never focuses anything itself: the keyboard only opens when the user taps a
 * field (no autofocus anywhere in the system).
 */
export function useModalKeyboardBehavior() {
  // Keep the visual-viewport CSS variables (`--app-vvh` etc.) in sync.
  useVisualViewportMetrics();

  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!visualViewport) return;

    let frame: number | null = null;
    const pendingTimeouts: number[] = [];

    // Pins the sheet to the top offset it had when the field was tapped, so
    // the keyboard resize can never recenter (and thus jump) the dialog.
    const pinSheet = (sheet: HTMLElement) => {
      if (sheet.dataset.vpPinned === "true") return;
      const overlay = sheet.parentElement;
      if (!overlay || !overlay.classList.contains("modal-overlay")) return;

      const overlayRect = overlay.getBoundingClientRect();
      const sheetRect = sheet.getBoundingClientRect();
      const paddingTop =
        window.parseFloat(window.getComputedStyle(overlay).paddingTop) || 0;
      const offset = Math.round(sheetRect.top - (overlayRect.top + paddingTop));

      sheet.style.alignSelf = "flex-start";
      sheet.style.marginTop = `${Math.max(0, offset)}px`;
      sheet.dataset.vpPinned = "true";
    };

    // Scrolls the focused field into the *visible* part of the viewport by
    // moving only the sheet's own scroll position.
    const ensureFocusedFieldVisible = () => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return;
      if (!isEditable(active)) return;

      const sheet = getOwningSheet(active);
      if (!sheet || sheet.dataset.vpPinned !== "true") return;
      if (sheet.scrollHeight <= sheet.clientHeight) return; // nothing to scroll

      // Layout-viewport coordinates: the sheet is fixed, so compare its rect
      // against the visual viewport offset inside the layout viewport.
      const visibleTop = Math.max(
        sheet.getBoundingClientRect().top,
        visualViewport.offsetTop,
      );
      const visibleBottom = Math.min(
        sheet.getBoundingClientRect().bottom,
        visualViewport.offsetTop + visualViewport.height,
      );
      if (visibleBottom <= visibleTop) return; // keyboard covers the whole sheet

      const elementRect = active.getBoundingClientRect();
      let delta = 0;
      if (elementRect.bottom > visibleBottom - VISIBLE_EDGE_MARGIN) {
        delta = elementRect.bottom - (visibleBottom - VISIBLE_EDGE_MARGIN);
      } else if (elementRect.top < visibleTop + VISIBLE_EDGE_MARGIN) {
        delta = -((visibleTop + VISIBLE_EDGE_MARGIN) - elementRect.top);
      }
      if (delta === 0) return;

      const maxScroll = sheet.scrollHeight - sheet.clientHeight;
      sheet.scrollTop = Math.min(
        Math.max(0, sheet.scrollTop + delta),
        Math.max(0, maxScroll),
      );
    };

    const scheduleEnsureVisible = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        ensureFocusedFieldVisible();
      });
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const sheet = getOwningSheet(target);
      if (!sheet) return;

      pinSheet(sheet);
      scheduleEnsureVisible();
      // Android Chrome animates the keyboard in over a few hundred ms and
      // keeps firing visual-viewport resizes; retry twice so the field ends
      // up fully above the keyboard without the user dragging the dialog.
      pendingTimeouts.push(window.setTimeout(scheduleEnsureVisible, 250));
      pendingTimeouts.push(window.setTimeout(scheduleEnsureVisible, 600));
    };

    document.addEventListener("focusin", handleFocusIn, true);
    visualViewport.addEventListener("resize", scheduleEnsureVisible);
    visualViewport.addEventListener("scroll", scheduleEnsureVisible);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      pendingTimeouts.forEach((timeout) => window.clearTimeout(timeout));
      document.removeEventListener("focusin", handleFocusIn, true);
      visualViewport.removeEventListener("resize", scheduleEnsureVisible);
      visualViewport.removeEventListener("scroll", scheduleEnsureVisible);
    };
  }, []);
}
