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

## 2026-10-12 (full-system audit + UI/UX redesign)
- Full audit and UI/UX redesign of every route and shared component (see
  `.ai/reports/2026-10-12-dropway-ui-ux-redesign-audit.md` for evidence):
  - token-based design system in `src/app/globals.css` + `tailwind.config.ts`
    (teal/neutral palette, `.btn`/`.icon-btn`/`.input`/`.card`/`.modal-sheet`/
    `.badge*`/`.page-title`/`.empty-state`/`.error-state`/`.skeleton`)
  - app shell, Thai toast durations, and long-copy wrapping in `src/app/layout.tsx`
  - single consistent mobile navigation (top header + bottom bar + drawer with
    dialog semantics) in `src/components/Navbar.tsx`
  - `/login` and `/register` rebuilt around labels, inline errors,
    duplicate-submit guards and per-request loading states, with new
    `src/lib/authMessages.ts` for readable Thai auth errors
  - `/houses`: single shared loader (removing a duplicated Supabase paging loop),
    wired error + retry, skeleton loading, empty state, long-address wrapping,
    grouped add/edit form, and an in-app delete confirmation replacing `confirm()`
  - `/navigation`: GPS status + retry shortcut, per-action submitting states,
    `try/finally` around the report save, guarded localStorage toggle,
    labelled primary action per card, and unified modal surfaces
- Behaviour intentionally preserved: Supabase queries/schema/RLS, auth rules,
  route ordering and distance math, financial parsing, `delivery_status` values.
- Verified: `git diff --check`, `npx tsc --noEmit`, `npm run lint`, `npm run build`
  all pass. No automated tests exist in the repository (NOT RUN).
- Pushed to `main` as `89cd5011428fb4a95e22662ed2f295569e2d98a8`
  (`f3ab31d..89cd501`), confirmed with `git ls-remote --heads origin main` and
  the GitHub API. Production deployment for this SHA completed successfully
  (GitHub deployment created 2026-10-12T00:51:36Z, `state=success`).

## 2026-10-12 (one-handed navigation rail, hand mode, keyboard fix)
- Navigation page rebuilt for one-handed use (report:
  `.ai/reports/2026-10-12-dropway-one-handed-navigation-rail.md`):
  - card actions moved out of the bottom row into a vertical, icon-only
    `.action-rail` on the side (44px targets, `aria-label` + `title` on every
    button, teal/neutral/amber/red by meaning, delete separated at the rail end)
  - left/right hand switch in the page header, default right hand, persisted in
    `localStorage["navigationActionRailSide"]` with the project's guarded pattern
  - every `autoFocus` removed (6 in navigation, 1 in houses) and focus now
    returns to the button that opened a dialog, so dialogs never raise the
    on-screen keyboard by themselves
  - dialog panels use `.modal-sheet` with
    `max-height: min(85dvh, var(--app-vvh) * 0.85)` (80vh fallback) and sticky
    `.modal-foot` rows so save/cancel stay reachable
  - new `src/lib/viewport.ts` publishes the visible viewport height with proper
    listener cleanup; `.page-shell` gives `100dvh` + fallback
  - no changes to Supabase queries, status values, money parsing, distance math
    or auth; the only new persisted key is the hand-mode preference
- Verified: `git diff --check`, `npx tsc --noEmit`, `npm run lint`, `npm run build`
  (9/9 pages), `/navigation` + `/houses` + `/login` + `/register` HTTP 200 in the
  managed preview, `.action-rail`/`.modal-foot` present in the compiled CSS and
  the rail markup present in the built client chunk.
- Pushed to `main` as `3c240d0e77805c82c76e4808505e302cd361c371`
  (`bf4ef5c..3c240d0`), plus the dialog follow-up
  `b11c2a76b5ce82b473800372090ee7b82a085304` (`5e430f9..b11c2a7`); both confirmed
  with `git ls-remote --heads origin main` and the GitHub API. GitHub reports
  Production deployments for `3c240d0` (2026-10-12T01:15:30Z) and `b11c2a7`
  (2026-10-12T01:22:28Z), both `state=success`.
- Follow-up in the same session: the two "ไปที่หน้า" dialogs now also use
  `.modal-sheet` with a sticky `.modal-foot`, and every dialog in the navigation
  page (8) exposes `role="dialog"` + `aria-modal="true"`, matching the houses
  dialogs. Re-verified with `git diff --check`, `npx tsc --noEmit`,
  `npm run lint` and `npm run build`.
- Interaction checks on a real device/browser remain NOT VERIFIED (no browser or
  session in this environment).

## 2026-10-12 (houses navigate button balance + navigation card data colors)
- UI polish only (report:
  `.ai/reports/2026-10-12-dropway-card-button-and-data-color-polish.md`):
  - the "นำทาง" card button in `src/app/houses/page.tsx` no longer stretches
    with `flex-1` and is no longer filled primary; it is now
    `btn btn-secondary ml-auto` — content-width (~110px), anchored right next
    to the 44px delete/edit icon buttons, still ≥44px via `.btn` min sizes;
    `openNavigation()` and the Google Maps URL are untouched
  - navigation cards (one shared render, so all four tabs are consistent) now
    color-code data by type: recipient name (`full_name`) `orange-700`, phone
    + call icon `blue-700`/`blue-600`, address + MapPin `teal-800`/`teal-600`,
    "หมายเหตุ:" label + note `amber-700`/`amber-900`, "คนขับบันทึก:" label +
    `driver_note` `purple-700`/`purple-900`
  - delivered/money pills, report pills, badges, distance, timestamps and the
    action rail keep their original semantic colors; no database text, note
    format, status, or money rule changed — the whole diff is 10 className
    lines across 2 files
- Verified: `git diff --check`, `npx tsc --noEmit`, `npm run lint`, `npm run
  build` (9/9 pages), `/login` `/register` `/houses` `/navigation` HTTP 200 in
  the managed preview, and all eight new utility classes present in the
  compiled CSS + client chunks. (Running `next build` while the dev server was
  up briefly 500'd `/login` `/register` via webpack cache corruption;
  `freebuff-preview restart` restored 200 — environment, not code.)
- Pushed to `main` as `1fe54494a4031bab611767324e7f2d303162e401`
  (`992e02d..1fe5449`), confirmed with `git ls-remote --heads origin main`,
  `git rev-parse HEAD` and the GitHub API. Visual/device verification remains
  NOT VERIFIED (no browser or test session in this environment).

## Notes on scope
- Do not add entries here for routine checkpoints unless the change is meaningful to an agent resuming work later.
