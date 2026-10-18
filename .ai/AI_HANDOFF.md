# .ai/AI_HANDOFF.md

A short, efficient starting guide for every new AI session in this repository.

## Start order
1. Verify the repository URL and default branch.
   - Expected: `https://github.com/MnsEn2001/drop-way.git`, branch `main`.
2. Check local branch, `HEAD`, working tree, and divergence from `origin/main`.
3. Read `.ai/AI_RULES.md`.
4. Read `.ai/CURRENT_STATE.md` and `.ai/PROJECT_CONTEXT.md`.
5. Read only the architecture sections and task documents relevant to the requested work.
6. Inspect the actual implementation before planning changes.
7. State the intended scope, affected files, risks, and verification plan.
8. Implement only the requested task.
9. Run relevant checks and review the diff.
10. Update the handoff and state documents as appropriate.
11. Report evidence, test results, remaining issues, and the exact resulting commit SHA if a commit was made.

## Local verification commands
- Confirm local repository identity:
  - `git remote get-url origin`
  - `git branch --show-current`
- Refresh and inspect synchronization state:
  - `git fetch origin main`
  - `git rev-parse origin/main`
  - `git rev-parse HEAD`
  - `git status --short`
  - `git diff --stat origin/main`
- Lightweight code checks, when relevant:
  - `bun tsc -b --noEmit`
  - `next lint` via `bun run lint`

If a command is unavailable in the current environment, say so explicitly instead of pretending it ran.

## Push procedure (use after every completed task)
This repository expects the completed work to be committed and pushed to `main`.
The verified procedure that has worked in this environment:

1. Verify remote state first:
   - `git fetch origin main`
   - `git rev-parse origin/main`
2. Check the working tree and stage only task files:
   - `git status --short`
   - `git add <only-the-files-of-this-task>`
   - `git diff --cached --check` (must pass; fix whitespace errors before committing)
3. Commit with a message describing why, ending with the Codebuff footer
   (`Co-Authored-By: Codebuff <noreply@codebuff.com>`).
4. Bring the work to `main` and fast-forward only:
   - `git checkout main`
   - `git pull origin main`
   - `git merge --ff-only <working-branch>` (or commit directly on `main` if that is the working branch)
5. Push and verify:
   - `git push origin main`
   - `git ls-remote --heads origin main` and compare with `git rev-parse HEAD` — the SHAs must match

Notes learned in this environment:
- Do not print or commit `.env` values; the repo `.gitignore` excludes local env files, and untracked env files must never be staged.
- Do not commit `package-lock.json` unless the repository decides to track a lockfile; it is currently untracked and out of task scope.
- If a staging command is rejected by the environment, run `git add` and `git commit` as separate commands.
- Never force-push; if the remote has diverged, stop and report.

## Important local facts
- Stack: Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase Auth via `@supabase/ssr`, browser Supabase client.
- Package manager in use: `npm`/`yarn`/`pnpm`/`bun` are all mentioned in `README.md`, but the authoritative scripts come from `package.json`.
- Relevant files for most tasks:
  - `src/middleware.ts`
  - `src/lib/supabase.ts`
  - `src/app/layout.tsx`
  - `src/app/page.tsx`
  - `src/app/login/page.tsx`
  - `src/app/register/page.tsx`
  - `src/app/houses/page.tsx`
  - `src/app/navigation/page.tsx`
  - `src/components/Navbar.tsx`
  - `src/types/house.ts`
  - `src/types/navigation.ts`

## What to read, and what not to read
- Read project context and current state first.
- For small UI/copy tasks, you usually do not need to read every app file.
- For auth, session, or data-access tasks, read middleware, the Supabase client, affected pages, and relevant types before touching anything.
- For new features, read existing routes and types first and confirm whether the feature already exists in some form.

## Before you start work
- Restate the task in your own words.
- List the files you expect to inspect and the files you expect to change.
- Note any assumptions that still need verification.
- If anything about auth, ownership, Supabase access, or deployment looks unclear, say so before making changes.

## After you finish work
- Summarize what changed and why.
- Include the evidence you checked.
- Include command results that were actually run.
- If a check could not run, say so and explain why.
- If the task changes project status, update `.ai/CURRENT_STATE.md` and `.ai/CHANGELOG.md`.
- Commit and push the finished work to `main` using the "Push procedure" above, then report the pushed commit SHA and the remote verification result.

## Current open items (as of 2026-10-18)
- Edit House modal (navigation) mobile layout (2026-10-18, do not regress):
  header `shrink-0`, one `data-modal-scroll` content area, footer `shrink-0`
  outside the scroller with safe-area padding, no X button, coordinate field
  keeps its `houseCoordsInput` text buffer, and the Google Maps button uses
  `lat != null && lng != null`. `saveHouse()`, `closeModal()`, the restricted
  confirmation dirty check, address autocomplete and `detectLocation()` must
  stay as they are. Only this modal uses the split structure. See
  `.ai/reports/2026-10-18-dropway-edit-house-modal-mobile-scroll.md`. Real
  phone/keyboard tapping is still NOT VERIFIED (no signed-in browser).
- Mobile UI rules now in force (2026-10-14, do not regress): the houses card
  footer order is **ลบ → นำทาง → แก้ไข** and the navigate button keeps
  `btn btn-secondary ml-auto` plus its `h.lat && h.lng` gate; the navigation
  page GPS row is one wrapping row (status badge → icon-only start-point button
  → icon-only hand-mode picker) where the left icon runs
  `changeHandMode("left")` and the right icon runs `changeHandMode("right")`,
  both 44×44 with `aria-pressed`; every navigation modal footer pair is
  `flex-1 py-3` with `btn btn-secondary` cancel + `btn btn-primary` confirm.
  See `.ai/reports/2026-10-14-dropway-mobile-card-buttons-and-navigation-controls.md`.
  Clicking these on a real phone is still NOT VERIFIED (no signed-in browser).
- House search + district rules (2026-10-13, do not regress): in
  `src/app/houses/page.tsx` the ranking is two separated bands — house numbers
  (`rankHouseNumberMatch`, read from `address` only) sit above text scores
  (`rankTextFields`, capped at `MAX_TEXT_SCORE`). Tiers are exact > subForm
  (`5` → `5/1`) > prefix (`5` → `55`) > contains ordered by fewer digits first.
  Filtering happens once (`matchesSearch`); `sortByRelevance` only sorts and is
  explicitly stable. The filter effect must keep the full pipeline in order:
  district/area → existing filters → text search → rank → paginate. Every
  filter state in the dependency array must actually be used in the effect
  body — a previous rewrite silently dropped them.
- District filtering is strict (`extractDistrict` reads `อ.<amphoe>` /
  `อำเภอ<amphoe>` from the address and compares with `===`; rows with no amphoe
  marker are never guessed into the selected district).
- **UNVERIFIED data assumption**: real `houses.address` rows are assumed to
  contain the amphoe marker. Confirm with a real query before trusting district
  filtering on production data — rows without the marker disappear when an
  amphoe is selected.
- **`middleware.ts` is never executed** (it sits outside `src/` and checks legacy
  Supabase cookie names). Verified finding, documented in
  `.ai/reports/2026-10-12-dropway-ui-ux-redesign-audit.md`. Treat as its own
  security task — do not bundle it into UI work.
- **Supabase RLS / ownership is still unverified** from this environment.
- **No automated tests exist.** Navigation-rail interaction checks (hand-mode
  persistence, keyboard behaviour on real phones, landscape/short screens) still
  need a signed-in browser or device run; they are listed as NOT VERIFIED in
  `.ai/reports/2026-10-12-dropway-one-handed-navigation-rail.md`.
- `package-lock.json` stays untracked — do not stage it.
- Navigation UI rules now in force: actions live in the vertical `.action-rail`
  (icon-only, 44px, `aria-label` required), hand mode is stored in
  `localStorage["navigationActionRailSide"]`, and no `autoFocus` is allowed on
  dialog inputs.
- Navigation card color scheme (2026-10-12, keep it consistent for future UI
  work): name `orange-700`, phone + call icon `blue-700`/`blue-600`, address +
  MapPin `teal-800`/`teal-600`, "หมายเหตุ" label + note
  `amber-700`/`amber-900`, "คนขับบันทึก" label + driver note
  `purple-700`/`purple-900`; status/money/report pills keep their original
  semantic colors. The houses card "นำทาง" button is deliberately
  `btn btn-secondary ml-auto` (not `flex-1`, not filled primary).
- Interaction/visual checks for these colors on real devices remain NOT
  VERIFIED (no browser or test account in this environment). See
  `.ai/reports/2026-10-12-dropway-card-button-and-data-color-polish.md`.
- Modal rules (2026-10-12, with one scoped 2026-10-18 exception): every modal
  overlay uses `modal-overlay flex items-center justify-center p-4` (centered
  on both axes at every breakpoint), `.modal-sheet` rounds all four corners and
  sizes to `min(85dvh, --app-vvh * 0.85)` with `overflow-y: auto`, and no modal
  may carry `overflow-hidden` unless its content is guaranteed to fit. See
  `.ai/reports/2026-10-12-dropway-centered-modals-all-breakpoints.md`.
  **Exception — navigation Edit House modal only** (2026-10-18): it is a split
  dialog (`items-end ... sm:items-center`, `flex h-full flex-col
  overflow-hidden p-0 sm:h-auto`, `shrink-0` header, one `data-modal-scroll
  min-h-0 flex-1 overflow-y-auto overscroll-contain` content area, and a
  `shrink-0` `.modal-foot` outside the scroller with safe-area bottom padding),
  because the user asked for a stable mobile modal where only content scrolls.
  Do not spread this structure to other modals without a request; see
  `.ai/reports/2026-10-18-dropway-edit-house-modal-mobile-scroll.md`.
- Modal footer rule (2026-10-12): `.modal-foot` must stay in the normal
  document flow (`margin-top`, `padding-top`, `border-top` only). Do **not**
  add `position: sticky`, `bottom: 0`, `z-index`, or an opaque background —
  save/cancel buttons must not float over form text or follow the viewport.
  Keyboard handling belongs to `--app-vvh` / `src/lib/viewport.ts`, never to
  the footer. See
  `.ai/reports/2026-10-12-dropway-modal-footer-normal-flow.md`.
- Modal dismissal + keyboard rule (2026-10-12, do not regress): modals close
  **only** through buttons inside the dialog — `.modal-overlay` divs must
  never carry an `onClick` that closes them, and there is no
  Escape-to-close anywhere. Dirty closes go through
  `setShowRestrictedConfirmModal` / `setShowUnsavedChangesConfirmModal`.
  All keyboard/viewport behavior lives in the single shared
  `useModalKeyboardBehavior()` hook (`src/lib/viewport.ts`), which pins the
  open sheet's top position and scrolls only that dialog's scroll container
  (`[data-modal-scroll]` when the sheet has a split header/content/footer,
  otherwise `sheet.scrollTop`); do not add a second keyboard system,
  `window.scrollTo`-based fixes, `scrollIntoView`, autofocus,
  `as unknown as` placeholder refs, or `setState` on visualViewport resize.
  Background lock is the `body.nav-dialog-open` class (`overflow: hidden`); do
  not reintroduce `position: fixed` on `.page-shell`. See
  `.ai/reports/2026-10-12-dropway-modal-keyboard-stability.md` and
  `.ai/reports/2026-10-18-dropway-edit-house-modal-mobile-scroll.md`.

## Continue-with prompts
- If the task is incomplete, leave a clear next step in this file or in `.ai/tasks/active/`.
- Do not invent completed work.
- Do not leave stale SHAs in handoff notes.
