# .ai/reports/2026-10-11-dropway-product-audit-plan.md

**Purpose:** Audit-only product, UI/UX, functional, performance, security, and production-readiness plan for DropWay.

**Scope:** Read-only review of the current repository state. No source code or configuration was changed in this session.

**Date (UTC):** 2026-10-11

**Repository reviewed:** `https://github.com/MnsEn2001/drop-way.git`
**Branch reviewed:** `main`
**Verified GitHub main SHA:** `99c7e16f0e8ddacae84e834498e1faa4cccd1245`
**Local HEAD SHA at review time:** `99c7e16f0e8ddacae84e834498e1faa4cccd1245`
**Local status at review time:** clean, synchronized with `origin/main`

---

## 1. Executive Summary

### Current state
The repository is a small Next.js 14 App Router application for:
- logging in and registering with Supabase Auth email/password
- managing a house catalog (`houses`)
- managing a user-specific delivery/navigation list (`user_navigation_houses`, read through `navigation_view`)

This is verified from the actual source tree. It is **not** a larger marketplace, admin panel, or multi-role system based on this checkout.

### Most important risks
- **Security/ownership verification is incomplete from the repo alone.** The app signs up/logs in users and then performs data mutations from the browser Supabase client. The repository does **not** visibly contain RLS policies, migrations, or server-side enforcement, so row-level ownership cannot be verified from this checkout.
- **Data correctness risk in the navigation workflow.** The navigation page contains substantial client-side logic around delivery status, notes, sorting, filtering, and delivery-note parsing. That complexity raises the chance of inconsistent state, parsing mistakes, or incomplete UI paths.
- **Offline quality risk.** The app is Thai-language UI-first, but repository metadata (commit messages, comments, scaffolding notes) and code comments are mixed language/English. This can slow future maintenance and review.
- **Production readiness gaps.** No lockfile is present in the inspected tree, no tests are present, and no CI is visible. That does not prove a problem in production, but it is a real process risk.

### Overall posture
**PARTIAL.**
- Verified: auth UI, basic session gating, core data model, and main user flows.
- Not verifiable from repo alone: Supabase RLS/policies, exact business rules for navigation/delivery, and any backend-only processes.

---

## 2. Route Inventory

| Route | File | Role |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | Redirects to `/houses` |
| `/login` | `src/app/login/page.tsx` | Email/password login |
| `/register` | `src/app/register/page.tsx` | Email/password registration |
| `/houses` | `src/app/houses/page.tsx` | House catalog, search, filter, add/edit/delete, CSV export |
| `/navigation` | `src/app/navigation/page.tsx` | Delivery/navigation workflow |

Shared layout:
- `src/app/layout.tsx` renders `Navbar`, `Toaster`, and global styles on every route.

Auth protection:
- `middleware.ts` treats `/`, `/login`, `/register` as public.
- All other paths are expected to require Supabase session cookies according to `middleware.ts`.
- `houses` and `navigation` also perform a client-side session check.

---

## 3. Feature Audit

Status key:
- `VERIFIED` = confirmed in the inspected code
- `PARTIAL` = present but incomplete/unfinished/unconfirmed
- `UNKNOWN` = cannot be determined from the repo
- `NOT VERIFIED` = needs environment/dashboard/policy inspection

| Feature | Status | Notes |
| --- | --- | --- |
| Email/password sign-in | VERIFIED | `login/page.tsx` uses `signInWithPassword` |
| Email/password sign-up | VERIFIED | `register/page.tsx` uses `signUp` with `emailRedirectTo` |
| Session gating (edge) | VERIFIED | `middleware.ts` checks `sb-access-token` and `sb-refresh-token` cookies |
| Session gating (client) | VERIFIED | protected pages call `getSession()` and redirect to `/login` |
| House catalog load | VERIFIED | paginated read from `houses` |
| House search/filter | VERIFIED | client-side filtering on name/phone/address/note and coordinate flags |
| House add/edit | VERIFIED | insert/update against `houses` |
| House delete | VERIFIED | delete by `id` with existence check via `.select()` |
| CSV export | VERIFIED | `houses` export via Papa Parse |
| Add house to navigation | VERIFIED | inserts into `user_navigation_houses` with `house_id` |
| Navigation list load | VERIFIED | reads `navigation_view` with pagination loop |
| GPS current position | VERIFIED | uses `watchPosition` in real-time mode |
| Fixed start position | VERIFIED | saved in `localStorage` |
| Route sorting | VERIFIED | nearest-neighbor TSP and straight-line distance modes present |
| Delivery status workflow | PARTIAL | status fields exist and are used, but exact rules and completeness are not fully confirmable from this checkout |
| Driver notes / comments | PARTIAL | `driver_note` update path exists; completeness of related UI paths needs end-to-end verification |
| Report problem flow | PARTIAL | report fields exist; full workflow not fully confirmed |
| Phone copy / call actions | VERIFIED | copy and `tel:` actions exist |
| Google Maps navigation | VERIFIED | opens Maps URLs from the browser |
| Address input helpers | VERIFIED | Thai locality helpers are implemented in both houses and navigation pages |
| Call tracking feature | UNKNOWN | `call_count`/`call_note` exist in the type, but active usage is not confirmed |
| Tests | NOT VERIFIED | no test files or test scripts found in the inspected tree |
| RLS / ownership enforcement | NOT VERIFIED | not inspectable from this repo alone |
| Backend-only jobs/webhooks | UNKNOWN | none found in this checkout |

---

## 4. UI/UX Audit

### 4.1 General observations
- The app uses Tailwind utility classes heavily and relies on a small set of repeated patterns.
- The same Thai locality autocomplete logic appears in more than one page, which creates maintenance and consistency risk.
- The root layout forces a top-level `Navbar` and `Toaster` on every route.

### 4.2 Mobile-first gaps
- Many controls, cards, and modals in the current code appear to be desktop-leaning or mixed. Whether they are genuinely usable on small screens should be verified on real devices or mobile simulators.
- Touch target sizes, keyboard dismissal, modal backdrops, and scroll behavior inside overlays are the kinds of issues most likely to hurt mobile use.
- Pagination and filter controls need to be checked for thumb reachability and reduced confusion on phones.

### 4.3 Readability and accessibility
- Thai text density is high. Line-height, line-clamp behavior, and truncation need careful handling so addresses, names, and notes stay readable.
- Focus states, keyboard navigation, and screen-reader labeling should be verified, especially for icon-only buttons and repeated action buttons.
- Contrast and text hierarchy should be reviewed for the default theme, because several pages rely on custom toast and card styling.

### 4.4 State coverage
The app currently depends a lot on:
- toasts for feedback
- loading flags on buttons
- ad hoc inline loading/empty handling

Recommended minimum state coverage across the system:
- idle
- loading
- empty
- error
- success
- confirmation for destructive actions

### 4.5 Proposed design system direction
Do not invent a new design framework. Instead, define a small internal design system on top of the existing Tailwind setup:

- **Spacing and rhythm:** consistent vertical rhythm for list items, cards, and forms.
- **Component tokens:** consistent button sizes, input heights, card padding, modal width, and chip/pill styles.
- **Feedback tokens:** standard toast and inline message patterns for success, error, loading, and confirmation.
- **List/card pattern:** reuse one catalog card pattern for houses and one list item pattern for navigation wherever possible.
- **Form pattern:** shared input/label/error arrangement, especially for Thai address entry.
- **Navigation pattern:** clearer primary/secondary actions, especially on mobile.

---

## 5. Security Audit

### 5.1 Verified
- Supabase Auth is used for sign-in and sign-up.
- `middleware.ts` checks `sb-access-token` and `sb-refresh-token` cookies.
- Protected pages also perform a client-side session check.
- Supabase browser client is initialized with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `src/lib/supabase.ts`.

### 5.2 Cannot be verified from this repo
- Supabase RLS policies
- table/view security definitions
- whether `user_navigation_houses` is correctly scoped per user
- whether `houses` mutations are correctly owned/restricted
- whether the anonymous key has more permission than intended
- whether there are server-side functions, migrations, or edge functions outside this checkout

These items are **BLOCKED / NOT VERIFIED** from this repository alone. Do not assume they are correct. Do not weaken RLS or policies to make a UI feature work.

### 5.3 Ownership caution
The UI directly mutates `houses` and `user_navigation_houses` from the browser client. Even if the current behavior works, ownership enforcement must be confirmed server-side. If multiple user roles ever exist, this becomes more important.

### 5.4 Data-handling cautions
- Address, phone, name, and note data are user/data-owner sensitive. None of those values should be placed into documentation or reports.
- Coordinate and address samples visible in the UI helpers are app data concerns; treat them as potentially real and handle accordingly.
- Any audit report must avoid reproducing private user records.

---

## 6. Performance Audit

### 6.1 Current loading model
- Both main data pages load data client-side using paginated range reads through the browser Supabase client.
- The navigation page uses a large client-side dataset and does a lot of sorting/filtering in React state.
- `navigation/page.tsx` is large and contains substantial in-browser computation and state.

### 6.2 Likely bottlenecks
- Client-side heavy filtering/sorting on large lists
- Possible unnecessary re-renders from large component footprint and many state variables
- Possible repeated fetches or reloads triggered by multiple “reload” paths
- Address autocomplete logic running on every input change

### 6.3 What must be understood before changing queries
- The existing pagination behavior
- Whether filtering should move server-side
- Whether the `navigation_view` supports efficient filtering/sorting
- How much data is typical per user
- Whether any client-side sorting is a business requirement or just a current implementation choice

### 6.4 Network and interaction risks
- Repeated submissions should be prevented; the code already has some anti-duplicate guards, but consistency should be checked across actions.
- Navigation reloads, pagination, and filter changes all interact; race conditions and stale-data bugs are the main risk area.
- Loading UX should be reviewed so users are not left guessing during slow loads or failed requests.

---

## 7. Prioritized Roadmap

### P0 — Safety, data correctness, and verification gates
1. Verify Supabase RLS and ownership behavior from the Supabase side before changing any data flow.
2. Confirm which data mutations truly need stronger server-side checks.
3. Identify any navigation/delivery logic that can corrupt status or notes.
4. Establish a rollback/backout note for any future data-related change.

### P1 — Core UX and workflow reliability
1. Stabilize the navigation workflow UX and state handling.
2. Make the house catalog and navigation flows consistently usable on mobile.
3. Standardize loading, empty, error, and confirmation states.
4. Reduce duplicate autocomplete and filter logic.

### P2 — Quality and maintainability
1. Introduce a small internal design system on top of Tailwind.
2. Improve component structure and reduce repetition between houses and navigation pages.
3. Add TypeScript strictness scrutiny and linting discipline if not already enforced in practice.
4. Improve Thai/English repository hygiene where it affects maintainability.

### P3 — Enhancement and polish
1. Consider optional server-side improvements only after core behavior and security are verified.
2. Optional enhancements may include better empty states, clearer navigation affordances, and refined visual polish.
3. Any framework/dependency upgrades should be phased, not bulk-applied.

---

## 8. Acceptance Criteria

### P0 acceptance
- Supabase ownership/RLS behavior is confirmed from the appropriate environment or dashboard, not assumed.
- Any data mutation change preserves or strengthens existing security.
- No commit lands that weakens auth, session handling, or data isolation.

### P1 acceptance
- Core flows (login, register, houses, navigation) remain functionally intact.
- Mobile usability is demonstrably improved for primary tasks.
- Destructive actions require explicit confirmation.
- Error/empty/loading states are consistent and testable.

### P2 acceptance
- Repeated UI logic is reduced.
- The visual language is consistent across routes.
- Changes are type-safe and lint-clean where applicable.
- Documentation is updated to match the actual system.

### P3 acceptance
- Enhancements are optional and do not block core workflow.
- Any dependency/framework upgrade has a stated compatibility and rollback approach.

---

## 9. Test Plan

### 9.1 Before any code change
- Confirm auth flows manually:
  - sign up
  - sign in
  - session persistence
  - redirect behavior when not authenticated
- Confirm core data flows manually:
  - add/edit/delete house
  - add/remove navigation item
  - delivery status and note updates
  - CSV export
- Confirm navigation behavior manually:
  - load list
  - filter/search
  - position modes
  - route sorting
  - maps actions

### 9.2 After UI/UX changes
- Re-run the same manual flows on mobile-oriented views.
- Verify destructive actions still require confirmation.
- Verify toasts and inline feedback still communicate outcomes clearly.
- Verify address autocomplete still works as intended.

### 9.3 After data/security-relevant changes
- Verify that row ownership restrictions are not weakened.
- Verify that one user cannot affect another user’s data where that should be blocked.
- If possible, test with more than one test account.

### 9.4 What is missing today
- No automated unit/integration/E2E tests were found.
- No CI pipeline was found in the inspected tree.
- Therefore,“tests passed” cannot be claimed for this repository at this time.

---

## 10. Rollback Plan

### General rollback principles
- Keep changes small and reviewable.
- Do not bundle visual rework with data/security changes.
- Keep a clear diff scope for every change.
- Prefer reversible UI changes over irreversible data changes.

### If UI changes cause regressions
- Revert the UI commit(s) and re-verify core flows.
- If only one page is affected, scope rollback to that page.

### If data behavior changes
- Do not rely on UI rollback alone if the change touches data semantics.
- Coordinate rollback with the Supabase side if policies or server behavior were involved.
- If a change affects existing navigation/delivery records, document the exact before/after behavior before attempting any fix.

### If auth or session behavior changes
- Stop and verify immediately.
- Revert if protected routes or redirect behavior regress.

---

## 11. Recommended Task Briefs

These are the recommended follow-up tasks, each suitable for `.ai/tasks/active/`. Each brief below is a planning outline, not an implementation order. Actual implementation must start from the verified repo and the relevant `.ai/tasks/TASK_TEMPLATE.md`.

### Task 1 — Security/ownership verification gate
- **Objective:** Confirm Supabase RLS, ownership, and data isolation before any data-flow changes.
- **Scope:** Supabase policies/migrations/permissions; cross-check against `houses` and `user_navigation_houses` usage.
- **Files to inspect:** `src/lib/supabase.ts`, `src/middleware.ts`, `src/app/houses/page.tsx`, `src/app/navigation/page.tsx`, `src/types/house.ts`, `src/types/navigation.ts`.
- **Expected changes:** Documentation of verified security posture; only later, targeted data/security changes if needed.
- **Risks:** Assuming RLS is correct without evidence; weakening policies to make a UI feature work.
- **Acceptance criteria:** Security posture is documented with evidence; any gap is explicitly flagged; no weakening of controls.
- **Verification commands:** repository diff review; relevant Supabase-side inspection where accessible; if inaccessible, mark `NOT VERIFIED` explicitly.

### Task 2 — Navigation workflow stabilization
- **Objective:** Make the navigation page’s state, status handling, and feedback more reliable and understandable.
- **Scope:** `src/app/navigation/page.tsx` behavior review and targeted improvements only after current behavior is understood.
- **Files to inspect:** `src/app/navigation/page.tsx`, `src/types/navigation.ts`, `src/lib/supabase.ts`, `src/components/Navbar.tsx` if shared actions exist.
- **Expected changes:** clearer state handling, fewer ambiguous paths, consistent feedback.
- **Risks:** changing delivery/status semantics without understanding existing behavior.
- **Acceptance criteria:** core navigation flows remain intact; edge cases handled consistently; no invented features.
- **Verification commands:** manual flow checks, diff review, and any applicable type/lint checks.

### Task 3 — Mobile-first UX and design system
- **Objective:** Improve mobile usability and consistency across routes without removing functionality.
- **Scope:** shared UI patterns, touch targets, readability, and consistent feedback states.
- **Files to inspect:** `src/app/layout.tsx`, `src/components/Navbar.tsx`, `src/app/houses/page.tsx`, `src/app/navigation/page.tsx`, `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/app/globals.css`, `tailwind.config.ts`.
- **Expected changes:** a small internal design system and more consistent routes; no removal of existing features.
- **Risks:** over-broad visual rewrite; breaking Thai text readability; introducing contrast/keyboard issues.
- **Acceptance criteria:** primary tasks remain complete; mobile usability improved; visual language consistent.
- **Verification commands:** mobile-oriented manual checks, diff review, type/lint checks where applicable.

### Task 4 — Quality, tests, and CI foundation
- **Objective:** Add a baseline for checking changes before deploy.
- **Scope:** test strategy, lint/typecheck discipline, and CI/checks planning.
- **Files to inspect:** `package.json`, `tsconfig.json`, `.eslintrc.json`, `next.config.mjs`, source files, any future test directories.
- **Expected changes:** test plan and CI/checks proposal; later, actual tests and checks if approved.
- **Risks:** shipping bulk dependency/framework upgrades without compatibility planning.
- **Acceptance criteria:** a runnable check strategy exists; upgrades are phased with rollback notes.
- **Verification commands:** `bunx tsc -b --noEmit`, `bun run lint`, and any added test commands after they exist.

### Task 5 — Code/language hygiene and maintainability
- **Objective:** Improve consistency of language, comments, and component structure without changing behavior.
- **Scope:** comments, file organization, duplication reduction, and naming consistency.
- **Files to inspect:** all source files, especially duplicated address helper logic and large pages.
- **Expected changes:** easier maintenance and clearer intent.
- **Risks:** mixing cosmetic cleanup with functional changes.
- **Acceptance criteria:** improvements are clearly separated from feature/security changes and do not alter behavior.
- **Verification commands:** diff review and applicable type/lint checks.

---

## Evidence reviewed

### Commands run
- `git remote get-url origin`
- `git branch --show-current`
- `git fetch origin main`
- `git rev-parse origin/main`
- `git rev-parse HEAD`
- `git status --short`
- `git diff --stat origin/main`
- `find` for source files, tests, config, and possible CI/deploy files
- reads of `.ai/` docs and core source files

### Files reviewed
- `.ai/AI_RULES.md`
- `.ai/AI_HANDOFF.md`
- `.ai/PROJECT_CONTEXT.md`
- `.ai/ARCHITECTURE.md`
- `.ai/WORKFLOW.md`
- `.ai/CURRENT_STATE.md`
- `package.json`
- `tsconfig.json`
- `next.config.mjs`
- `tailwind.config.ts`
- `.eslintrc.json`
- `postcss.config.mjs`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/login/page.tsx`
- `src/app/register/page.tsx`
- `src/middleware.ts`
- `src/lib/supabase.ts`
- `src/types/house.ts`
- `src/types/navigation.ts`

### Files not fully read end-to-end
- `src/app/houses/page.tsx`
- `src/app/navigation/page.tsx`
- `src/components/Navbar.tsx`

These were not fully parsed in this session because they are large. Their existence and general role are verified, but some detailed UI/UX conclusions should be re-checked against the full file contents before implementation.

---

## Verification checks

- Repository, branch, and SHA verification: **PASS**
- Working tree cleanliness and remote sync check: **PASS**
- `.ai/` documentation reviewed before planning: **PASS**
- Read-only audit with no code/config change: **PASS**
- Internal consistency between this report and `.ai/ARCHITECTURE.md`/`.ai/PROJECT_CONTEXT.md`: **PASS**
- Secrets/credentials check: **PASS** — no credentials or user data included

### Not run
- `bunx tsc -b --noEmit`: **NOT RUN**
- `bun run lint`: **NOT RUN**
- `next build`: **NOT RUN**
- Any browser/app runtime verification: **NOT RUN**

Reasons:
- This session is audit-and-plan only.
- Type/lint/build checks may still be useful later, but they are separate from the read-only audit.
- Runtime verification of mobile UX and navigation behavior requires running the app and/or inspecting Supabase-side configuration.

---

## Limitations

- Supabase RLS, policies, migrations, and server-side enforcement could not be verified from this repository.
- Complete navigation/delivery business rules could not be fully confirmed from the inspected files.
- Some large UI files were not read end-to-end; detailed UI conclusions should be re-verified before implementation.
- No tests, lockfile, or CI were found in the inspected tree, so test/build assertions cannot be claimed.

---

## Conclusion

**Status: PARTIAL**

The repository is a real, functional Next.js + Supabase app with verified auth, house management, and navigation/delivery workflows. The biggest open risks are Supabase-side security verification, data correctness in the navigation workflow, and the lack of tests/CI. This report is a read-only plan only and does not modify application code or configuration.

---

## Recommended next actions

1. Verify Supabase RLS/ownership before touching data flows.
2. Read the full navigation and houses pages before planning detailed UI changes.
3. Select one P0 or P1 task from the list above and create a `.ai/tasks/active/` brief from `TASK_TEMPLATE.md`.
4. Keep each change small, reversible, and separated from unrelated rework.
