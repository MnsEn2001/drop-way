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
- One-handed navigation commit pushed and verified: `3c240d0e77805c82c76e4808505e302cd361c371`
- Follow-up (page-number dialogs + dialog semantics) pushed and verified: `b11c2a76b5ce82b473800372090ee7b82a085304`
- 2026-10-12 card button + data-color polish pushed and verified: `1fe54494a4031bab611767324e7f2d303162e401` (from `992e02dbb4f1dba6311f76060a4c65b822001c3b`)
- 2026-10-12 modal centering pushed and verified: `ddd5a940a668af99f48db22d56fc150f006b90fb` (from `a43d0547537730c2b891811de38b756cdb461b8e`)
- 2026-10-12 dialog-dismiss routing + shared restricted/unsaved hook pushed and verified: `8aa1f30982724a86a69c7a40ba78f8f55744ba4e` (from `71cec880ce822f29eaf14738e4934abf49ede0a2`)
- 2026-10-12 shared unsaved/restricted confirmation dialog code pushed and
  verified: `4750a6b4c858a7e5e31805382a4f1f05368033c5` (docs rewrite `af55200`)
- 2026-10-12 modal save/cancel footer restored to normal document flow pushed
  and verified: `cbab19d4c8181cec008f1a2e1723d212a7d24158`
- Baseline for the modal keyboard session: `f0f9197377db69f8b8a824355263cf8b48e3edc9`
  (docs commit after `cbab19d`)
- 2026-10-12 modal keyboard stability (no backdrop/Escape dismissal, shared
  `useModalKeyboardBehavior`, position pinning, real body lock) pushed and
  verified: `90c1d1d08b793702890ec25bd16315d12858f6d0`
- 2026-10-13 search-options fix (pass `searchInName`/`searchInAddress`/
  `searchInPhone`/`searchInNote` into the ranking call) pushed and verified:
  `c8f92b9a2337b75b4799507009224df57bc3b8e5`
- 2026-10-13 house search ranking + strict district filtering (code commit)
  pushed and verified: `cd3bcbb968d4f0cf05671efbdfde5f97882d1512`
- 2026-10-14 mobile card-button/navigation-control UI (code commit)
  pushed and verified: `f660df99eb02b0c9b2881acbdd0f1ddab4cc5b74`
- 2026-10-18 Edit House modal mobile layout/scroll (code commit)
  pushed and verified: `d373f6d555f311c32e92c9e9828da5b34477317c`
- 2026-10-19 keyboard-open modal positioning + navigation stability (code commit)
  pushed and verified: `934c18f3ec341aa19e844e815dea1eb2e4417351`
- Latest verified GitHub `main`: `934c18f3ec341aa19e844e815dea1eb2e4417351`
  (docs commit for this session follows on top)

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

## Modal keyboard stability (2026-10-12)
- Every modal on `/houses` and `/navigation` is a real modal now: the
  `.modal-overlay` divs have **no `onClick`** (13 removed: houses 3,
  navigation 10) and there is **no Escape-to-close** handler anywhere (the
  houses global `keydown` and the navigation page-input Escape branch are
  gone; Escape in `handleAddressKeyDown` only clears address suggestions).
- Shared system: `useModalKeyboardBehavior()` in `src/lib/viewport.ts` is
  called by both pages and delegates from `document`/`visualViewport`, so
  every `.modal-sheet` gets identical behavior with zero per-modal wiring:
  - open-time position lock: on `focusin` inside a sheet, its current top
    offset is pinned with `align-self: flex-start` + `margin-top`, so the
    keyboard resize can never recenter (jump) the dialog
  - the focused input/textarea/select is kept visible by scrolling **only**
    `sheet.scrollTop` with a 20px safe margin (uses
    `visualViewport.offsetTop` + `height`, re-applied on `resize`/`scroll`);
    no `window.scrollTo`, no `scrollIntoView`, no React state on viewport
    resize, no autofocus and no `.focus()` calls
- Navigation placeholder lifecycle (`currentDialogMetricsRef` set to
  `null as unknown as VisualViewportMetrics`, `currentSheetRef`, the three
  duplicated body-lock effects) was removed and replaced by one real effect.
- Body lock works now: both pages toggle `body.nav-dialog-open` (`overflow:
  hidden` in `globals.css`, selector fixed from the never-matching
  `.nav-dialog-open body`). The dead `.nav-dialog-open .page-shell {
  position: fixed; overflow-y: auto }` rule (it would have created a second
  scroll container and reset page scroll) was deleted.
- Unsaved confirmation kept and completed: navigation cancel buttons for page
  input, edit house, and report now route dirty closes through
  `setShowUnsavedChangesConfirmModal` / `setShowRestrictedConfirmModal` with
  the exact same onConfirm resets the old overlay handlers had. "ไม่ปิด"
  returns to the source modal with all typed data intact; only "ปิดทิ้ง"
  discards.
- `.modal-foot` stays in normal document flow (cbab19d preserved). Business
  logic untouched: no Supabase/auth/RLS, GPS, routing, delivery, money, or
  report-rule changes.
- Report: `.ai/reports/2026-10-12-dropway-modal-keyboard-stability.md`
- NOT VERIFIED: real-device Android Chrome keyboard behavior (this environment
  has no signed-in browser session or device); evidence is source-level plus
  compiled CSS, type check, lint, and build.

## House search ranking + district filter (2026-10-13)
- `src/app/houses/page.tsx` now scores in two separated bands. House numbers
  dominate: `rankHouseNumberMatch()` returns `HOUSE_NUMBER_BASE` (1,000,000)
  plus a tier — exact > subForm (`5` → `5/1`) > prefix (`5` → `55`) > contains
  ordered by fewer digits first (`15` before `105`). Text scores from
  `rankTextFields()` are capped at `MAX_TEXT_SCORE` (10,000) so a name/phone/
  note/other-address match can never outrank a house-number match.
- House numbers are read from `address` only (`extractHouseNumber`), so phone
  digits are never treated as a house number; the house-number band is skipped
  entirely when the user turns address search off.
- Search is filtered once (`matchesSearch`), ranking only sorts
  (`sortByRelevance`, explicit stable sort via original index). Turning any of
  `searchInName` / `searchInAddress` / `searchInPhone` / `searchInNote` off
  removes that field from both filtering and scoring.
- District selection is now strict: `extractDistrict()` reads the real amphoe
  marker out of the address (`อ.<amphoe>` or `อำเภอ<amphoe>`) and compares with
  `===`. A row whose address names no amphoe is never guessed into the
  selected district. "ทั้งหมด" disables district filtering.
- The filter effect runs one ordered pipeline: district/area → every existing
  filter (coordinates, house number, phone, village, subdistrict, district
  text, province) → text search → rank → paginate. Ranking runs after
  filtering and can never reintroduce rows from other districts.
- IMPORTANT assumed data shape: addresses are expected to contain the amphoe
  marker (`... ต.<subdistrict> อ.<amphoe> จ.<province>`) because the app's
  address builder writes it and the previous filter also required `อ.`.
  Whether real rows always carry it is NOT VERIFIED from this environment.
- Report: `.ai/reports/2026-10-13-dropway-house-search-ranking-and-district-filter.md`
- NOT VERIFIED: clicking the district dropdown in a real signed-in browser;
  evidence is source-level plus an 18/18 logic harness, type check, lint, build.

## Mobile UI polish (2026-10-14)
- Houses card footer buttons now read **ลบ → นำทาง → แก้ไข**
  (`src/app/houses/page.tsx`). Only the navigate block moved; `icon-btn-danger`,
  `icon-btn`, `btn btn-secondary ml-auto`, every `title`/`aria-label`,
  `openNavigation()`'s Google Maps URL and the `h.lat && h.lng` gate are unchanged.
- `src/app/navigation/page.tsx` GPS row is now a single `flex flex-wrap` row:
  status badge → start-point button → hand-mode picker. The start-point button is
  icon-only (`MapPin`, `btn btn-secondary btn-sm h-11 w-11 p-0`) with `title` +
  `aria-label="ตั้งจุดเริ่มต้น / ลองใหม่"` and still opens `showStartModal`.
- Hand mode is icon-only too: `PanelLeft` (left) **before** `PanelRight` (right),
  44×44 (`h-11 w-11`), `aria-pressed` + `title` + `aria-label`, teal fill for the
  active side. `changeHandMode("left")` stays on the left icon and
  `changeHandMode("right")` on the right icon; `HAND_MODE_KEY`
  (`navigationActionRailSide`), the saved-value read and the default `"right"`
  are byte-identical to the previous commit. Visible "มือซ้าย/มือขวา" labels are
  gone (code comments still mention them on purpose).
- All 8 navigation modal footers use `flex-1 py-3` on **both** buttons with
  `btn btn-secondary` (cancel) / `btn btn-primary` (confirm). The edit-house
  cancel button previously had no width class at all next to a `flex-1` save
  button — that is fixed. `.modal-foot` still has no `position`/`bottom`, so it
  stays in normal document flow.
- Report: `.ai/reports/2026-10-14-dropway-mobile-card-buttons-and-navigation-controls.md`
- NOT VERIFIED / BLOCKED: no signed-in browser or device here, so the actual
  rail movement, tap targets and keyboard-open layout were not clicked through.

## Edit House modal mobile scroll (2026-10-18)
- Only the Edit House modal in `src/app/navigation/page.tsx` changed. It is now
  the app's one split dialog: overlay
  `modal-overlay flex items-end justify-center sm:items-center sm:p-4`, sheet
  `modal-sheet flex h-full w-full max-w-sm flex-col overflow-hidden ... p-0
  sm:h-auto` (global `max-height: min(85dvh, --app-vvh * 0.85)` still applies),
  a `shrink-0` header, one `data-modal-scroll` content area
  (`min-h-0 flex-1 overflow-y-auto overscroll-contain`), and a `shrink-0`
  `.modal-foot` outside the scroller with safe-area bottom padding.
- This is a deliberate, scoped exception to the 2026-10-12 "centered on both
  axes at every breakpoint / no overflow-hidden" modal rule: the user asked for
  a mobile sheet where only content scrolls so header and save/cancel stay put.
  All other 11 modals keep the centered single-scroll structure.
- `src/lib/viewport.ts`: `getScrollContainer()` now returns the sheet's
  `[data-modal-scroll]` element when present, else the sheet. The pinned
  position lock is unchanged and every adjustment still goes through
  `scrollTop` (no `window.scrollTo`, no `scrollIntoView`).
- Coordinate field in that modal now keeps a `houseCoordsInput` text buffer;
  the `lat,lng` parsing rules (null when empty/incomplete/invalid) are
  byte-equivalent to before, and saving still writes `formData.lat/lng`.
  The Google Maps button uses `lat != null && lng != null`.
- Unchanged: `saveHouse()`, `closeModal()`, restricted-confirm dirty check,
  address suggestions/autocomplete, `detectLocation()`, `verifyOnMaps()`, all
  Supabase calls, the other modals, and `/houses` (its Add/Edit modal is still
  single-scroll).
- Report: `.ai/reports/2026-10-18-dropway-edit-house-modal-mobile-scroll.md`
- BLOCKED: tapping fields/suggestions/buttons on a real phone with the keyboard
  open (no signed-in browser or device). Verification is source + built CSS +
  typecheck/lint/build + a 21/21 structural harness.

## Keyboard-open modal positioning + navigation stability (2026-10-19)
- Root cause of "keyboard open → open Edit House → modal sits low":
  `.modal-overlay` was `position: fixed; inset: 0` (layout viewport). The
  keyboard only shrinks the *visual* viewport, so the overlay stayed full
  height and the centred/flex sheet was laid out behind the keyboard. The
  overlay now uses `top: var(--app-vp-top, 0px)`, `bottom: auto`,
  `height: 100vh` fallback overridden by `height: var(--app-vvh, 100dvh)` and
  `overscroll-behavior: contain`, so every dialog (houses 4 + navigation 8)
  opens inside the visible area even when the keyboard is already open.
- `src/lib/viewport.ts`: `--app-vp-top` is now
  `visualViewport.offsetTop` (was `pageTop`) and `--app-kb-inset`
  (`max(0, innerHeight - offsetTop - height)`) was added. The old pin logic
  (`pinSheet`, `sheet.dataset.vpPinned`, inline `alignSelf`/`marginTop`) is
  removed — it held the dialog at its old (low) position. The hook still
  scrolls only the dialog's own scroller (`[data-modal-scroll]` first, else the
  sheet) via `scrollTop`; no `window.scrollTo`, no `scrollIntoView`, no
  autofocus, no React state on viewport resize. This supersedes the pin
  described in the 2026-10-12 section above.
- New in the same hook: a `MutationObserver` on `document.body` that blurs a
  focused text field when it is outside a newly inserted `.modal-sheet` — on
  iOS tapping a button does not move focus, so the page search field could keep
  the keyboard open while a dialog opened.
- Both edit-house dialogs are now split dialogs (fixed header / scrolling
  `data-modal-scroll` content / fixed `shrink-0` footer with safe-area padding):
  the navigation one (2026-10-18) and the houses "เพิ่ม / แก้ไขบ้าน" one
  (2026-10-19). This extends the 2026-10-18 scoped exception; other modals keep
  the centred single-scroll structure. No X button in either modal.
- Navigation page: the floating tools button uses `.nav-fab`
  (`bottom: calc(5rem + env(safe-area-inset-bottom,0px) + var(--app-kb-inset,0px))`,
  `5rem + kb-inset` on desktop) instead of `fixed bottom-20 right-4 z-50`, and
  the page bottom padding on mobile is `pb-44` so the raised button cannot
  cover the last card. The address suggestion dropdown is scrolled into the
  visible content area with `content.scrollTop` when it would fall under the
  footer/keyboard; the original `onMouseDown={(e) => e.preventDefault()}` guard
  is kept.
- Business logic untouched: `saveHouse()`, `closeModal()`, restricted/unsaved
  confirmation and dirty checks, `formData`, address autocomplete helpers,
  `detectLocation()`, `verifyOnMaps()`, `houseCoordsInput` parsing, Supabase/
  API/schema/auth/RLS, Google Maps logic, filtering/ranking/pagination, hand
  mode storage.
- Report: `.ai/reports/2026-10-19-dropway-keyboard-open-modal-and-navigation-stability.md`
- BLOCKED: TEST A–E on a real phone (keyboard already open → open modal, tap
  fields/suggestions/buttons, keyboard close) — no signed-in browser or device
  in this environment. Verification is source + built CSS + typecheck/lint/
  build + a 36/36 structural harness.

## Edit House modal เป็น content-sized อีกครั้ง (2026-10-19, ต่อจากหัวข้อก่อน)
- "Modal ยาวเต็มจอ" ที่ผู้ใช้รายงานมีสาเหตุจาก `h-full` ที่ commit `934c18f`
  เติมให้ sheet + overlay `items-end sm:items-center` (bottom sheet) → sheet
  ยืดเต็ม overlay และเกาะขอบล่างจอ (วัดจริง: 717px ของ viewport 844px,
  bottom = 844; คีย์บอร์ดเปิด 400px → สูง 340px bottom = 400)
- กติกาปัจจุบันของ modal แก้ไขบ้าน (ทั้ง navigation + houses): overlay
  `modal-overlay flex items-center justify-center p-4`, sheet
  `modal-sheet modal-sheet-fit flex w-full max-w-sm|md flex-col overflow-hidden
  rounded-2xl p-0` — **ห้ามใส่** `h-full` / `h-screen` / `h-[100dvh]` /
  `min-h-screen` / `items-stretch` / `rounded-b-none rounded-t-2xl` กลับมา
- `.modal-sheet-fit` (ใน `globals.css`) คือตัวจำกัดความสูง: มือถือ
  `calc(100vh - 2rem)` แล้วทับด้วย `calc(var(--app-vvh, 100dvh) - 2rem)`,
  desktop `min(90vh, calc(var(--app-vvh, 100dvh) - 2rem))` — ใช้ `--app-vvh`
  (พื้นที่มองเห็น) แทน `100dvh` ดิบ เพื่อให้ header/footer อยู่ในพื้นที่มองเห็น
  แม้คีย์บอร์ดเปิดอยู่ และ `[data-modal-scroll]` มี `-webkit-overflow-scrolling`
- วัดด้วย Chromium จริง (viewport 390×844): เนื้อหาปกติ 423px กลางจอ (top 211),
  เนื้อหายาว 812px = 844 − 32 พร้อม content scroll, คีย์บอร์ดเปิด 400px →
  sheet 368px, header top 16, footer bottom 384 (ไม่มีส่วนใดหลุดออกนอกพื้นที่
  มองเห็น); เลื่อน content 200px แล้ว header/footer ไม่ขยับ
- คงระบบเดิมทั้งหมด: overlay อิง `--app-vp-top`/`--app-vvh`,
  `useModalKeyboardBehavior()` (ไม่มี pin, blur เฉพาะ field ด้านหลังที่ focused,
  ไม่ autofocus), body lock `body.nav-dialog-open` (ทั้งสองหน้าใช้ร่วมกัน),
  โครง header `shrink-0` / content เดียว / footer `shrink-0`, ไม่มีปุ่ม X
- `src/app/houses/page.tsx` ได้ effect เลื่อน content ให้ dropdown แนะนำที่อยู่
  พ้นขอบล่าง (สูตรเดียวกับหน้า navigation) — logic อื่นไม่ถูกแตะ
- Report: `.ai/reports/2026-10-19-dropway-edit-house-modal-content-sized-revert.md`
- BLOCKED: การทดสอบบนมือถือจริง (ไม่มี signed-in session/อุปกรณ์ใน environment นี้)

## รายงาน "โอน" + Amount Calculator (2026-10-22)
- Report Problem Modal (`src/app/navigation/page.tsx`,
  "รายงานปัญหา / ฝากไว้ก่อน") มีตัวเลือกที่ 5 **"โอน"** (เต็มแถว) ต่อจาก
  `โทรไม่รับ` / `เลื่อน` / `ตีกลับ` / `อื่นๆ` — ตัวเลือกเดิมไม่เปลี่ยน
- กด "โอน" เปิด Amount Calculator: sheet
  `modal-sheet modal-sheet-fit flex w-full max-w-sm flex-col overflow-hidden p-0`
  (content-sized), header `shrink-0`, กลาง `min-h-0 flex-1 overflow-y-auto`
  + `data-modal-scroll`, footer "ล้าง / ตกลง" `shrink-0`; แป้น 3 คอลัมน์
  `1-9 . 0 ←` เป็น `<button>` ล้วน — **ห้ามเพิ่ม `<input>`/`inputMode`** ใน modal นี้
  (ห้ามให้คีย์บอร์ดระบบเด้ง) และ **ห้าม** ใส่ `h-full`/`100dvh`/`items-stretch`
- Amount เก็บใน `transferAmountInput` (ระหว่างกรอก) และ `reportTransferAmount`
  (ยืนยันแล้ว) → `confirmReport()` สร้าง `report_reason` =
  `รอโอน [จำนวนเงิน] บาท` แล้ว update `user_navigation_houses`
  (`delivery_status`/`report_reason`/`reported_at`) ผ่าน flow เดิม,
  `reloadNavigation()` — ไม่มี mock/API/schema ใหม่
- Confirmation ใช้ของเดิม `showRestrictedConfirmModal` (`modal-overlay-top`,
  z-index 1000): "ไม่ปิด" กลับมาพร้อมจำนวนเดิม, "ปิดทิ้ง" ทิ้งจำนวน;
  `anyDialogOpen` รวม modal นี้แล้ว (body lock ทำงาน)
- Calculator เงินทอนเดิม (`showCalculatorModal`) ยังเหมือนเดิมทุกอย่าง —
  ใช้เฉพาะ flow ส่งงาน/เงินทอน ไม่ถูก reuse เป็นตัวกรอกจำนวนเงินโอน
- ตรวจแล้ว: `npx tsc --noEmit`, `next lint`, `npm run build` (9/9), E2E
  Chromium 33/33 (payload จริงผ่าน intercepted Supabase REST: `รอโอน 100 บาท`,
  `รอโอน 250 บาท`, `รอโอน 250.50 บาท`; 390×520 ยังเห็นปุ่มตกลง)
- Report: `.ai/reports/2026-10-22-dropway-navigation-report-transfer.md`
- BLOCKED: real-device keyboard/touch (ไม่มีอุปกรณ์ใน environment นี้)

## นำรายการกลับไป "วันนี้" (2026-10-22)
- แถบ "ส่งแล้ว" (`viewMode === "delivered"`) มีปุ่ม **↩ นำกลับไปวันนี้**
  ในการ์ดทุกใบ — แสดงเฉพาะแท็บนี้ ไม่แตะ `.action-rail` เดิม; ปุ่มสูง 44px
  เต็มความกว้างในเนื้อการ์ด
- สถานะเดิม: `delivery_status = "delivered"` (เขียนโดย `confirmDeliver()`)
  → นำกลับเป็น `delivery_status = "pending"` + `delivered_at = null`
  ซึ่งเป็นค่าที่แถบ "วันนี้" กรองอยู่แล้ว (`!delivery_status ||
  delivery_status === "pending"`) — **ไม่มี status/ตาราง/API ใหม่**
- Mutation: update แถวเดิมใน `user_navigation_houses`
  (`confirmRestoreToToday()`), guard `.eq("id", nav_id).eq("delivery_status",
  "delivered")`, กันกดซ้ำด้วย `restoreInFlightRef` + `isRestoreSubmitting`,
  แล้วอ่าน `navigation_view` ยืนยันผลจริงก่อน `reloadNavigation()`;
  error → toast "นำรายการกลับไปวันนี้ไม่สำเร็จ กรุณาลองใหม่" และไม่ย้ายการ์ด
- ข้อมูลเดิมทั้งหมดคงอยู่: `delivery_note` (ยอดเงิน/การชำระ), `driver_note`,
  `report_reason`, ที่อยู่/เบอร์/พิกัด/note — ไม่ delete/insert record
- Confirmation: modal ใหม่ใช้ชั้น `modal-overlay-top` (z-index 1000) +
  `.modal-sheet` + `.modal-foot` + `btn btn-secondary`/`btn btn-primary`
  ตาม pattern confirmation เดิม (dialog "unsaved changes" เดิมมีข้อความ
  คงที่ จึง reuse ตัว component ไม่ได้) — `anyDialogOpen` รวม modal นี้แล้ว
- ไม่มี audit/history ในระบบเดิม จึงไม่เพิ่มระบบ history ใหม่
- ตรวจแล้ว: `npx tsc --noEmit`, `next lint`, `npm run build` (9/9), E2E
  Chromium 26/26 (cancel ไม่ยิง mutation, confirm ย้ายรายการ, double-tap =
  1 PATCH, error คงสถานะเดิม, refresh/new session ยังถูกต้อง,
  รายการอื่นไม่เปลี่ยน)
- Report: `.ai/reports/2026-10-22-dropway-navigation-restore-to-today.md`
- BLOCKED: real Supabase RLS/database + real-device touch (E2E ใช้ stateful
  REST stub แทน backend จริง)

## Navigation UI (2026-10-12)
- Card actions live in a vertical icon-only rail (`src/app/globals.css` →
  `.action-rail`), 44px targets, `aria-label` on every button.
- Hand mode: header picker, default right, persisted as
  `localStorage["navigationActionRailSide"]` with try/catch. (Since
  2026-10-14 the picker is icon-only `PanelLeft`/`PanelRight` in the GPS row —
  see the 2026-10-14 section above.)
- No `autoFocus` remains in `src/`; dialogs focus the trigger on close instead.
- Dialog sizing: `.modal-sheet` (`min(85dvh, --app-vvh * 0.85)`) with
  `overflow-y: auto`; `.modal-foot` is a normal in-flow block (no sticky, no
  `bottom: 0`, no `z-index`, no background); `--app-vvh` comes from
  `src/lib/viewport.ts`.
- Business logic, Supabase calls, statuses, money parsing and distance math were
  deliberately left untouched.

## Dialog dismissal routing (2026-10-12)
- Every navigation sheet that can be dismissed with unsaved input now routes to
  `setShowRestrictedConfirmModal(true)` instead of closing immediately:
  page-number input, filter, edit house, start position, deliver, comment,
  calculator, and report.
- The one keyboard dismiss path for the page-number dialog now routes to
  `setShowUnsavedChangesConfirmModal(true)` when dirty.
- Cancel, X, and overlay closures that do not touch app state now consistently
  use `onMouseDown={(e) => e.preventDefault()}` plus clearer `aria-label`s,
  and modal sheets use `onClick={(e) => e.stopPropagation()}` so the overlay
  handler can decide between "close cleanly" and "show the shared confirmation
  hook".
- This change is limited to dialog-dismiss semantics; it does not change any
  Supabase call, status, routing, money parsing, or modal content.
- Report: saved in this session as task `.ai/tasks/active/SHARED_CONFIRM_DIALOG_TASK.md`
  and committed under `8aa1f30982724a86a69c7a40ba78f8f55744ba4e`.

## Modal footer in normal flow (2026-10-12)
- `.modal-foot` in `src/app/globals.css` is an ordinary in-flow footer again:
  `margin-top: 1rem`, `padding-top: 0.75rem`,
  `border-top: 1px solid var(--border)` and nothing else. `position: sticky`,
  `bottom: 0`, `z-index: 1`, the opaque background and the extra
  `padding-bottom` were removed, so save/cancel buttons no longer float over
  form text and no longer follow the viewport while scrolling.
- This follows the pre-refactor behaviour of commit
  `038a9f871bcdff6f6abc0f8265583e9171f4108c`, whose `globals.css` had no
  `.modal-foot` rule at all. The project was not rolled back.
- No JSX changed: all `.modal-foot` uses are plain `<div>` wrappers
  (navigation 8, houses 3). Business logic, validation, save/cancel flow,
  unsaved-change confirmation, Supabase calls, GPS, routing, delivery and money
  math are untouched.
- Modal scroll stays intact (`.modal-sheet` keeps `overflow-y: auto` and
  `min(85dvh, --app-vvh * 0.85)`), centered overlay and 4-corner rounding stay
  intact, and keyboard handling stays in `src/lib/viewport.ts`.
- Report: `.ai/reports/2026-10-12-dropway-modal-footer-normal-flow.md`

## Last verified full product audit
- `.ai/reports/2026-10-12-dropway-ui-ux-redesign-audit.md`
- Result: PASS for `git diff --check`, `npx tsc --noEmit`, `npm run lint`,
  `npm run build`
- BLOCKED: Supabase RLS/ownership verification, CI/deployment status
- NOT VERIFIED: real-device mobile behaviour and end-to-end Supabase workflows

## Local synchronization status
- Local branch: `main`
- Local `HEAD` SHA: `f660df99eb02b0c9b2881acbdd0f1ddab4cc5b74` (matches
  `origin/main`; verified with `git ls-remote --heads origin main`)
  before this: `934d4b02dda8c11c42eb4ea99e8dcc29b1866d5a`
- Working tree status: untracked workspace artifacts only; no modified tracked
  files after push
- Difference from `origin/main`: none

## Last verification timestamp
- UTC: 2026-10-12 (modal centering session)
- Pushed again: 2026-10-12 (dialog-dismiss routing + shared restricted/unsaved
  hook)
- Pushed again: 2026-10-12 (modal save/cancel footer back to normal flow)
- Pushed again: 2026-10-14 (mobile card-button order, navigation icon-only
  controls, modal footer button widths)

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
- **`middleware.ts` is not active in this repository (verified 2026-10-12).**  The file is in the repo root while the app lives in `src/app`, so Next.js never  loads it: a cookie-less request to an unmatched path returns `404` instead of  the matcher's `307` → `/login`, `/houses` returns `200` without cookies, and the  production build route table lists no `Middleware` entry. Route protection is  therefore client-side only and real data protection depends on Supabase RLS.  The file also checks legacy `sb-access-token` / `sb-refresh-token` cookies while  `@supabase/ssr` 0.8.0 writes `sb-<project-ref>-auth-token`, so simply moving the  file would likely lock signed-in users out. Documented as its own task in  `.ai/reports/2026-10-12-dropway-ui-ux-redesign-audit.md`; **not changed** by the  redesign session because it alters authorization behaviour.
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
- Modal keyboard stability (backdrop/Escape no longer close modals, shared
  `useModalKeyboardBehavior`, position pinning, working body lock) pushed as
  `90c1d1d08b793702890ec25bd16315d12858f6d0`
- Follow-up: interactive (browser/device) verification of the keyboard flow —
  open modal → tap each field → field scrolls above the keyboard, modal does
  not jump, backdrop/Escape do nothing, cancel → confirmation keeps data —
  remains outstanding on real Android Chrome.

## Next recommended task
- Decide whether `setShowRestrictedConfirmModal` / `setShowUnsavedChangesConfirmModal` should become one real shared modal component, or whether the current hook-only approach is enough.
- If a shared modal is wanted, define its payload, cancel/undo behavior, and visual contract before extracting it from `src/app/navigation/page.tsx`.
- Verify real-device keyboard/safe-area behavior on Android Chrome and iOS Safari if navigation dialogs are touched again.

## Commit status
- Phase 1, Phase 1.1, the 2026-10-12 full-system capture, modal centering, and dialog-dismiss routing are on `main`.

## Local workspace notes
- `.tmp/`, `.workflow/`, `WORKING.md`, generated `.gz` snapshots, and
  `package-lock.json` are untracked workspace artifacts from this session and
  are intentionally not committed.
- `.ai/tasks/active/SHARED_CONFIRM_DIALOG_TASK.md` is an in-session task note and
  is also untracked.
