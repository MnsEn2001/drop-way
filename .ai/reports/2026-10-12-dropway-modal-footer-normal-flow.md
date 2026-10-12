# 2026-10-12 — DropWay: restore save/cancel modal footers to normal document flow

## Purpose of this verification
Restore the pre-refactor UI behaviour referenced by commit
`038a9f871bcdff6f6abc0f8265583e9171f4108c` for the edit-style modals: the
"บันทึก" / "ยกเลิก" buttons must be part of the modal's normal flow instead of a
floating/sticky footer that followed the viewport and overlapped form text.

Explicitly out of scope: the project was **not** rolled back to that commit, and
no business logic (auth, Supabase, GPS, routing, delivery, money, save,
duplicate-submit, unsaved-change protection) was touched.

## Repository baseline before the change
- `git fetch origin main` → `origin/main` = `4750a6b4c858a7e5e31805382a4f1f05368033c5`
- `git rev-parse HEAD` → `4750a6b4c858a7e5e31805382a4f1f05368033c5`
- `git diff --stat origin/main` → empty (working tree clean for tracked files)

## Inspection performed
- Read `.ai/AI_RULES.md`, `.ai/AI_HANDOFF.md`, `.ai/CURRENT_STATE.md`,
  `.ai/WORKFLOW.md`.
- Read `src/app/globals.css` (modal section) and searched the repository for
  `.modal-overlay`, `.modal-sheet`, `.modal-foot`.
- Reference check against the old commit:
  `git show 038a9f8:src/app/globals.css` contains **no** `.modal-foot` rule at
  all — its `.modal-sheet` was `border-radius: 1rem 1rem 0 0`,
  `max-height: 85vh`, `overflow-y: auto`, and every button row was plain
  in-flow markup.
- Inventoried every `.modal-foot` call site:
  - `src/app/navigation/page.tsx`: lines 2667 (page input), 2725 (restricted
    changes confirm), 2775 (unsaved changes confirm), 3031 (filter), 3268 (edit
    house), 3661 (deliver), 3767 (comment), 4084 (report)
  - `src/app/houses/page.tsx`: lines 1351, 1497, 1702
  - All ten are plain `<div className="modal-foot flex gap-3">` wrappers. The
    floating behaviour came only from the shared `.modal-foot` rule, so no JSX
    change was needed anywhere.
- `grep -rn "sticky|bottom-0"` over both pages, `globals.css`, and
  `src/components/` → the only modal-related hit was the `.modal-foot` rule
  itself; `src/app/globals.css:122` (`.mobile-top-header`) and
  `src/components/Navbar.tsx:296` (drawer sheet) are unrelated.

## What was changed
`src/app/globals.css` only — the `.modal-foot` component rule:

Removed:
- `position: sticky`
- `bottom: 0`
- `z-index: 1`
- `background: var(--background)` (no longer needed: the footer sits in flow
  inside a sheet that already has the same background)
- `padding-bottom: 0.5rem` (the sheet's own `p-5` / `p-6` provides the bottom
  spacing)

Kept:
- `margin-top: 1rem`, `padding-top: 0.75rem`, `border-top: 1px solid var(--border)`
  so the footer still reads as a separated action row inside the normal flow.

Resulting rule:
```css
.modal-foot {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
}
```

Untouched on purpose: `.modal-overlay` (`fixed; inset: 0; z-index: 50`),
`.modal-sheet` (`border-radius: 1rem`, `max-height: min(85dvh, --app-vvh * 0.85)`,
`overflow-y: auto`, `overscroll-behavior: contain`), the centered
`flex items-center justify-center p-4` overlays, all dialog
semantics/`aria-*`, `onMouseDown` preventDefault handling, the restricted /
unsaved confirmation flow (`setShowRestrictedConfirmModal`,
`setShowUnsavedChangesConfirmModal`), and the `--app-vvh` visual-viewport
keyboard handling in `src/lib/viewport.ts`.

## Commands actually run and their real results
- `npx tsc -b --noEmit` → exit 0, no output
- `npm run lint` (`next lint`) → exit 0, "✔ No ESLint warnings or errors"
- `npm run build` (`next build`) → exit 0, "✓ Compiled successfully", 9/9 static
  pages generated (`/`, `/_not-found`, `/houses`, `/login`, `/navigation`,
  `/register`)
- `git diff --check` → exit 0
- Compiled-CSS artifact check on the build output:
  `grep -o "\.modal-foot{[^}]*}" .next/static/css/*.css` →
  `.modal-foot{margin-top:1rem;padding-top:.75rem;border-top:1px solid var(--border)}`
  (no `position:sticky`, no `bottom:0`, no `z-index`, no background)
- `grep -o "position:sticky" .next/static/css/*.css` → only `.sticky` (Tailwind's
  unused utility class) and `.mobile-top-header`; **no modal footer is sticky**
- `grep -o "\.modal-sheet{[^}]*}" .next/static/css/*.css` → rounded `1rem` plus
  `max-height:min(85dvh,calc(var(--app-vvh, 100dvh) * .85));overflow-y:auto`
  (in-sheet scrolling preserved)
- `git diff --cached --check` before commit → exit 0

## Pass / partial / fail
- PASS: `npx tsc -b --noEmit`, `npm run lint`, `npm run build`,
  `git diff --check`, `git diff --cached --check`
- PASS: `.modal-foot` is in normal document flow in the built CSS; no
  `position: sticky` / `bottom: 0` / `z-index` / covering background remains
- PASS (static): modal scroll container intact and centered modal positioning
  unchanged
- NOT VERIFIED: every interactive step of the requested manual checklist —
  opening the edit modal, scrolling with many text lines, checking that the
  buttons do not overlap text, on-screen keyboard behaviour (modal not jumping,
  input visible, content scrolling), and the full cancel → dirty confirmation →
  "ไม่ปิด" keeps data → "ปิดทิ้ง" closes sequence. These need a signed-in browser
  session or a real device; this environment has neither.

## Limitations / cautions to report forward
- Real device (Android Chrome / iOS Safari) keyboard and safe-area behaviour is
  still unverified. The keyboard solution remains `--app-vvh` +
  `scrollActiveElementIntoVisible` in `src/lib/viewport.ts` and is deliberately
  independent of the footer layout.
- No automated tests exist in this repository, so this change is covered only by
  type-check, lint, production build, and static CSS inspection.
- Removing the sticky footer means short-viewport users must scroll to reach
  save/cancel; that is the requested behaviour, not a regression.

## Summary
One CSS rule in `src/app/globals.css` restored the save/cancel footers to the
normal flow described by commit `038a9f8`. Type-check, lint, production build,
and diff checks all pass, and the compiled stylesheet proves no modal footer is
sticky. Committed and pushed as `cbab19d4c8181cec008f1a2e1723d212a7d24158`
(remote `refs/heads/main` verified equal to local `HEAD`).
