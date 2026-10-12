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

## Current open items (as of 2026-10-12)
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

## Continue-with prompts
- If the task is incomplete, leave a clear next step in this file or in `.ai/tasks/active/`.
- Do not invent completed work.
- Do not leave stale SHAs in handoff notes.
