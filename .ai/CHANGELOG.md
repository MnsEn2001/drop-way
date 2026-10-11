# .ai/CHANGELOG.md

This document records meaningful project and documentation changes for the DropWay repository.

## 2026-10-11
- Created the `.ai/` documentation system for the real DropWay repository.
- Created:
  - `.ai/AI_RULES.md`
  - `.ai/AI_HANDOFF.md`
  - `.ai/PROJECT_CONTEXT.md`
  - `.ai/ARCHITECTURE.md`
  - `.ai/WORKFLOW.md`
  - `.ai/CURRENT_STATE.md`
  - `.ai/CHANGELOG.md`
  - `.ai/tasks/README.md`
  - `.ai/tasks/TASK_TEMPLATE.md`
  - `.ai/tasks/active/`
  - `.ai/decisions/README.md`
  - `.ai/decisions/ADR_TEMPLATE.md`
  - `.ai/reports/README.md`
- Added a small `.ai/` reference section to the root `README.md`.

## 2026-10-11 (this session)
- Verified existing `.ai/` documentation against the repository and the current remote state.
- Reused existing `.ai/` files where appropriate instead of recreating duplicates.
- Updated `.ai/CURRENT_STATE.md` to reflect the actual verified GitHub `main` SHA and prior commit status.
- Confirmed that no application code, dependencies, lockfiles, authentication, database schemas, routes, or business logic were changed.

## 2026-10-11 (Phase 1 UI foundation)
- Implemented and pushed Part 1 of the UI improvement plan to `main`:
  - Shared neutral/teal UI foundation in `src/app/globals.css`
  - Mobile-first typography, focus states, safe-area spacing, and component
    helpers (`.btn`, `.input`, `.card`, `.chip`, `.modal-sheet`)
  - Responsive navigation improvements in `src/components/Navbar.tsx`
    (larger touch targets, active-route state, accessible names, drawer
    close via button/backdrop, dialog semantics)
  - Typed Next.js `viewport` configuration in `src/app/layout.tsx` plus a
    narrowly scoped `.zoom-pinch-ok` (`touch-action: manipulation`) guard
- Added `.env` to `.gitignore` so local environment files cannot be committed.
- Verified with `next lint` and `next build` (both passed) and a managed
  preview render of `/login`.

## 2026-10-11 (Part 1.1 UI hardening)
- Commit `1ce2443` fixes Phase 1 regressions across `src/app/globals.css`,
  `src/app/layout.tsx`, and `src/components/Navbar.tsx`:
  - removed the invalid `/menu` navigation target (the menu tab opens the drawer)
  - replaced invalid `pb calc(...)` utility strings with the shared
    `--mobile-nav-height` token (`mobile-bottom-nav` / `mobile-nav-inner`)
  - single mobile bottom bar for loading, signed-in, and signed-out states
  - drawer escape/backdrop/close handling plus focus management and dialog
    semantics; decorative icons marked `aria-hidden="true"`
  - typed viewport gains `viewportFit: "cover"` for safe-area support
  - removed unused `.chip`, `.share-sheet`, `.picker-sheet` CSS and a
    duplicated focus selector
- Verified with `next lint` and `next build` (both passed) and HTTP 200
  rendering of `/login`, `/register`, `/houses`, `/navigation` in the
  managed preview. Real-device zoom/gesture checks remain NOT VERIFIED.

## 2026-10-11 (mandatory push policy)
- `.ai/AI_RULES.md` now requires committing and pushing finished work to
  `main` using the documented procedure (standing authorization).
- Documented the verified push procedure in `.ai/AI_HANDOFF.md` and
  `.ai/WORKFLOW.md`, including what must never be pushed.

## Notes on scope
- Do not add entries here for routine checkpoints unless the change is meaningful to an agent resuming work later.
