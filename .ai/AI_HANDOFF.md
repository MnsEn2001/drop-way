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

## Continue-with prompts
- If the task is incomplete, leave a clear next step in this file or in `.ai/tasks/active/`.
- Do not invent completed work.
- Do not leave stale SHAs in handoff notes.
