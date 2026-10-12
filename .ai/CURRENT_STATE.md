# .ai/CURRENT_STATE.md

This is a factual snapshot of the repository and the documentation effort that created this `.ai/` system.

## Repository identity
- URL: `https://github.com/MnsEn2001/drop-way.git`
- Default branch: `main`

## Latest verified GitHub `main` SHA
- Before the 2026-10-12 redesign session: `f3ab31d18c5b16ffb93e0af500046fcc18fa9758`
- Redesign commit pushed and verified: `89cd5011428fb4a95e22662ed2f295569e2d98a8`
- Before the 2026-10-12 one-handed navigation session:
  `bf4ef5c6c36e93127869f84bcf0e151ae1409503`
- One-handed navigation commit pushed and verified:
  `3c240d0e77805c82c76e4808505e302cd361c371`
- Follow-up (page-number dialogs + dialog semantics) pushed and verified:
  `b11c2a76b5ce82b473800372090ee7b82a085304`
- 2026-10-12 card button + data-color polish pushed and verified:
  `1fe54494a4031bab611767324e7f2d303162e401` (from `992e02dbb4f1dba6311f76060a4c65b822001c3b`)
- 2026-10-12 modal centering on all breakpoints pushed and verified:
  `ddd5a940a668af99f48db22d56fc150f006b90fb` (from
  `a43d0547537730c2b891811de38b756cdb461b8e`)
- Latest verified GitHub `main`: `ddd5a940a668af99f48db22d56fc150f006b90fb`

## Latest verified full product audit
- `.ai/reports/2026-10-12-dropway-ui-ux-redesign-audit.md` (full-system audit)
- `.ai/reports/2026-10-12-dropway-one-handed-navigation-rail.md` (rail, hand mode,
  keyboard/dialog fixes)
- Result: PASS for `git diff --check`, `npx tsc --noEmit`, `npm run lint`,
  `npm run build`, and HTTP 200 on `/`, `/login`, `/register`, `/houses`,
  `/navigation` in the managed preview
- BLOCKED: Supabase RLS/ownership verification, CI/deployment status, and all
  interaction checks that need a signed-in browser session
- NOT VERIFIED: real-device mobile behaviour (keyboard, safe areas, landscape)
  and end-to-end Supabase workflows

## Houses card navigate button (2026-10-12)
- The card "นำทาง" button in `src/app/houses/page.tsx` no longer uses
  `flex-1` + filled primary; it is now `btn btn-secondary ml-auto`
  (content-width ~110px, anchored right, still ≥44px via `.btn` min sizes).
- `openNavigation()` and the Google Maps URL logic are untouched.

## Navigation card data colors (2026-10-12)
- One shared card render serves all four tabs (today / delivered / reported /
  QR-pending), so the semantic colors are consistent across every card+tab:
  - Recipient name (`full_name`, h3): `text-orange-700`
  - Phone (`phone`) + call icon: `text-blue-700` / `text-blue-600`
  - Address (`address`) + MapPin: `text-teal-800` / `text-teal-600`
  - "หมายเหตุ:" label + `note` content: `text-amber-700` / `text-amber-900`
  - "คนขับบันทึก:" label + `driver_note` content: `text-purple-700` /
    `text-purple-900`
- Status pills (delivered + money categories) and report pills keep their
  original semantic colors; no database text, note format, status, or
  money-splitting rule was changed.
- Report: `.ai/reports/2026-10-12-dropway-card-button-and-data-color-polish.md`

## Modal centering (2026-10-12)
- All 12 modals (8 in `src/app/navigation/page.tsx`, 4 in
  `src/app/houses/page.tsx`) use
  `modal-overlay flex items-center justify-center p-4` — centered on both
  axes at every breakpoint with 16px clearance on all edges. The old
  `items-end ... sm:items-center sm:p-4` (bottom-sheet on mobile,
  centered on sm+) is gone everywhere.
- `.modal-sheet` base in `globals.css`: `border-radius: 1rem` on all four
  corners at every breakpoint (was `1rem 1rem 0 0`), and the bottom
  `padding-bottom: env(safe-area-inset-bottom)` affordance was removed.
  The viewport-aware `max-height: min(85dvh, calc(var(--app-vvh, 100dvh) *
  0.85))`, `overflow-y: auto` and `overscroll-behavior: contain` are
  unchanged and now apply on every screen (per-sheet `sm:max-h-[90vh]`
  overrides removed from 7 sheets).
- The calculator sheet no longer has `overflow-hidden` (its keypad/close
  button could be clipped on short screens); its teal header carries
  `rounded-t-[1rem]` itself.
- Keyboard behaviour unchanged: no `autoFocus` anywhere,
  `useVisualViewportHeightVar()` still drives `--app-vvh` in both pages,
  focus restoration (`rememberDialogTrigger`) intact.
- Report: `.ai/reports/2026-10-12-dropway-centered-modals-all-breakpoints.md`

## Navigation UI (2026-10-12)
- Card actions live in a vertical icon-only rail (`src/app/globals.css` →
  `.action-rail`), 44px targets, `aria-label` on every button.
- Hand mode: header switch "มือขวา" / "มือซ้าย", default right, persisted as
  `localStorage["navigationActionRailSide"]` with try/catch.
- No `autoFocus` remains in `src/`; dialogs focus the trigger on close instead.
- Dialog sizing: `.modal-sheet` (`min(85dvh, --app-vvh * 0.85)`) + sticky
  `.modal-foot`; `--app-vvh` comes from `src/lib/viewport.ts`.
- Business logic, Supabase calls, statuses, money parsing and distance math were
  deliberately left untouched.

## Last verified full product audit
- `.ai/reports/2026-10-12-dropway-ui-ux-redesign-audit.md`
- Result: PASS for `git diff --check`, `npx tsc --noEmit`, `npm run lint`, `npm run build`
- BLOCKED: Supabase RLS/ownership verification, CI/deployment status
- NOT VERIFIED: real-device mobile behaviour and end-to-end Supabase workflows

## Local synchronization status
- Local branch: `main`
- Local `HEAD` SHA: `ddd5a940a668af99f48db22d56fc150f006b90fb` (matches
  `origin/main`, `git ls-remote`, and the GitHub API at verification time)
- Working tree status: only `package-lock.json` untracked (generated by `npm install` in the sandbox; not committed because the repository does not track a lockfile)
- Difference from `origin/main`: none
- Local state: synchronized with `origin/main` at the time of verification

## Last verification timestamp
- UTC: 2026-10-12 (modal centering session)

## Verified working features
- Repository identity and branch verification
- Existing `.ai/` documentation system present and reused where appropriate
- Root `README.md` integration with a links section pointing to `.ai/` docs
- Phase 1 UI foundation changes are merged into `main` (see below)

## Verified project facts used to write this documentation
- Next.js 14 App Router project
- Supabase browser client setup in `src/lib/supabase.ts`
- Middleware session check in `middleware.ts`
- Client-side session checks in `houses/page.tsx` and `navigation/page.tsx`
- House catalog and navigation pages as described in `.ai/ARCHITECTURE.md`

## Phase 1 UI foundation (merged to `main`)
- Commits now on `main`:
  - `393e795` Phase 1: UI foundation and mobile navigation base
  - `a738b7f` Phase 1: refine UI foundation, mobile navigation, and mobile zoom prevention
  - `5d17a84` Ignore local environment files to keep secrets out of git
- Changed files: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/Navbar.tsx`, `.gitignore`
- Mobile viewport configured through the typed Next.js `viewport` export:
  `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no`
- Mobile tap-zoom guard implemented as the narrowly scoped `.zoom-pinch-ok` class
  (`touch-action: manipulation`) plus the viewport config. No global touch-event
  interceptors and no `touch-action: none` on `html`/`body`.
- Verified: `next lint` passed, `next build` passed, `/login` rendered in the
  managed preview with the expected viewport meta. Real-device zoom behavior on
  Android Chrome / iOS Safari is NOT VERIFIED.

## Phase 1.1 UI hardening (merged to `main`)
- Commit `1ce2443` "fix: harden phase 1 mobile UX and navigation"
- Navbar corrections:
  - The mobile "เมนู" tab is a button that opens the drawer; the invalid
    `/menu` link (which returned 404) was removed.
  - One single mobile bottom bar serves loading, signed-in, and signed-out
    states; the loading shell is a link-free skeleton.
  - Drawer: `role="dialog"`, `aria-modal`, labelled, closes on Escape,
    backdrop click, and close button; focus enters the drawer on open and
    returns to the trigger on close.
  - Shared `--mobile-nav-height` token drives the bottom bar, the
    `.page-content` bottom padding, and `.modal-sheet` safe-area padding.
- Viewport: added `viewportFit: "cover"` to the typed Next.js viewport so
  `env(safe-area-inset-bottom)` is meaningful on iOS notch devices.
- Removed dead `.share-sheet`/`.picker-sheet`/`.chip` CSS and a duplicate
  `.btn:focus-visible` selector.
- Verified: `next lint` passed, `next build` passed, `/login`, `/register`,
  `/houses`, `/navigation` served HTTP 200 in the managed preview and the
  rendered HTML contains no `href="/menu"` and no `pb calc(...)` classes.

## Incomplete or broken functionality supported by evidence
- No test scripts or test files were found in the inspected repository.
- The route `/` redirects to `/houses`, so there is no dedicated public landing page beyond that redirect. This is factual, not necessarily a defect.
- The navigation page is large and was only partially inspected for this documentation pass. Some behavior in it may be partially implemented or unfinished. That should be verified before assuming it is complete.

## Known risks and security questions
- **`middleware.ts` is not active in this repository (verified 2026-10-12).**
  The file is in the repo root while the app lives in `src/app`, so Next.js never
  loads it: a cookie-less request to an unmatched path returns `404` instead of
  the matcher's `307` → `/login`, `/houses` returns `200` without cookies, and the
  production build route table lists no `Middleware` entry. Route protection is
  therefore client-side only and real data protection depends on Supabase RLS.
  The file also checks legacy `sb-access-token` / `sb-refresh-token` cookies while
  `@supabase/ssr` 0.8.0 writes `sb-<project-ref>-auth-token`, so simply moving the
  file would likely lock signed-in users out. Documented as its own task in
  `.ai/reports/2026-10-12-dropway-ui-ux-redesign-audit.md`; **not changed** by the
  redesign session because it alters authorization behaviour.
- Data operations are performed from the browser Supabase client. Any stronger ownership or row-level restrictions must be confirmed in Supabase RLS or backend enforcement, not assumed from the UI.
- The app does not currently show a dedicated API route tree in `src/app/api`. If server-side endpoints or actions exist elsewhere, they need separate verification.
- No test coverage is currently verified. That limits confidence for regressions.

## Checks actually executed and their results
- Repository identity check: passed
  - Remote URL confirmed
  - Branch confirmed
- `git diff --check`: passed
- `npm run lint`: passed ("No ESLint warnings or errors")
- `npm run build` (Next.js 14.2.15 production build): passed, 9/9 static pages generated
- Preview check: `/login` served 200 with the correct viewport meta
- Remote verification: `git ls-remote --heads origin main` matched local `HEAD`

## Lightweight code checks
- TypeScript type check: covered by the successful `next build` type validation step
- Lint: passed
- TypeScript-only `tsc -b --noEmit`: NOT RUN separately

## Current active task
- Phase 1 UI foundation, mobile navigation, and mobile zoom prevention — merged to `main`

## Next recommended task
- Continue with the next part of the product audit/upgrade plan
- Verify zoom behavior on real Android Chrome and iOS Safari devices (NOT VERIFIED so far)
- Optionally inspect the full navigation page and any unfinished UI paths before future feature work

## Commit status
- Phase 1, Phase 1.1, and the 2026-10-12 full-system capture are on `main`.
- Latest pushed commit before the redesign session:
  `f3ab31d18c5b16ffb93e0af500046fcc18fa9758`
- 2026-10-12 UI/UX redesign: `89cd5011428fb4a95e22662ed2f295569e2d98a8`,
  pushed to `main` and verified with `git ls-remote` and the GitHub API.
- Production deployment observed on GitHub for the redesign commit: created
  2026-10-12T00:51:36Z with `state=success` ("Deployment has completed").
  Runtime behaviour of that deployed build was not exercised in a browser here.
- The 2026-10-12 one-handed navigation work is pushed to `main` as
  `3c240d0e77805c82c76e4808505e302cd361c371` (`bf4ef5c..3c240d0`) and the dialog
  follow-up as `b11c2a76b5ce82b473800372090ee7b82a085304` (`5e430f9..b11c2a7`),
  both verified with `git ls-remote --heads origin main` and the GitHub API.
- GitHub Production deployments: `3c240d0` created 2026-10-12T01:15:30Z
  `state=success`; `5e430f9` created 2026-10-12T01:17:24Z; `b11c2a7` created
  2026-10-12T01:22:28Z with `state=success`; `992e02d` created 2026-10-12T01:24:50Z.
  The deployed builds were not exercised in a browser here.
- 2026-10-12 card button + data-color polish is pushed to `main` as
  `1fe54494a4031bab611767324e7f2d303162e401` (`992e02d..1fe5449`), verified
  with `git ls-remote --heads origin main`, `git rev-parse HEAD`, and the GitHub
  API `commits/main` endpoint — all three matched. A Production deployment for
  this SHA had not been recorded in the GitHub API at documentation time.
- 2026-10-12 modal centering is pushed to `main` as
  `ddd5a940a668af99f48db22d56fc150f006b90fb` (`a43d054..ddd5a94`), verified
  with `git ls-remote --heads origin main`, `git rev-parse HEAD`, and the GitHub
  API `commits/main` endpoint — all three matched. The latest Production
  deployment observed at documentation time was for `a43d054` (created
  2026-10-12T01:43:59Z); one for `ddd5a94` had not been recorded yet.
- `package-lock.json` is still untracked and out of scope.
