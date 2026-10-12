# DropWay — Mobile modal + keyboard stability (2026-10-12)

## Scope
- Modal ทั้งหมดของ `src/app/houses/page.tsx` (เพิ่มบ้าน, แก้ไขบ้าน, filter, page input, ยืนยันลบ)
- Modal ทั้งหมดของ `src/app/navigation/page.tsx` (แก้ไขบ้าน, filter, page input, จุดเริ่มต้น,
  คอมเมนต์, ส่งงาน, รายงาน, เครื่องคิดเลข, restricted confirm, unsaved confirm)
- ระบบ keyboard/viewport กลางใน `src/lib/viewport.ts` และ rules ใน `src/app/globals.css`

Baseline before the change: `f0f9197377db69f8b8a824355263cf8b48e3edc9`
(`origin/main` verified before starting).

## What was wrong
1. **Backdrop ปิด modal ได้** — 13 จุด (`houses` 3, `navigation` 10) มี
   `onClick` บน `.modal-overlay` ที่ปิด modal / discard ข้อมูล
2. **Escape ปิด modal ได้** — global `keydown` ใน houses และ
   `onKeyDown` Escape ใน page-input ของ navigation
3. **Placeholder metrics ref** — `currentDialogMetricsRef` ถูกตั้งเป็น
   `null as unknown as VisualViewportMetrics` และไม่เคยถูกผูกกับ sheet จริง
   (ทั้งสองหน้าเรียกแต่ `useVisualViewportHeightVar()` ซึ่งทิ้ง `sheetRef`
   ไป ทำให้ `scrollActiveElementIntoVisible` ไม่เคยถูกเรียก)
4. **Body lock ใช้ไม่ได้จริง** — JS ตั้ง `data-nav-dialog-position-lock`
   แต่ CSS เขียน `.nav-dialog-open body` / `.nav-dialog-open .page-shell`
   (ไม่มี element ไหนได้ class นี้) และ rule `.page-shell { position: fixed;
   overflow-y: auto }` ถ้าเปิดใช้จริงจะสร้าง scroll container ที่สอง
5. **Math ของ focus scroll ผิด** — เทียบ `getBoundingClientRect()` (layout
   viewport) กับ `visualViewport.pageTop` (document coordinate)

## What changed
- `src/lib/viewport.ts` → ระบบกลางระบบเดียว:
  - `useVisualViewportMetrics()` เขียนเฉพาะ CSS vars (`--app-vvh`,
    `--app-vp-top`, `--app-vp-left`) ไม่มี state ไม่มี re-render
  - **`useModalKeyboardBehavior()`** (ใหม่, ใช้ร่วมกันทั้งสองหน้า):
    - delegate `focusin` (capture) ที่ `document` — ทุก `.modal-sheet`
      ได้พฤติกรรมเดียวกันโดยไม่ต้องแก้ per-modal
    - **ล็อกตำแหน่งตอนเปิด**: วัด `top` ของ sheet ตอนผู้ใช้แตะ field แล้ว
      pin ด้วย `align-self: flex-start` + `margin-top` → keyboard resize
      ไม่ recenter ไม่กระโดด
    - **เลื่อนเฉพาะเนื้อหาใน sheet**: `sheet.scrollTop` เพียงอย่างเดียว
      (margin 20px จากขอบ visible viewport) — ไม่มี `window.scrollTo`,
      ไม่มี `scrollIntoView`, ไม่มีการเลื่อนหน้า
    - ฟัง `visualViewport` `resize`/`scroll` เพื่อตาม field ระหว่างแอนิเมชันคีย์บอร์ด
    - ไม่ autofocus ไม่ `.focus()` ใด ๆ ทั้งสิ้น
  - ลบ `useVisualViewportHeightVar` และ type `VisualViewportMetrics`
    (ไม่มี call site เหลือ)
- `src/app/navigation/page.tsx`:
  - ลบ `currentDialogMetricsRef`, placeholder effect ทั้ง 3 และ
    `currentSheetRef` ที่ไม่ได้ใช้ → เปลี่ยนเป็น
    `useModalKeyboardBehavior()` + body-lock effect เดียว (`body.nav-dialog-open`)
  - ลบ `onClick` ของ `.modal-overlay` ทั้ง 10 จุด (backdrop ล้วน ๆ)
  - ลบ Escape-close ใน page input (เหลือ Enter submit)
  - ปุ่ม ยกเลิก ของ page input / แก้ไขบ้าน / รายงาน ผ่าน
    restricted/unsaved confirmation เมื่อ dirty (ข้อมูลอยู่ครบจนกว่าจะยืนยัน
    "ปิดทิ้ง"; "ไม่ปิด" กลับไป modal เดิม) — dirty logic และ onConfirm reset
    เดิมถูกย้ายมาจาก overlay เดิมทุกตัวอักษร
- `src/app/houses/page.tsx`:
  - ใช้ `useModalKeyboardBehavior()` + body-lock effect (เพิ่มใหม่)
  - ลบ `onClick` ของ `.modal-overlay` ทั้ง 3 จุด
  - ลบ global Escape handler ที่ปิด modal (Escape ใน
    `handleAddressKeyDown` ยังอยู่เพราะใช้ล้าง list suggestion เท่านั้น ไม่ปิด modal)
- `src/app/globals.css`:
  - `.nav-dialog-open body` → `body.nav-dialog-open { overflow: hidden }`
    (selector เดิมไม่มีวัน match)
  - ลบ `.nav-dialog-open .page-shell { position: fixed; overflow-y: auto }`
    (เดดโค้ด + สร้าง scroll container ที่สอง + reset ตำแหน่ง scroll หน้า)
  - `.modal-foot` ยังเป็น normal flow เท่าเดิม (ไม่มี sticky/bottom/z-index)

## Not touched (business logic ไม่มีการแตะ)
Supabase query/auth/RLS, GPS/watchPosition, save/delete house, navigation
routing, delivery status, money/COD calculation, report rules, database
schema, `.modal-sheet` sizing (`min(85dvh, --app-vvh * 0.85)`, `overflow-y:
auto`), dialog semantics (`role="dialog"`, `aria-modal`), FAB menu.

## Checks actually run (exit codes)
- `npx tsc -b --noEmit` → 0
- `npm run lint` → 0 ("No ESLint warnings or errors")
- `npm run build` → 0 (6 routes, static)
- `git diff --check`, `git diff --cached --check` → 0
- compiled CSS (`.next/static/css`): `body.nav-dialog-open{overflow:hidden}`,
  `.modal-foot{margin-top:1rem;padding-top:.75rem;border-top:1px solid var(--border)}`
  — ไม่มี sticky/bottom/z-index, ไม่มี `.nav-dialog-open .page-shell`
- greps: 0 overlay `onClick` หลงเหลือ, 0 `autoFocus`, 0 `as unknown as`,
  0 `position: sticky` บน `.modal-foot`; `window.scrollTo` เหลือเฉพาะ
  `goToPage()` (pagination ไม่เกี่ยวกับ keyboard)

## Checklist ตามคำขอ (ระดับ static — ดูพฤติกรรมจริงไม่ได้ใน environment นี้)
| Criteria | ผล |
| --- | --- |
| Backdrop ไม่ปิด modal (ทุกตัวทั้งสองหน้า) | PASS (ไม่มี overlay onClick เหลือ) |
| Escape ไม่ปิด modal | PASS (ไม่มี Escape-close handler เหลือ) |
| ปิดผ่านปุ่มใน modal เท่านั้น | PASS (ทุก modal มีปุ่มยกเลิก/ปิด/บันทึก/ยืนยัน) |
| Keyboard ไม่ recenter/กระโดด | PASS โดย design (pin top ด้วย inline style, ไม่มี state ตอน resize) |
| Field ที่แตะเลื่อนเข้าพื้นที่มองเห็น (margin ~20px) | PASS โดย design (`sheet.scrollTop` เท่านั้น) |
| ไม่ scroll หน้า entire page | PASS (ไม่มี window scroll ใน keyboard path) |
| Save/Cancel อยู่ท้าย content, ไม่ลอย | PASS (`.modal-foot` normal flow ต่อจาก cbab19d) |
| ไม่มี autofocus | PASS (grep 0 จุด) |
| Unsaved confirmation ยังทำงาน + ข้อมูลอยู่ครบ | PASS โดย design (ยกเลิก → confirm → "ไม่ปิด" กลับมา / "ปิดทิ้ง" discard) |
| ระบบเดียว Home + Navigation | PASS (hook เดียว `useModalKeyboardBehavior`) |
| build/lint/diff check | PASS |

## NOT VERIFIED / limitations
- **การทดสอบ interaction บนอุปกรณ์จริง (Android Chrome, keyboard เปิด/ปิด,
  portrait/landscape) ยังไม่ได้ทำ** — environment นี้ไม่มี browser session
  ที่ล็อกอิน/อุปกรณ์จริง การันตีได้ระดับ source + compiled CSS + type/lint/build
  เท่านั้น
- ไม่มี automated tests ใน repo (ไม่มี test script ใน `package.json`)
- พฤติกรรม browser ตอน keyboard เปิดขึ้นอยู่กับ `interactive-widget`
  ของ Chrome; โค้ดรองรับทั้งกรณี layout viewport ย่อและ visual viewport ย่อ
  (ใช้ `visualViewport.offsetTop` + pin top ของ sheet)

## Git
- Code commit: `90c1d1d08b793702890ec25bd16315d12858f6d0`
- Pushed to `origin/main`, ตรวจด้วย `git ls-remote origin refs/heads/main`
  แล้วว่าตรงกับ `git rev-parse HEAD`
