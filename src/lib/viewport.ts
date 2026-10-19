"use client";

import { useEffect } from "react";

/** Safe margin (px) kept between the focused field and the keyboard edge. */
const VISIBLE_EDGE_MARGIN = 20;

/**
 * Keeps the visual-viewport CSS variables on the document element so dialogs
 * and floating controls can size/position themselves against the area that is
 * actually visible when the on-screen keyboard is open:
 *
 * - `--app-vvh`: `visualViewport.height`
 * - `--app-vp-top`: `visualViewport.offsetTop` (offset of the visible area
 *   inside the layout viewport) — `.modal-overlay` uses it so a dialog opens
 *   in the visible area even when the keyboard is already open
 * - `--app-vp-left`: `visualViewport.offsetLeft`
 * - `--app-kb-inset`: how much of the layout viewport sits below/behind the
 *   keyboard (`innerHeight - offsetTop - height`) — floating actions use it so
 *   they are never buried under the keyboard
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
      const height = Math.round(visualViewport.height);
      const offsetTop = Math.round(visualViewport.offsetTop);

      root.style.setProperty("--app-vvh", `${height}px`);
      root.style.setProperty("--app-vp-top", `${offsetTop}px`);
      root.style.setProperty(
        "--app-vp-left",
        `${Math.round(visualViewport.offsetLeft)}px`,
      );
      root.style.setProperty(
        "--app-kb-inset",
        `${Math.max(0, Math.round(window.innerHeight - offsetTop - height))}px`,
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
      root.style.removeProperty("--app-kb-inset");
    };
  }, []);
}

function getOwningSheet(element: Element | null): HTMLElement | null {
  if (!element || !element.isConnected) return null;
  const sheet = element.closest<HTMLElement>(".modal-sheet");
  if (!sheet || !sheet.classList.contains("modal-sheet")) return null;
  return sheet;
}

const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

/** True only for fields that can open the on-screen keyboard. */
function isEditable(element: HTMLElement): boolean {
  if (element.isContentEditable) return true;

  const tag = element.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;

  const type = (element as HTMLInputElement).type.toLowerCase();
  return !NON_TEXT_INPUT_TYPES.has(type);
}

/**
 * The element that actually scrolls inside a dialog. Split dialogs (fixed
 * header + scrolling content + fixed footer) mark their content area with
 * `data-modal-scroll`; every other dialog keeps scrolling on the sheet itself.
 */
function getScrollContainer(sheet: HTMLElement): HTMLElement {
  return sheet.querySelector<HTMLElement>("[data-modal-scroll]") ?? sheet;
}

/**
 * Releases the keyboard held by a field that is not part of the dialog that
 * just opened.
 *
 * On mobile, tapping a dialog trigger does not necessarily blur the field that
 * is already focused behind it (tapping a button is not a focus change on iOS
 * Safari), so the keyboard could stay open and keep the visible viewport
 * short. Blurring that single element at the moment a `.modal-sheet` is
 * inserted closes the keyboard before the dialog settles, without touching
 * focus anywhere else. Nothing is ever focused programmatically, so the
 * "the keyboard only opens when the user taps a field" rule and accessibility
 * stay intact.
 */
function releaseBackgroundKeyboard(sheet: Element) {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return;
  if (!isEditable(active)) return;
  if (sheet.contains(active)) return;
  active.blur();
}

/**
 * Single shared modal keyboard behavior for every dialog in the app
 * (houses page + navigation page).
 *
 * What it does while a `.modal-sheet` dialog is open:
 *
 * 1. Keeps the dialog inside the visible area. `.modal-overlay` is sized from
 *    the visual-viewport variables (see `useVisualViewportMetrics`), so a
 *    dialog opened while the keyboard is already open is laid out in the
 *    visible area from its very first frame — it can never be pushed below the
 *    keyboard, and the keyboard resize cannot push it down either.
 * 2. Follows the focused field. On `focusin`, and again on every
 *    `visualViewport` resize/scroll (keyboard animation, scrolling the visual
 *    viewport), the focused input/textarea/select is brought into the visible
 *    area with a 20px safe margin.
 * 3. Scrolls only the dialog's own container (the `[data-modal-scroll]`
 *    content area when the dialog has a fixed header/footer, otherwise the
 *    sheet). Every adjustment is done through that element's `scrollTop` —
 *    never `window.scrollTo`, never `scrollIntoView()`, never a page-level
 *    scroll — so the page behind never jumps, header/footer stay put and only
 *    the content moves.
 *
 * It is delegated from `document`/`visualViewport`, so every modal on both
 * pages gets identical behavior without duplicating logic per dialog.
 */
export function useModalKeyboardBehavior() {
  // Keep the visual-viewport CSS variables (`--app-vvh` etc.) in sync.
  useVisualViewportMetrics();

  useEffect(() => {
    const visualViewport = window.visualViewport;

    // Scrolls the focused field into the *visible* part of the viewport by
    // moving only the dialog's scroll container.
    const ensureFocusedFieldVisible = () => {
      if (!visualViewport) return;

      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return;
      if (!isEditable(active)) return;

      const sheet = getOwningSheet(active);
      if (!sheet) return;

      const scroller = getScrollContainer(sheet);
      if (scroller.scrollHeight <= scroller.clientHeight) return; // nothing to scroll

      // Layout-viewport coordinates: the dialog is fixed, so compare the
      // scroller's rect against the visual viewport offset inside the layout
      // viewport.
      const scrollerRect = scroller.getBoundingClientRect();
      const visibleTop = Math.max(scrollerRect.top, visualViewport.offsetTop);
      const visibleBottom = Math.min(
        scrollerRect.bottom,
        visualViewport.offsetTop + visualViewport.height,
      );
      if (visibleBottom <= visibleTop) return; // keyboard covers the whole area

      const elementRect = active.getBoundingClientRect();
      let delta = 0;
      if (elementRect.bottom > visibleBottom - VISIBLE_EDGE_MARGIN) {
        delta = elementRect.bottom - (visibleBottom - VISIBLE_EDGE_MARGIN);
      } else if (elementRect.top < visibleTop + VISIBLE_EDGE_MARGIN) {
        delta = -((visibleTop + VISIBLE_EDGE_MARGIN) - elementRect.top);
      }
      if (delta === 0) return;

      const maxScroll = scroller.scrollHeight - scroller.clientHeight;
      scroller.scrollTop = Math.min(
        Math.max(0, scroller.scrollTop + delta),
        Math.max(0, maxScroll),
      );
    };

    let frame: number | null = null;
    const pendingTimeouts: number[] = [];

    const scheduleEnsureVisible = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        ensureFocusedFieldVisible();
      });
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!getOwningSheet(target)) return;

      scheduleEnsureVisible();
      // Android Chrome animates the keyboard in over a few hundred ms and
      // keeps firing visual-viewport resizes; retry twice so the field ends
      // up fully above the keyboard without the user dragging the dialog.
      pendingTimeouts.push(window.setTimeout(scheduleEnsureVisible, 250));
      pendingTimeouts.push(window.setTimeout(scheduleEnsureVisible, 600));
    };

    // When a dialog opens, release any keyboard that belongs to a field
    // outside it (see `releaseBackgroundKeyboard`).
    const sheetObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (!(node instanceof Element)) continue;
          const sheet = node.matches(".modal-sheet")
            ? node
            : node.querySelector(".modal-sheet");
          if (!sheet) continue;
          releaseBackgroundKeyboard(sheet);
          return;
        }
      }
    });
    sheetObserver.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("focusin", handleFocusIn, true);
    if (visualViewport) {
      visualViewport.addEventListener("resize", scheduleEnsureVisible);
      visualViewport.addEventListener("scroll", scheduleEnsureVisible);
    }

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      pendingTimeouts.forEach((timeout) => window.clearTimeout(timeout));
      sheetObserver.disconnect();
      document.removeEventListener("focusin", handleFocusIn, true);
      if (visualViewport) {
        visualViewport.removeEventListener("resize", scheduleEnsureVisible);
        visualViewport.removeEventListener("scroll", scheduleEnsureVisible);
      }
    };
  }, []);
}
