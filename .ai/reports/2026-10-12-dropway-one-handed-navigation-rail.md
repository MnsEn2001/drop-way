# 2026-10-12 — DropWay one-handed navigation rail, left/right hand mode, mobile keyboard fix

## Objective
Make the Navigation page usable with one hand on many phone sizes:
1. move each card's actions into a vertical, icon-only rail on the side,
2. add a left/right hand switch that moves the rail instantly and is remembered,
3. stop dialogs from opening the on-screen keyboard by themselves,
4. keep dialogs centred in the *visible* area, with save/cancel always reachable,
5. make the layout follow the real viewport (portrait/landscape, short screens, safe areas).

## Baseline verified before editing
- Repository: `https://github.com/MnsEn2001/drop-way.git`, branch `main`
- GitHub `main` = `origin/main` = local `HEAD` = `bf4ef5c6c36e93127869f84bcf0e151ae1409503`
- `git status --short`: only `package-lock.json` untracked (left alone)
- Read for this task: `.ai/AI_RULES.md`, `.ai/AI_HANDOFF.md`, `.ai/WORKFLOW.md`,
  plus `src/app/navigation/page.tsx`, `src/app/houses/page.tsx`,
  `src/app/globals.css`, `src/components/Navbar.tsx`, `package.json`

## Files changed
| File | Change |
| --- | --- |
| `src/app/navigation/page.tsx` | vertical icon action rail per card; hand-mode state + persistence + on-screen switch; removed every `autoFocus`; dialog panels now use `.modal-sheet`; `.modal-foot` sticky footers; focus returned to the trigger button after a dialog closes; larger tap targets for the inline Copy/Call buttons; viewport-aware page shell |
| `src/app/houses/page.tsx` | same dialog treatment (`.modal-sheet`, `.modal-foot`, viewport hook), `autoFocus` removed, viewport-aware page shell |
| `src/app/globals.css` | `.action-rail`, `.modal-foot`, `.icon-btn-warn`, `.page-shell`; `.modal-sheet` max-height now follows `min(85dvh, var(--app-vvh) * 0.85)` with an `80vh` fallback |
| `src/lib/viewport.ts` (new) | `useVisualViewportHeightVar()` keeps `--app-vvh` in sync with `window.visualViewport` and cleans up listeners + the property on unmount |

## What changed, in detail

### 1. Vertical, icon-only action rail
Each navigation card is now `flex` with the content column (`min-w-0 flex-1`) and a
`60px` `.action-rail` on one side. Buttons are `.icon-btn` (44×44 CSS px) with
`0.625rem` gaps, `aria-label` + `title` on every one, and contextual colour:
- `icon-btn-teal` — นำทางด้วย Google Maps (only when the house has coordinates)
- `icon-btn-primary` — ส่งงาน / เปลี่ยนเป็นส่งแล้ว (teal filled = primary action)
- `icon-btn-warn` — แก้ไขข้อมูลการส่ง (delivered), รายงานปัญหา / แก้ไขหมายเหตุรายงาน
- neutral `.icon-btn` — คอมเมนต์, แก้ไขข้อมูลบ้าน, ปิดยอด QR
- `icon-btn-danger` — ลบออกจากการนำทาง, pushed to the bottom of the rail behind a
  divider (`mt-auto`) so it is not next to the frequent actions

Actions and their handlers were moved unchanged: `openNavigation`, the deliver modal
(note parsing preserved verbatim), `openCommentModal`, the report modal (reason
presets preserved), `openEditModal`, the QR "ปิดยอด QR" flow, `removeFromNavigation`.
The old absolutely-positioned top-right button cluster and the bottom button row are
gone, so nothing covers the name, phone, address, notes or delivery data.
The old "no coordinates" frame (a non-interactive `div` masquerading as a button) was
replaced by a real `badge badge-amber` labelled "ไม่มีพิกัด" in the card header.

### 2. Left / right hand mode
- New state `handMode: "left" | "right"`, default **"right"** (matches the previous layout).
- Switch in the page header (`role="group"` + `aria-pressed` buttons "มือขวา" / "มือซ้าย",
  min-height 44px).
- Persisted under `localStorage["navigationActionRailSide"]`, read inside the existing
  guarded loader and written inside `try/catch` with a Thai error toast when storage is
  unavailable (same pattern as the existing start-position keys).
- Switching only flips `flex-row-reverse` on the card; data order, statuses, distances
  and action meaning are untouched.

### 3. No self-opening keyboard
- Removed all 7 `autoFocus` occurrences (6 in navigation: page-number input, the two
  amount inputs, the payment-detail textarea, the comment textarea, the report textarea;
  1 in houses: page-number input). `grep -rn "autoFocus" src/` now returns nothing.
- The remaining `.focus()` calls are user-initiated or focus-management only: the search
  "clear" buttons (intentional re-focus of the search box), and the Navbar drawer
  container/trap/trigger (a `div` and buttons — no keyboard).
- When a dialog closes, focus returns to the button that opened it
  (`dialogTriggerRef` + effect on `anyDialogOpen`, `focus({ preventScroll: true })`),
  so the keyboard is never re-opened by the app.

### 4. Dialog sizing and reachability
- The two "ไปที่หน้า" (page number) dialogs in navigation and houses were switched to
  the same `.modal-sheet` + `.modal-foot` treatment, and every dialog in the navigation
  page (8) now exposes `role="dialog"` + `aria-modal="true"` (houses: 4 of 4 dialogs).
- Every dialog panel in both pages now uses `.modal-sheet`: bottom sheet on phones,
  centred card from `sm` up, `overscroll-behavior: contain`, safe-area padding, and
  `max-height: min(85dvh, calc(var(--app-vvh, 100dvh) * 0.85))` with an `80vh` fallback
  for browsers without `dvh`.
- Save/cancel rows moved into `.modal-foot` (sticky bottom inside the scrolling sheet),
  so the primary button is reachable without scrolling through long forms (deliver,
  comment, report, edit house, filters, add/edit house).
- `src/lib/viewport.ts` publishes the visible viewport height so a keyboard-opened
  viewport shrinks the sheet instead of hiding its footer; listeners are removed on unmount.

### 5. Viewport-aware layout
- `.page-shell` (`min-height: 100vh` + `100dvh` fallback) applied to the navigation and
  houses pages; bottom padding still clears the mobile bottom nav and the FAB.
- Rail is in normal flow (not `fixed`), so it cannot overlap content, the bottom
  navigation or the FAB; long Thai names/addresses/notes keep `text-wrap-safe` +
  `line-clamp` behaviour instead of pushing the layout wide.

## Verification actually run (2026-10-12, on the final files)
| Command | Result |
| --- | --- |
| `git fetch` + `rev-parse HEAD/origin/main` | PASS — both `bf4ef5c` before editing |
| `git diff --check` | PASS — exit 0 |
| `npx tsc --noEmit` | PASS — exit 0 |
| `npm run lint` (`next lint`) | PASS — "No ESLint warnings or errors" |
| `npm run build` (`next build` 14.2.15) | PASS — 9/9 pages, `/navigation` 18.4 kB / 180 kB |
| Managed preview: `GET /navigation`, `/houses`, `/login`, `/register` | PASS — all HTTP 200 |
| Compiled CSS contains `.action-rail`, `.modal-foot`, `.icon-btn-warn`, `.page-shell`, and the generated utilities `.flex-row-reverse`, `.h-9`, `.w-9`, `.px-3\.5` | PASS — verified in `.next/static/css/app/layout.css` |
| Client bundle for the page contains the rail markup (`action-rail`, `มือขวา`) | PASS — verified in `.next/static/chunks/app/navigation/page.js` |
| Data-layer diff review (`supabase.`, `.insert/.update/.delete/.select/.eq/.order/.range`, status fields, money parsing, distance math) | PASS — the only logic-touching line added is `localStorage.setItem(HAND_MODE_KEY, …)` |
| Automated tests | **NOT RUN — none exist** (no test script, no jest/vitest/playwright) |

## PASS / FAIL / BLOCKED / NOT VERIFIED

**PASS (evidence-based)**
- Rail is vertical, icon-only, 44×44 targets, spaced, colour-coded by meaning, every button has an accessible name and a desktop `title`.
- Left/right switch exists, applies instantly, is persisted in `localStorage` with error safety, and defaults to right hand.
- No `autoFocus` anywhere in `src/`; dialogs open without requesting keyboard focus and restore focus to the trigger on close.
- Dialog panels are bottom sheets on phones with visible-area max-height and sticky footers.
- Layout follows the viewport (`100dvh` + visual viewport variable + safe areas) and the rail is in normal flow.
- Typecheck, lint, production build, diff check and all four routes (HTTP 200) pass.

**FAIL**
- None found in the checks that ran.

**BLOCKED**
- **Interaction testing 1–10 from the task list** (switch + refresh persistence, opening every modal, typing in the comment box, saving/erroring, screen sizes, overlap checks): the navigation page only renders its cards after an authenticated Supabase session loads, and this environment has no browser, no device and no test credentials. `GET /navigation` returns the pre-auth loading shell, so the rail is not present in server-rendered HTML.
- RLS / ownership verification (unchanged from the previous audit — still not verifiable from the repo).

**NOT VERIFIED**
- Real device behaviour: actual on-screen keyboard (Android Chrome / iOS Safari), whether the sheet stays clear of it, safe-area insets on notched phones, landscape/short screens, and visual double-check of the rail vs. bottom navigation.
- That switching hands survives a real page reload (implementation is guarded `localStorage`, but the round-trip was not executed in a browser).
- Nothing was deployed as part of this session's verification; see the Git section for the pushed SHA and deployment state.

## Known limitations / risks
- `.zoom-pinch-ok` and `user-scalable=no` from the earlier phase still trade away double-tap zoom on controls (unchanged here; re-check on a real device).
- The inactive `middleware.ts` finding from the previous audit is untouched (see `.ai/CURRENT_STATE.md`).
- The rail is per card. It is intentionally not a single global toolbar, because the buttons act on a specific house — a global rail would invite acting on the wrong row.

## Next steps worth queuing
1. Run the 10 interaction checks on a real phone (or a browser with a signed-in session) and record the result in `.ai/reports/`.
2. Add a test setup so hand-mode persistence and the "no autoFocus" rule are enforced automatically.
3. Fix the middleware location + cookie name (separate security task, unchanged here).

## Git
- Baseline: `bf4ef5c6c36e93127869f84bcf0e151ae1409503`
- Commits: `3c240d0e77805c82c76e4808505e302cd361c371` (`bf4ef5c..3c240d0`,
  rail + hand mode + keyboard/dialog fixes) and
  `b11c2a76b5ce82b473800372090ee7b82a085304` (`5e430f9..b11c2a7`, page-number
  dialogs + dialog semantics)
- Push: `git push origin main` succeeded for both; `git ls-remote --heads origin main`
  and `gh api repos/MnsEn2001/drop-way/commits/main` returned
  `b11c2a76b5ce82b473800372090ee7b82a085304` as the latest `main`
- GitHub Actions runs: none found (no CI configured in the repository)
- Production deployments (GitHub): `3c240d0` created 2026-10-12T01:15:30Z and
  `b11c2a7` created 2026-10-12T01:22:28Z, both `state=success` /
  "Deployment has completed". The deployed build was not exercised in a browser here.
- `package-lock.json` remains untracked and out of scope.
