# .ai/AI_RULES.md

This file defines mandatory operating rules for every AI agent working in this repository.

## 1. Repository verification first
- Confirm the authoritative remote URL and default branch before starting work.
- In this repository, verify that `origin` points to `https://github.com/MnsEn2001/drop-way.git` and the default branch is `main`.
- Record the latest verified `origin/main` commit SHA and the local `HEAD` SHA at the start of each session.
- If the repo, branch, or synchronization status cannot be verified, stop and report the blocker.

## 2. Inspect before modifying
- Read the relevant source files, types, routes, middleware, Supabase clients, queries, and configs before planning any change.
- Do not infer that a feature exists because a dependency is installed. Use the actual code as evidence.
- Do not introduce new files, routes, API shapes, database tables/columns, environment variables, or workflows unless the actual project already implies or contains them.

## 3. Preserve the real project
- Preserve existing user changes, architecture, naming conventions, and project structure.
- Prefer small, targeted, reversible changes.
- Do not create duplicate systems when an existing implementation should be extended or fixed.
- Do not silently change dependencies, package managers, application structure, build configuration, or deployment configuration.

## 4. Authentication, authorization, and data security
- Preserve authentication, session handling, authorization, and ownership checks.
- In this project, Supabase Auth is used with cookie-based session checks in `middleware.ts`, and Supabase clients use environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Do not weaken Row Level Security, service-role clients, or other security controls just to make a feature work.
- If RLS, policies, or ownership behavior is unclear, investigate and report before changing anything.

## 5. Secrets and user data
- Never include values for secrets, access tokens, passwords, service-role keys, private user data, or production credentials in documentation or code.
- Environment variable names may be documented when useful. Values must not be exposed.
- Do not log, print, or transmit real user data unless the task explicitly and safely requires it.

## 6. No invented behavior
- Do not invent APIs, database tables, columns, RPC functions, routes, environment variables, or features.
- Do not claim a feature is implemented unless it is implemented in the codebase.
- Do not claim a test passed unless it was actually run and passed in this environment.

## 7. Verification and honesty
- Run the available relevant checks and accurately report their results.
- Distinguish clearly between:
  - verified and implemented
  - partially implemented
  - planned but not implemented
  - unknown or not yet verified
- If requirements or security behavior are unclear, investigate and report before making risky changes.

## 8. Documentation discipline
- When work materially changes project status, update `.ai/CURRENT_STATE.md` and `.ai/CHANGELOG.md`.
- When a session begins or ends with useful context for the next agent, update `.ai/AI_HANDOFF.md` as appropriate.
- Keep documented stack, routes, scripts, and integrations aligned with the actual code.

## 9. Git discipline and mandatory push
- Use the repository's real remote and branch.
- This repository operates with a standing authorization: after finishing the requested work, commit the scoped changes and push them to `main` on `origin` using the documented push procedure in `.ai/AI_HANDOFF.md` ("Push procedure") and `.ai/WORKFLOW.md` ("Git workflow"). Do not wait for a separate push request.
- Never force-push, rewrite history, or reset branches.
- Stage only files that belong to the current task. Do not commit unrelated changes, secrets, environment files, or lockfiles that the repository does not already track.
- Immediately before committing, re-verify the latest `origin/main` SHA and ensure no remote commits or user changes will be overwritten.
- After pushing, verify the remote SHA matches local `HEAD` (`git ls-remote --heads origin main`) and report the pushed commit SHA and the verification result.
- If pushing is impossible (no credential, blocked remote, conflicting history), stop, report the blocker clearly, and leave the commits locally. Do not silently skip the push.
