# 2026-10-22 — Navigation Report "โอน" + Amount Calculator

## Task
Add a `โอน` option to the Report Problem Modal of `/navigation`. Tapping it
opens an in-app numeric keypad, and a confirmed amount becomes the automatic
comment/reason `รอโอน [จำนวนเงิน] บาท`, saved through the existing report flow
(no mock data, no schema/API change).

## 1. Where the existing pieces are
- **Report Modal**: `src/app/navigation/page.tsx` → "รายงานปัญหา / ฝากไว้ก่อน"
  (rendered near the end of the page). Options are `โทรไม่รับ` / `เลื่อน` /
  `ตีกลับ` / `อื่นๆ`, held in `reportReason` + `reportReasonCustom`.
- **Report save**: `confirmReport()` updates `user_navigation_houses` with
  `delivery_status: "reported"`, `report_reason`, `reported_at`, then
  `reloadNavigation()`. The replace "comment" in this product is
  `report_reason` (the comment modal uses `driver_note` and is untouched).
- **Existing calculator**: `showCalculatorModal`, `calculatorInput`,
  `calculatorResult` — a cash-change calculator for the delivery flow. It is
  coupled to `deliverNote` / `localCash` / `localTransfer`, computes change, has
  no decimal point and no confirm button, so it could not be reused for amount
  entry without changing its behavior (forbidden).
- **Confirmation**: `showRestrictedConfirmModal` + `restrictedConfirmPayload`,
  rendered with `modal-overlay-top` (z-index 1000), above normal modals
  (z-index 50). `ไม่ปิด` only closes the confirmation; `ปิดทิ้ง` runs the payload.
- **Layout system**: `.modal-overlay` is anchored to the visual viewport
  (`--app-vp-top` / `--app-vvh`), `.modal-sheet-fit` caps height,
  `[data-modal-scroll]` marks the single scroll area, body lock via
  `body.nav-dialog-open`, no backdrop/Escape dismissal.

## 2. What was reused
- The existing modal shell/height system (`.modal-overlay`, `.modal-sheet`,
  `.modal-sheet-fit`, `[data-modal-scroll]`) and the body-lock gate
  `anyDialogOpen`.
- The existing confirmation dialog and its payload pattern (no new dialog).
- The existing report save path `confirmReport()` and `reloadNavigation()`.
- The existing keypad interaction pattern from the cash calculator (string
  state + concat + `slice(0, -1)` backspace + clear), extended with `.` and a
  confirm button.
- No duplicate change calculator, no duplicate report system, no new API/schema.

## 3. Where `โอน` was added
`src/app/navigation/page.tsx`, report option grid (5th button, full row). Tapping
it calls `openTransferAmountModal()` instead of just setting the reason, so the
amount must be confirmed before the reason becomes `โอน`.

## 4. Amount state
- `showTransferAmountModal` — calculator visibility.
- `transferAmountInput` — the value being typed (`"100"`, `"250.50"`).
- `reportTransferAmount` — the confirmed value handed back to the report flow;
  reopening the calculator prefills it.

Validation: digits only via buttons, one decimal point, max 2 decimals, max 9
integer digits, no `0`/empty/trailing-dot values, `ตกลง` disabled until valid.

## 5. Where the comment is built
`confirmReport()`:
```
reportReason === "โอน"
  ? `รอโอน ${reportTransferAmount} บาท`
  : ...
```
The preview box in the report modal shows the same string before saving, and
`รายงานแล้ว` is disabled while `โอน` has no confirmed amount.

## 6. How it is persisted
The unchanged existing flow: `supabase.from("user_navigation_houses").update({
delivery_status: "reported", report_reason, reported_at }).eq("id", nav_id)`,
followed by `reloadNavigation()`. No mock data, no UI-only change.

## 7. Files changed
- `src/app/navigation/page.tsx` (state, handlers, report option, preview,
  reset paths, amount calculator modal)
- `.ai/CHANGELOG.md`, `.ai/CURRENT_STATE.md`, `.ai/AI_HANDOFF.md`, this report
- Test harness (untracked): `tmp/verify_transfer_report.mjs`

## 8. Checks
- `npx tsc --noEmit` → 0
- `npx next lint --file src/app/navigation/page.tsx` → 0
- `npm run build` → success (9/9 routes)
- E2E Chromium (Playwright, Supabase REST intercepted) → **33/33 checks**, at
  390×844 and 390×520:
  - `1 0 0` → `ตกลง` → `รอโอน 100 บาท` → PATCH body
    `{"delivery_status":"reported","report_reason":"รอโอน 100 บาท","reported_at":"…"}`
  - `2 5 0` → `รอโอน 250 บาท` persisted
  - `2 5 0 . 5 0` → `รอโอน 250.50 บาท` persisted
  - backspace (`123` → `12`), clear (→ `0`), `ตกลง` disabled when empty,
    second dot ignored, third decimal ignored
  - no `input`/`textarea`/`contenteditable` inside the calculator; focus stays
    on a button
  - calculator is content-sized (600px of 844px, centered), Report Modal stays
    mounted underneath; at 390×520 the sheet is 488px, header and `ตกลง` remain
    inside the visible area and keypad taps still work
  - confirmation z-index 1000 > modal 50; `ไม่ปิด` returns with the amount
    kept; `ปิดทิ้ง` closes and discards; reopening after discard shows `0`
  - legacy `โทรไม่รับ` and `อื่นๆ` still persist their original values

## 9. What passed
All of the above. The verified deliverable is the same source that was built:
tsc/lint/build ran after the final edit, and the E2E rerun (33/33) happened
after `freebuff-preview restart` on that final source.

## 10. Remaining issues / limitations
- **BLOCKED**: real-device keyboard and touch behavior (no physical device; the
  "no native keyboard" proof is structural — zero text inputs plus button-only
  keypad — and viewport emulation, not an actual iOS/Android keyboard).
- The amount calculator does not add `00` or expression math; it is deliberately
  limited to a valid amount between a single dot and two decimals.
- Discarding an edited amount (`ปิดทิ้ง`) also clears the previously confirmed
  amount, by design ("ทิ้งข้อมูลจำนวนเงิน"); the user can tap `โอน` again.
- Existing report reasons that are neither a preset nor `อื่นๆ` (including old
  `รอโอน …` rows) still open under `อื่นๆ`, unchanged from before.
