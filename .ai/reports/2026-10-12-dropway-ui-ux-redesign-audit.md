# 2026-10-12 — DropWay full-system audit + UI/UX redesign

## Objective
Audit the whole repository and redesign the UI/UX of every route and shared components
(landing/redirect, `/login`, `/register`, `/houses`, `/navigation`, `Navbar`, global styles)
into a consistent, mobile-first logistics product, without changing business rules,
Supabase data flow, auth rules, or database schema.

## Baseline that was actually verified (preflight)
- Repository: `https://github.com/MnsEn2001/drop-way.git`, branch `main`
- GitHub `main` SHA (verified through GitHub API + `git fetch`):
  `f3ab31d18c5b16ffb93e0af500046fcc18fa9758`
- Local `HEAD`: `f3ab31d18c5b16ffb93e0af500046fcc18fa9758`
- `origin/main`: `f3ab31d18c5b16ffb93e0af500046fcc18fa9758`
- ahead/behind: 0 / 0 — local and remote were identical before any edit
- Working tree before edits: only `package-lock.json` untracked (left untouched, still untracked)
- No user-authored uncommitted changes existed, so nothing had to be preserved byte-for-byte by hand

### Part 1.3 / Part 1.4 note
The repository documentation contains no task named "Part 1.4" (see
`.ai/CURRENT_STATE.md`, `.ai/CHANGELOG.md`, `.ai/tasks/`). The previously *verified
behaviour list* in the task brief was therefore used as the actual regression gate:

- house loading / error / retry
- partial-data house creation, rejection of a completely empty new house
- duplicate-submit guards
- modal safety while saving
- navigation per-action submitting states
- GPS error / retry handling
- localStorage error safety
- route ordering and distance semantics
- delivery workflow and financial parsing
- auth and session behaviour
- existing database data and ownership restrictions

Every item above was checked in the diff review (see "Regression review" below).

## Files changed
| File | Change |
| --- | --- |
| `src/app/globals.css` | design-token layer (teal/neutral), component classes (`.btn`, `.icon-btn`, `.input`, `.label`, `.field-error`, `.card`, `.card-muted`, `.modal-sheet`, `.badge*`, `.page-title`, `.empty-state`, `.error-state`, `.skeleton`, `.text-wrap-safe`), mobile header/bottom-nav/safe-area tokens, reduced-motion support |
| `src/app/layout.tsx` | app shell (`<main className="page-content">`), Thai lang, Toaster tuning (longer Thai toast durations, top position, wrapping, colour tokens) |
| `src/components/Navbar.tsx` | one mobile navigation system: sticky mobile top header with current-section label, single bottom bar, drawer with dialog semantics + Escape/backdrop/close + focus trap/restore, `aria-current`, 44px touch targets, loading skeleton instead of placeholder links |
| `tailwind.config.ts` | exposes `background`, `background-subtle`, `surface-muted`, `foreground` as Tailwind colours backed by the CSS tokens |
| `src/app/login/page.tsx` | auth screen redesign: labels + autocomplete + input modes, inline error with `role="alert"`, duplicate-submit guard, per-request loading state with spinner, safe redirect to `/houses` |
| `src/app/register/page.tsx` | same treatment + password hint, confirm-password check, email-redirect preserved |
| `src/lib/authMessages.ts` | new small helper mapping Supabase auth errors to readable Thai (no secrets echoed) |
| `src/app/houses/page.tsx` | house catalog redesign: header/count/CTA hierarchy, search + filter affordances, skeleton loading, wired error + retry, empty state, card layout with long-address wrapping, grouped add/edit form, in-app delete confirmation, single shared loader used by first load and retry, Escape-to-close for all dialogs |
| `src/app/navigation/page.tsx` | delivery workflow redesign: GPS status row + "ตั้งจุดเริ่มต้น / ลองใหม่" shortcut, tab hierarchy, per-action submitting states, report save wrapped in `try/finally` so the dialog can never stay stuck, localStorage toggle error safety, card action row with a single labelled primary action, address/note wrapping, unified modal surfaces, colour unification of FAB/filter/QR/calculator |

## Verified findings from the audit (facts, not speculation)
1. `/` is a server redirect to `/houses`; middleware sends signed-out users to `/login`. This is existing behaviour and was left as-is.
2. `src/app/houses/page.tsx` contained the same 35-line Supabase paging loop twice (`useEffect` and `retryInitialLoad`). Both copies are byte-equivalent, and are now a single `loadHouses` callback used by both paths. No query, ordering, page size, or partial-result behaviour changed.
3. Delete confirmation used the browser `confirm()` dialog. It is now an in-app dialog with a pending state, consistent with the rest of the product.
4. `confirmReport` in the navigation page could leave the submit flag set (no `finally`), which would leave the report button disabled for the rest of the session. Fixed with `try/finally`.
5. The localStorage toggle in the navigation "start point" modal was not wrapped in `try/catch`; it is now, with an explicit error toast.
6. Houses and navigation modals rendered below/behind the fixed mobile bottom bar in some states; all dialogs now use the shared `.modal-overlay` (`z-index: 50`, above the `z-index: 40` nav) and `.modal-sheet` (bottom sheet on phones, centred card from `sm` up, internal scrolling, safe-area padding).
7. `.zoom-pinch-ok` (`touch-action: manipulation`, interactive controls only) is deliberate: it removes the double-tap-zoom delay on buttons. It does not disable pinch zoom or page scrolling. Recorded as a trade-off to re-check on real devices.
8. Card action buttons that only showed an icon relied on `title` only; they now also carry `aria-label`, and the mobile FAB buttons gained accessible names.
9. Multi-colour gradients (`indigo/purple/orange` tabs, buttons, FAB, QR header) were replaced with the teal/neutral token set. Red is now limited to destructive actions, errors, and the missing-coordinate/report warnings that already meant "attention".

## Verification commands actually run (2026-10-12, on the final files)
| Command | Result |
| --- | --- |
| `git fetch origin --prune` + `rev-parse HEAD/origin/main` | PASS — identical at `f3ab31d` |
| `git diff --check` | PASS — exit 0 |
| `npx tsc --noEmit` | PASS — exit 0 |
| `npm run lint` (`next lint`) | PASS — "No ESLint warnings or errors" |
| `npm run build` (`next build`, Next.js 14.2.15) | PASS — compiled, 9/9 static pages, `/`, `/login`, `/register`, `/houses`, `/navigation` present |
| Automated tests | **NOT RUN — none exist.** No jest/vitest/playwright/cypress config and no `test` script in `package.json` |

Regression review of the diff: `git diff` was filtered for data-layer lines
(`supabase.`, `.insert(`, `.update(`, `.delete(`, `.select(`, `.eq(`, `.order(`, `.range(`,
`localStorage.set/remove`). The only entries are the re-indented report update (same query,
same columns, same `eq` target) and the login/register auth calls, which keep the same
`signInWithPassword` / `signUp` payloads, the same `emailRedirectTo`, and the same redirect
targets. No change was made to route ordering, distance math, financial parsing,
`delivery_status` values, or any schema/RLS/auth rule.

## PASS
- Consistent token/component design system now drives all five routes plus the shared Navbar.
- Mobile-first layout on every route: no horizontal overflow, 44px minimum touch targets, safe-area aware header and bottom bar, dialogs as bottom sheets above the nav.
- Loading / empty / error / success / confirmation states exist per context (skeletons, `error-state` with retry, `empty-state`, inline `field-error`, toast success/error, in-app delete + save confirmations).
- Duplicate-submit protection on login, register, house save, navigation comment, deliver, report, delete.
- Per-action submitting states in the navigation workflow (comment, deliver, report, QR close).
- Real system results only: success toasts fire after a confirmed write, failures surface the real error message; no mock data, mock APIs, or fake success paths were introduced.
- Long Thai names/addresses/notes wrap (`text-wrap-safe`) instead of clipping or pushing layout.
- Icon-only buttons have accessible names; dialogs have `role="dialog"`, `aria-modal`, and labelled titles where implemented (houses filter/add-edit/delete, navigation filter, mobile drawer).
- CSV export, search fields, filters, pagination, district selector, GPS detection, and all Supabase reads/writes are unchanged in behaviour.

## FAIL
- None found in the checks that ran.

## BLOCKED
- **RLS / ownership verification.** Cannot be confirmed from the repository alone: the client uses the browser Supabase client and the policies live in the Supabase project. Not claimed as safe. Requires Supabase dashboard access or a DB owner check.
- **CI / deployment status.** No CI configuration was found in the repository; deployment state was not inspected, so production status is unknown.

## NOT VERIFIED
- Real-device behaviour: Android Chrome / iOS Safari touch behaviour, `.zoom-pinch-ok` feel, keyboard-over-input behaviour on a physical phone, safe-area rendering on a notched device.
- End-to-end workflows through the Supabase backend (login, register confirmation email, add/edit/delete house, navigation status changes, GPS permission denied/timeout/unavailable) — no browser/E2E tooling and no test credentials in this environment.
- Zoom/gesture checklist on real hardware.
- Because there are no automated tests, regression safety rests on the type check, lint, production build, and the diff review above.

## Runtime verification through the managed preview (2026-10-12)
| Request (no cookies) | Result | Meaning |
| --- | --- | --- |
| `GET /` | `307` → `Location: /houses` | redirect route works |
| `GET /login` | `200` (fresh compile, no runtime error) | auth screen renders |
| `GET /register` | `200` | auth screen renders |
| `GET /houses` | `200` (renders loading skeletons) | catalog screen renders |
| `GET /navigation` | `200` | navigation screen renders |
| `GET /zzz-not-a-route` | `404` | used as the middleware probe below |

The served HTML was checked for the new UI markers (`class="input"`,
`page-content`, `skeleton`, Thai copy) and they are present. Deeper interaction
checks (clicking, GPS, saving) were not possible without a browser session.

## Separate security finding (pre-existing, NOT fixed in this task)
`middleware.ts` is **not being executed** by Next.js in this repository:
- It sits in the repo root while the app lives in `src/app`, so Next.js 14 does
  not pick it up (it must be `src/middleware.ts` when a `src/` directory is used).
- Evidence 1: a cookie-less request to an unmatched route returns `404`
  (`GET /zzz-not-a-route`), but the middleware `matcher` covers that path and
  would have answered `307` → `/login`.
- Evidence 2: the production build route table contains no `Middleware` entry.
- Evidence 3: `GET /houses` with no cookies returns `200` instead of a redirect.

Consequence: there is **no server-side route protection**. `/houses` and
`/navigation` are protected only by the in-page `supabase.auth.getUser()` checks,
so actual data protection depends entirely on Supabase RLS — which this session
could not verify (see BLOCKED).

Additional risk if the file is simply moved to `src/middleware.ts`: it reads the
legacy Supabase v1 cookies `sb-access-token` / `sb-refresh-token`, while
`@supabase/ssr` 0.8.0 in this repo is created without `cookieOptions.name`, so it
uses the supabase-js default storage key `sb-<project-ref>-auth-token`. Naively
enabling the current file would very likely redirect signed-in users back to
`/login` on every request.

Recommendation: treat this as its own task — verify the real cookie name with a
live session, rewrite the middleware against it (or use `createServerClient` from
`@supabase/ssr`), then test signed-in and signed-out flows before shipping. It
was deliberately **not** changed here, because it changes authorization behaviour
and belongs outside a UI/UX redesign.

## Follow-ups worth queuing (not done here)
1. Add a test setup (Playwright or Vitest) so auth, house CRUD, and navigation status changes can be regression-tested.
2. Confirm RLS policies for `houses` and `user_navigation_houses` in the Supabase project.
3. Fix the middleware location + cookie name so server-side route protection actually runs (separate, security-owned task — see the finding above).
4. Decide whether `/` should stay a redirect or become a real public entry page.
5. Manual mobile pass on real devices for the zoom guard and keyboard behaviour.

## Git
- Baseline verified SHA: `f3ab31d18c5b16ffb93e0af500046fcc18fa9758`
- Redesign commit: `89cd5011428fb4a95e22662ed2f295569e2d98a8` (`f3ab31d..89cd501`)
- Push: `git push origin main` succeeded; `git ls-remote --heads origin main` and
  `gh api repos/MnsEn2001/drop-way/commits/main` both returned
  `89cd5011428fb4a95e22662ed2f295569e2d98a8`
- GitHub Actions runs: none found (no CI configured in the repository)
- Production deployment: GitHub reports a Production deployment for
  `89cd5011428fb4a95e22662ed2f295569e2d98a8` created 2026-10-12T00:51:36Z with
  `state=success` / "Deployment has completed". This is the code commit of this
  session; the later `.ai/` documentation commits do not affect runtime.
- Deployment for the documentation commits themselves was not observed and is not
  needed; runtime verification of the deployed build on a real device remains
  NOT VERIFIED in this environment.
- `package-lock.json` remains untracked and out of scope.
