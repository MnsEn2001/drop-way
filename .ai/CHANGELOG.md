# .ai/CHANGELOG.md

## 2026-10-14 — Mobile UI: ปุ่มในการ์ดบ้าน + ปุ่มควบคุมหน้า Navigation + ขนาดปุ่มใน modal

### หัวข้อ
- การ์ดบ้าน: เรียงปุ่มเป็น ลบ → นำทาง → แก้ไข
- หน้า Navigation: ปุ่มตั้งจุดเริ่มต้น + ปุ่มซ้าย/ขวาเป็นไอคอนล้วน อยู่ในแถวเดียวกัน
- Modal หน้า Navigation: ปุ่มยกเลิก/บันทึกกว้างเท่ากันทุกคู่

### Root cause / เหตุที่แก้
- ปุ่ม "นำทาง" ถูกวางหลังปุ่มแก้ไข และปุ่มมือซ้าย/ขวาแยกเป็นอีกแถว (`mt-3`)
  ใต้แถว GPS ทำให้ปุ่มควบคุมตกออกจากโซนนิ้วโป้ง และยังมีข้อความ "มือขวา/มือซ้าย"
  กินความกว้างบนจอมือถือ
- modal แก้ไขบ้าน (หน้า navigation) ปุ่ม "ยกเลิก" **ไม่มี class ความกว้างเลย**
  ขณะที่ปุ่ม "บันทึก" เป็น `flex-1` → สองปุ่มกว้างไม่เท่ากัน

### เปลี่ยนอะไร
- `src/app/houses/page.tsx`: ย้ายบล็อกปุ่มนำทางขึ้นมาก่อนปุ่มแก้ไข (ฝั่ง footer ของการ์ด)
  ลำดับใหม่ ลบ → นำทาง → แก้ไข — ไม่แตะ class (`icon-btn-danger`, `icon-btn`,
  `btn btn-secondary ml-auto`), `title`/`aria-label`, `openNavigation()` (Google Maps)
  หรือเงื่อนไข `h.lat && h.lng`
- `src/app/navigation/page.tsx`:
  - ปุ่มตั้งจุดเริ่มต้นเหลือไอคอน `MapPin` ล้วน (`btn btn-secondary btn-sm h-11 w-11 p-0`)
    คง `title` + `aria-label` และยังเปิด start modal เดิม
  - กลุ่มปุ่มมือย้ายเข้าไปในแถว `flex flex-wrap` เดียวกับปุ่มตั้งจุดเริ่มต้น
    (ลบ `mt-3`), ลดเหลือไอคอน `PanelLeft` (ซ้าย) ก่อน `PanelRight` (ขวา)
    ปุ่มละ 44×44 (`h-11 w-11`), คง `aria-pressed` + เพิ่ม `title`/`aria-label`,
    สี teal สำหรับด้านที่เลือก, `changeHandMode("left"/"right")` และ
    `localStorage["navigationActionRailSide"]` + ค่าเริ่มต้นมือขวาเหมือนเดิมทุกไบต์
  - modal footer ทั้ง 8 ตัวเป็น `btn ... flex-1 py-3` ทั้งคู่ (secondary = ยกเลิก/ปฏิเสธ,
    primary = ยืนยัน) และปุ่มยกเลิกของ modal แก้ไขบ้านได้ class มาแล้ว
- ไม่แตะ logic การบันทึก/ทิ้งข้อมูล, loading/disabled, Supabase, RLS, การจัดอันดับบ้าน,
  การนำทาง หรือ `.modal-foot` ใน `globals.css`

### สถานะ
- commit: `f660df99eb02b0c9b2881acbdd0f1ddab4cc5b74`
- ผ่าน `git diff --check`, `npx tsc --noEmit`, `npm run lint`, `npm run build`
- harness ตรวจ source 32/32 PASS (ดูรายงาน)
- BLOCKED: การคลิก/ตรวจบนเบราว์เซอร์หรือมือถือจริง (ไม่มี session ที่ล็อกอินได้),
  Supabase RLS
- Report: `.ai/reports/2026-10-14-dropway-mobile-card-buttons-and-navigation-controls.md`

## 2026-10-13 — House Search Ranking + Strict District Filtering

### หัวข้อ
- ค้นหาเลขบ้านจัดอันดับตาม "ความตรงของเลขบ้าน" ก่อนคะแนนข้อความเสมอ
- เลือกอำเภอแล้วเหลือเฉพาะบ้านของอำเภอนั้นจริง ๆ (strict)

### Root cause
- `rankHouse()` รวมคะแนนทุกฟิลด์ (ชื่อ/ที่อยู่/เบอร์/หมายเหตุ) เป็นก้อนเดียว
  และเอา bonus ของเลขบ้านบวกเข้าไปในก้อนเดียวกัน → ข้อความแซงเลขบ้านได้
- useEffect กรองข้อมูลมี `selectedDistrict` และตัวกรองอื่น ๆ อยู่ใน dependency
  array แต่ **ไม่มีการใช้ใน body เลย** → ตัวกรองอำเภอ/พิกัด/หมู่/ตำบล/จังหวัด
  ไม่มีผล (regression จากตอนเขียน ranking ทับใน `2a08bb8`)

### เปลี่ยนอะไร
- `src/app/houses/page.tsx`:
  - เพิ่ม `extractDistrict()` อ่านเครื่องหมายอำเภอจริงจากที่อยู่
    (`อ.<อำเภอ>` / `อำเภอ<อำเภอ>`), เทียบแบบตรงทั้งชื่อ, ที่อยู่ที่ไม่ระบุอำเภอ
    จะไม่ถูกเดาเข้าอำเภอที่เลือก
  - เพิ่ม `rankHouseNumberMatch()` แยกระดับเลขบ้าน: exact → subForm (5 → 5/1)
    → prefix (5 → 55) → contains เรียงจำนวนหลักน้อยก่อน (15 ก่อน 105)
    บนฐาน `HOUSE_NUMBER_BASE` ที่สูงกว่าคะแนนข้อความเสมอ
  - เพิ่ม `rankTextFields()` (จำกัดเพดาน `MAX_TEXT_SCORE`) + `matchesSearch()`
    (กรองครั้งเดียว) + `sortByRelevance()` (เรียงอย่างเดียว, stable ด้วย index)
  - คืนตัวกรองทั้งหมดที่หลุดไป และจัดลำดับ pipeline:
    อำเภอ/พื้นที่ → ตัวกรองเดิม → ค้นหาข้อความ → จัดอันดับ → แบ่งหน้า
  - ลบ `rankHouseNumber()` / `rankResults()` เดิมที่รวมคะแนนและกรองซ้ำ
- ไม่แตะ schema, dependency, env, query/session/RLS หรือไฟล์อื่น

### สถานะ
- commit: `cd3bcbb968d4f0cf05671efbdfde5f97882d1512`
- ผ่าน `npx tsc -b --noEmit`, `npm run lint`, `npm run build`, `git diff --check`
- harness ทดสอบฟังก์ชันจริง 18/18 PASS (ดูรายงาน)
- BLOCKED: ตรวจรูปแบบอำเภอในฐานข้อมูลจริง, interaction บนเบราว์เซอร์จริง,
  Supabase RLS
- Report: `.ai/reports/2026-10-13-dropway-house-search-ranking-and-district-filter.md`

## 2026-10-12 — Modal เข้มงวด: backdrop/Escape ไม่ปิด + คีย์บอร์ดไม่ดัน modal

### หัวข้อ
- Modal ทั้งหน้าบ้านและหน้า navigation ปิดได้จากปุ่มใน dialog เท่านั้น
- คีย์บอร์ดมือถือ (Android Chrome / visual viewport) ไม่ทำให้ modal กระโดด
- ระบบ keyboard handling กลางระบบเดียว `useModalKeyboardBehavior()`

### เปลี่ยนอะไร
- `src/lib/viewport.ts`: เพิ่ม `useModalKeyboardBehavior()` — pin ตำแหน่ง
  modal ตอนเปิด (`align-self: flex-start` + `margin-top`) และเลื่อนเฉพาะ
  เนื้อหาใน `.modal-sheet` (`sheet.scrollTop` + margin 20px) ให้ field ที่ผู้ใช้
  แตะอยู่เหนือคีย์บอร์ด ไม่มี `window.scrollTo`, ไม่มี `scrollIntoView`,
  ไม่มี state ตอน visualViewport resize; ลบ `useVisualViewportHeightVar`
  และ type `VisualViewportMetrics`
- `src/app/navigation/page.tsx`: ลบ `currentDialogMetricsRef` + placeholder
  `null as unknown as` + `currentSheetRef` ที่ไม่ได้ใช้, ใช้ hook กลาง, body
  lock ผ่าน `body.nav-dialog-open`, ลบ overlay `onClick` 10 จุด, ลบ
  Escape-close ของ page input, และให้ปุ่มยกเลิกของ page input/แก้ไขบ้าน/
  รายงาน ผ่าน confirmation เมื่อ dirty
- `src/app/houses/page.tsx`: ใช้ hook กลาง, เพิ่ม body lock, ลบ overlay
  `onClick` 3 จุด, ลบ global Escape handler ที่ปิด modal
- `src/app/globals.css`: `.nav-dialog-open body` → `body.nav-dialog-open`
  (selector เดิมไม่มีวัน match), ลบเดด rule `.nav-dialog-open .page-shell
  { position: fixed; overflow-y: auto }`; `.modal-foot` ยัง normal flow

### ไม่ได้ทำอะไร
- ไม่แตะ business logic (Supabase, GPS, routing, delivery, money, report rules)
- ไม่เปลี่ยน `.modal-sheet` sizing, dialog semantics, FAB menu
- ไม่ rollback ทั้งโปรเจกต์ และรักษา cbab19d (footer normal flow) ไว้

### สถานะ
- พุชไปแล้วที่ `90c1d1d08b793702890ec25bd16315d12858f6d0`
- ผ่าน `npx tsc -b --noEmit`, `npm run lint`, `npm run build`,
  `git diff --check`, `git diff --cached --check`
- ยังไม่ได้ทดสอบ interaction บนอุปกรณ์จริง (Android Chrome) — NOT VERIFIED
- Report: `.ai/reports/2026-10-12-dropway-modal-keyboard-stability.md`

## 2026-10-12

### หัวข้อ
- Modal centering across breakpoints
- Dialog-dismiss routing for the navigation page
- ไม่มี shared modal UI ใหม่ในรอบนี้

### เปลี่ยนอะไร
- All navigation sheets that support dirty dismissal now route through
  `setShowRestrictedConfirmModal(true)` instead of closing themselves.
- The keyboard dismiss path for the page-number dialog now routes through
  `setShowUnsavedChangesConfirmModal(true)` when dirty.
- Dismiss buttons that do not change state use explicit `onMouseDown`
  preventDefault and clearer `aria-label`s.
- Modal sheets use `onClick={(e) => e.stopPropagation()}` so the overlay can
  decide between clean close and confirmation.

### สิ่งที่ไม่ได้ทำ
- ไม่ได้สร้าง shared modal component จริงสำหรับ restricted/unsaved confirmation
- ไม่ได้ยก modal ownership ออกจาก `src/app/navigation/page.tsx`
- ไม่ได้เปลี่ยน Supabase calls, statuses, routing, หรือ money parsing

### สถานะ
- พุชไปแล้วที่ `8aa1f30982724a86a69c7a40ba78f8f55744ba4e`
- ผ่าน `git diff --cached --check`, `bunx tsc -b --noEmit`, `bun run lint`
- ยังเหลืองาน follow-up หากต้องการ shared modal จริงในครั้งต่อไป
- หมายเหตุแก้ไขความจริง: โค้ดของ shared unsaved/restricted confirmation dialog
  ที่บันทึกไว้ด้านบนถูก push จริงเป็น `4750a6b4c858a7e5e31805382a4f1f05368033c5`
  (ตามหลัง doc commit `af55200`)

## 2026-10-12 — Modal footer กลับสู่ normal document flow

### หัวข้อ
- ปุ่ม "บันทึก" / "ยกเลิก" ของ modal แก้ไข ไม่ลอย/sticky ทับข้อความอีกต่อไป
- อ้างอิงพฤติกรรม UI จาก commit เก่า `038a9f871bcdff6f6abc0f8265583e9171f4108c`
  (commit เก่าไม่มี `.modal-foot` เลย ปุ่มเป็น markup ปกติใน flow)

### เปลี่ยนอะไร
- `src/app/globals.css` → `.modal-foot` ตัด `position: sticky`, `bottom: 0`,
  `z-index: 1`, `background: var(--background)` และ `padding-bottom` ออก
  เหลือ `margin-top`, `padding-top`, `border-top` เพื่อให้ footer อยู่ใน
  document flow ต่อจาก content ตามลำดับปกติ
- ไม่แก้ JSX แม้แต่บรรทัดเดียว: ทุก `.modal-foot` เป็น `<div>` ปกติอยู่แล้ว
  (navigation 8 จุด: page input, restricted confirm, unsaved confirm, filter,
  edit house, deliver, comment, report — houses 3 จุด)

### ไม่ได้ทำอะไร
- ไม่ rollback ทั้งโปรเจกต์ไป commit เก่า
- ไม่แตะ business logic, save/cancel, validation, duplicate-submit,
  unsaved-change protection, Supabase auth/RLS, GPS, routing, delivery,
  money calculation
- ไม่แตะ `.modal-overlay`, `.modal-sheet` (`border-radius: 1rem`,
  `max-height: min(85dvh, --app-vvh * 0.85)`, `overflow-y: auto`)
- ไม่แตะ keyboard handling ใน `src/lib/viewport.ts` (`--app-vvh`)
- ไม่แก้ `setShowUnsavedChangesConfirmModal` หรือ confirmation flow

### สถานะ
- พุชไปแล้วที่ `cbab19d4c8181cec008f1a2e1723d212a7d24158`
- ผ่าน `npx tsc -b --noEmit`, `npm run lint`, `npm run build`,
  `git diff --check`, `git diff --cached --check`
- ตรวจ compiled CSS แล้ว: `.modal-foot` ไม่มี sticky/bottom/z-index/background
- ยังไม่ได้ทดสอบ interaction บน browser/อุปกรณ์จริง
- Report: `.ai/reports/2026-10-12-dropway-modal-footer-normal-flow.md`
