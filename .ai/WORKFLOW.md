# .ai/WORKFLOW.md

This document records the verified development workflow for this repository.

## Repository identity and sync
Before working:
1. Confirm the remote:
   - `git remote get-url origin`
2. Confirm the active branch:
   - `git branch --show-current`
3. Refresh remote state:
   - `git fetch origin main`
4. Record SHAs:
   - `git rev-parse origin/main`
   - `git rev-parse HEAD`
5. Check working tree:
   - `git status --short`
   - `git diff --stat origin/main`

Expected remote and branch for this repository:
- Remote URL: `https://github.com/MnsEn2001/drop-way.git`
- Default branch: `main`

## Install command
The verified install command is the standard package-manager install for the lockfile in use.

If `package-lock.json` exists, use:
- `npm install`

If `pnpm-lock.yaml` exists, use:
- `pnpm install`

If `bun.lockb` or `bun.lock` exists, use:
- `bun install`

If `yarn.lock` exists, use:
- `yarn install`

If more than one lockfile is present, use the one that matches the project's established package manager. If there is no lockfile, use the install command for the package manager you are using and note that fact.

This repository's `package.json` references `npm`, `yarn`, `pnpm`, and `bun` in its README-style script comments, but the authoritative source is `package.json` and the lockfile used in the working tree.

## Development server
- `bun run dev`, or the equivalent `npm run dev`, `yarn dev`, or `pnpm dev`
- This runs `next dev`

## Linting
- `bun run lint`, or the equivalent for your package manager
- This runs `next lint`

## Type checking
- `bunx tsc -b --noEmit`, or the equivalent `npx`/`pnpm`/`yarn` invocation for TypeScript checking
- `tsconfig.json` sets `"noEmit": true`, so this is a type-check-only run

If `bun` is not available in the current environment, use the project's configured package manager instead and note which one you used.

## Tests
- No test script is currently defined in `package.json` in this repository.
- No test files were found in the inspected source tree.
- If tests are added later, record the command here after verifying it.

## Production build
- `bun run build`, or the equivalent for your package manager
- This runs `next build`
- Start production server with `bun run start`, or the equivalent
- This runs `next start`

## Environment setup
- Set environment variables outside the repository documentation.
- Verified environment variable names used by the Supabase browser client:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Do not store secret values in documentation.
- Do not paste real credentials into code, prompts, or reports.

## Git workflow
- Work on the verified branch.
- Keep changes small and reviewable.
- Inspect `git status` and `git diff` before committing.
- Do not force-push, rewrite history, or reset branches unless explicitly asked.
- Do not commit or push unless the user explicitly authorizes it.
- If you do commit, re-verify the latest remote SHA before publishing and ensure nothing will be overwritten.

## Supabase change workflow
When changing data-dependent behavior:
1. Identify the relevant table, view, or type:
   - `houses`
   - `navigation_view`
   - `user_navigation_houses`
2. Identify the client path:
   - `src/lib/supabase.ts`
   - affected pages or components
3. Identify the matching types:
   - `src/types/house.ts`
   - `src/types/navigation.ts`
4. If the change affects rows, policies, or ownership, verify Supabase RLS or server-side enforcement before assuming the UI change is enough.
5. If schema changes are involved, follow the project's migration workflow if one exists; if none is visible, say so explicitly.

## Documentation updates
- If work changes project status materially, update:
  - `.ai/CURRENT_STATE.md`
  - `.ai/CHANGELOG.md`
- If a session ends with important context for the next agent, update:
  - `.ai/AI_HANDOFF.md`
- Do not write fake history into `CHANGELOG.md`. Record real changes only.

## Checks to run for risky changes
- Type check: `bunx tsc -b --noEmit`
- Lint: `bun run lint`
- Diff review: `git diff`
- If one of these cannot run, report `NOT RUN` and explain why.

## Environment-specific notes
- If the workspace sets env vars through its own platform, use those rather than relying on local `.env` tricks.
- The project's `.gitignore` excludes `.env*.local`, so local environment files are intentionally not committed.
