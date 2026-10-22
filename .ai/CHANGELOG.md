# .ai/CHANGELOG.md

## 2026-10-22 — นำรายการจาก "ส่งแล้ว" กลับไป "วันนี้" (แก้เคสกดยืนยันผิด)

### หัวข้อ
- การ์ดในแถบ **ส่งแล้ว** ของหน้า `/navigation` มีปุ่ม
  **↩ นำกลับไปวันนี้** (แสดงเฉพาะแท็บนั้น) → confirmation → ย้อนสถานะ
  `delivery_status` จาก `delivered` กลับเป็น `pending` ซึ่งเป็นค่าเดียวกับ
  ที่แถบ "วันนี้" ใช้กรองอยู่แล้ว — ไม่มีสถานะ/ตาราง/API ใหม่

### ของเดิมที่ตรวจก่อนแก้
- แถบ "วันนี้" = `!delivery_status || delivery_status === "pending"`;
  แถบ "ส่งแล้ว" = `delivery_status === "delivered"` (ฟิลเตอร์ใน
  `src/app/navigation/page.tsx`)
- "ส่งสำเร็จ" เขียนโดย `confirmDeliver()` → `user_navigation_houses.update(
  { delivery_status: "delivered", delivery_note, delivered_at })`
- ข้อมูลทั้งหมด (บ้าน/ลูกค้า/ที่อยู่/เบอร์/พิกัด/note/`driver_note`/
  `report_reason`/`delivery_note`) อยู่ในแถวเดิมของ `user_navigation_houses`
  → การนำกลับจึงเป็นการ update แถวเดิม ไม่ delete/insert
- ไม่มี delivery history / audit log / status history ในโปรเจกต์ (ไม่มีตาราง
  หรือไฟล์ SQL) จึงไม่เพิ่มระบบใหม่ (ตาม MVP)
- Confirmation กลางมี 2 ตัว แต่ข้อความคงที่สำหรับ "unsaved changes"
  ("ไม่ปิด / ปิดทิ้ง") จึงใช้ไม่ได้กับข้อความ "นำกลับไปวันนี้"; ใช้ **รูปแบบ**
  เดิมของชั้น confirmation (`modal-overlay-top`, z-index 1000,
  `.modal-sheet`, `.modal-foot`, `btn btn-secondary` + `btn btn-primary`)

### เปลี่ยนอะไร
- `src/app/navigation/page.tsx`: state `showRestoreConfirmModal` /
  `houseToRestore` / `isRestoreSubmitting` + `restoreInFlightRef` (กันกดซ้ำ),
  `requestRestoreToToday()`, `confirmRestoreToToday()`,
  `closeRestoreConfirmModal()`; เพิ่ม modal ยืนยัน;
  เพิ่ม `(showRestoreConfirmModal && !!houseToRestore)` ใน `anyDialogOpen`
- ปุ่ม "นำกลับไปวันนี้" เป็นปุ่มเต็มความกว้างในเนื้อการ์ด (min-height 44px)
  เฉพาะ `viewMode === "delivered"` — ไม่แตะ `.action-rail` เดิม
- Mutation: `update({ delivery_status: "pending", delivered_at: null })`
  `.eq("id", nav_id).eq("delivery_status", "delivered")` (กันกดซ้ำ/กันแถวที่
  ไม่ได้ส่งแล้ว) แล้วอ่าน `navigation_view` ยืนยันว่าเป็น `pending` จริง
  ก่อน `reloadNavigation()`; error → toast "นำรายการกลับไปวันนี้ไม่สำเร็จ
  กรุณาลองใหม่" และรายการยังอยู่ "ส่งแล้ว" (ไม่มี optimistic move)
- `delivery_note` (ข้อมูลการชำระเงิน) และ field อื่นทั้งหมดถูกเก็บไว้;
  `delivered_at` ถูกล้างเพราะไม่ใช่เวลาส่งจริงอีกต่อไป
- ตรวจแล้ว: `npx tsc --noEmit` 0, `next lint` 0, `npm run build` 9/9,
  E2E Chromium 26/26 (cancel/confirm/double-tap/error/refresh/new session/
  other rows untouched; payload = `{delivery_status:"pending",delivered_at:null}`)
- Report: `.ai/reports/2026-10-22-dropway-navigation-restore-to-today.md`
- BLOCKED: real Supabase RLS/database + real-device touch (ไม่มี credentials/
  อุปกรณ์ใน environment นี้) — E2E ใช้ stateful REST stub

## 2026-10-22 — รายงาน "โอน": Amount Calculator แบบแป้นตัวเลขในแอป

### หัวข้อ
- Report Problem Modal ของหน้า `/navigation` มีตัวเลือกใหม่ **"โอน"**
- กด "โอน" → เปิด Amount Calculator ที่เป็นแป้นตัวเลขในแอป (ไม่มี `<input>`)
  → กด "ตกลง" → ได้ comment/reason `รอโอน [จำนวนเงิน] บาท` กลับเข้า report flow
  เดิม และบันทึกผ่าน `confirmReport()` เดิม

### ของเดิมที่ตรวจก่อนแก้
- Report Modal: `src/app/navigation/page.tsx` (รายงานปัญหา / ฝากไว้ก่อน) —
  ตัวเลือกเดิม `โทรไม่รับ` / `เลื่อน` / `ตีกลับ` / `อื่นๆ` เก็บใน `reportReason`
  + `reportReasonCustom`; ปุ่ม "รายงานแล้ว" เรียก `confirmReport()`
- `confirmReport()` เขียน `user_navigation_houses` → `delivery_status:
  "reported"`, `report_reason`, `reported_at` แล้ว `reloadNavigation()`
  (ไม่ใช่ mock; ไม่มี API/schema แยก)
- Calculator เดิม (`showCalculatorModal` / `calculatorInput` /
  `calculatorResult`) เป็น "เครื่องคิดเลขเงินทอน" ของ flow ส่งงาน: ผูกกับ
  `deliverNote` + `localCash`/`localTransfer`, คำนวณเงินทอน/ขาด, ไม่มีจุด
  ทศนิยมและไม่มีปุ่มตกลง → นำมาใช้กรอกจำนวนเงินโอนโดยตรงไม่ได้ (และห้ามแก้
  behavior เดิม) จึง reuse เฉพาะ modal shell/สไตล์แป้นและรูปแบบ state string
  (concat / slice backspace / clear) ไม่สร้างเครื่องคิดเลขเงินทอนซ้ำ
- Confirmation เดิม: `showRestrictedConfirmModal` + `restrictedConfirmPayload`
  overlay `modal-overlay-top` (z-index 1000) อยู่เหนือ modal ปกติ (z-index 50)

### เปลี่ยนอะไร
- `src/app/navigation/page.tsx`: เพิ่ม state `showTransferAmountModal`,
  `transferAmountInput`, `reportTransferAmount`; เพิ่มปุ่ม "โอน" (เต็มแถว)
  ในกริดตัวเลือกเดิมโดยไม่แตะตัวเลือกเดิม
- Amount Calculator ใหม่ (เฉพาะกรอกจำนวนเงินโอน): overlay
  `modal-overlay flex items-center justify-center p-4`, sheet
  `modal-sheet modal-sheet-fit flex w-full max-w-sm flex-col overflow-hidden p-0`
  — content-sized, header `shrink-0`, กลางเป็น `min-h-0 flex-1 overflow-y-auto`
  (`data-modal-scroll`), แถว "ล้าง / ตกลง" `shrink-0`; แป้น 3×4
  `1-9 . 0 ←` เป็น `<button>` ล้วน (ไม่มี input → คีย์บอร์ดระบบไม่เด้ง)
- Validation: ป้องกันจุดทศนิยมซ้ำ, ทศนิยมเกิน 2 ตำแหน่ง, จำนวนเต็มเกิน 9 หลัก,
  ค่า 0/ว่าง/"0." ไม่ผ่าน, `ตกลง` disabled จนกว่าจะ valid; `ล้าง` reset;
  `←` ลบตัวสุดท้าย; เปิดซ้ำจะ prefill จำนวนที่ยืนยันแล้ว
- ปิด calculator ระหว่างมีตัวเลข → ใช้ confirmation เดิม: "ไม่ปิด" กลับมา
  พร้อมจำนวนเดิม, "ปิดทิ้ง" ปิดและทิ้งจำนวน; backdrop/Escape ยังไม่ปิด modal
- `confirmReport()` สร้าง reason `รอโอน ${reportTransferAmount} บาท` เมื่อ
  `reportReason === "โอน"`; กันปุ่มบันทึกเมื่อยังไม่มีจำนวน; reset state
  ครบเมื่อบันทึกสำเร็จ/ยกเลิก; เพิ่ม modal เข้า `anyDialogOpen` (body lock)
- ไม่แตะ: ตัวเลือกเดิม, comment modal, deliver flow, schema, API, auth,
  navigation ทั้งหน้า, calculator เงินทอนเดิม

### สถานะ
- ผ่าน `npx tsc --noEmit`, `next lint`, `npm run build` (9/9)
- E2E Chromium (390×844 และ 390×520) 33/33: กรอก 100/250/250.50 → PATCH body
  `report_reason` = `รอโอน 100 บาท` / `รอโอน 250 บาท` / `รอโอน 250.50 บาท`
  พร้อม `delivery_status: "reported"` + `reported_at`; backspace/ล้าง/
  ตกลงตอนว่าง/ทศนิยมซ้ำ/confirmation ไม่ปิด-ปิดทิ้ง/ตัวเลือกเดิม `โทรไม่รับ`
  และ `อื่นๆ` ยังบันทึกเหมือนเดิม; ตรวจ z-index confirmation 1000 > modal 50
- BLOCKED: คีย์บอร์ดจริงบนมือถือ (ทดสอบด้วย viewport จำลองเท่านั้น)
- Report: `.ai/reports/2026-10-22-dropway-navigation-report-transfer.md`

## 2026-10-19 — Edit House Modal: revert full-height, กลับเป็น modal ขนาดพอดีเนื้อหา

### หัวข้อ
- modal แก้ไขบ้านทั้ง `/navigation` และ `/houses` กลับมาเป็น dialog ขนาด
  "พอดีกับเนื้อหา" (content-sized) อีกครั้ง — ไม่ใช่ full-height/bottom sheet
- ความสูงถูกจำกัดด้วยพื้นที่ที่มองเห็นจริง (`--app-vvh`) ไม่ใช่ `100dvh` ดิบ

### Root cause
- commit `934c18f` เติม `h-full` ให้ sheet (`flex h-full w-full ... rounded-b-none
  rounded-t-2xl p-0`) และเปลี่ยน overlay เป็น `items-end justify-center
  sm:items-center sm:p-4` → sheet ยืดเต็มความสูง overlay (วัดได้ 717px จาก
  viewport 844px = 85% ของจอ ตาม `max-height` เดิม) และเกาะขอบล่างจอ
  (bottom = 844) แทนที่จะเป็น modal กลางจอขนาดพอดีเนื้อหา
- เมื่อคีย์บอร์ดเปิดอยู่ก่อน (visible viewport 400px) sheet เดิมสูง 340px
  (85% ของ 400) และ bottom = 400 → ชนขอบล่างของพื้นที่มองเห็น ดูเหมือน
  "modal ยาวลงด้านล่าง"

### เปลี่ยนอะไร
- `src/app/globals.css`: เพิ่ม `.modal-sheet-fit` — `max-height:
  calc(100vh - 2rem)` แล้วทับด้วย `calc(var(--app-vvh, 100dvh) - 2rem)`,
  desktop `@media (min-width: 640px)` → `min(90vh, calc(var(--app-vvh, 100dvh)
  - 2rem))`; เพิ่ม `.modal-sheet [data-modal-scroll] {
  -webkit-overflow-scrolling: touch }`; แก้คอมเมนต์ที่อ้างถึง pin ที่ถูกถอดไปแล้ว
- `src/app/navigation/page.tsx` + `src/app/houses/page.tsx`: modal แก้ไขบ้าน
  เปลี่ยน overlay กลับเป็น `modal-overlay flex items-center justify-center p-4`
  และ sheet เป็น `modal-sheet modal-sheet-fit flex w-full max-w-sm|md flex-col
  overflow-hidden rounded-2xl p-0` (ถอด `h-full`, `rounded-b-none`,
  `rounded-t-2xl`, `sm:h-auto`, `items-end`)
- `src/app/houses/page.tsx`: เพิ่ม ref content/dropdown + effect เลื่อน content
  เท่าที่จำเป็นให้ dropdown แนะนำที่อยู่พ้นขอบล่างของ scroller/คีย์บอร์ด
  (เหมือนหน้า navigation)
- คงไว้ทั้งระบบ: `.modal-overlay` อิง visual viewport (`--app-vp-top` /
  `--app-vvh`), `useModalKeyboardBehavior()` (blur เฉพาะ field ด้านหลังที่
  focused + scroll เฉพาะ `[data-modal-scroll]` ด้วย `scrollTop`), body lock
  `body.nav-dialog-open`, โครง header `shrink-0` / content scroll เดียว /
  footer `shrink-0` ไม่มี X, `.modal-foot` อยู่ใน flex flow ปกติ,
  `onMouseDown={(e) => e.preventDefault()}` + `selectAddressSuggestion()`
- ไม่แตะ logic: `saveHouse()`, `closeModal()`, restricted confirmation,
  `formData`, `editingHouse`, address autocomplete, `detectLocation()`,
  `verifyOnMaps()`, lat/lng behavior, API/DB/auth, ไม่เพิ่ม dependency

### สถานะ
- ผ่าน `npx tsc --noEmit`, `npm run lint`, `npm run build` (9/9 pages),
  structural harness 72/72, Chromium geometry harness 16/16 และ HTTP smoke
  (`/` 307, `/navigation` `/houses` `/login` `/register` 200)
- วัดด้วย Chromium จริง (viewport 390×844): เนื้อหาปกติ sheet 423px กลางจอ,
  เนื้อหายาว sheet 812px (= 844 − 32, ไม่ใช่ full screen, content scroll
  663/1078), คีย์บอร์ดเปิด (400px) sheet 368px header top 16 footer bottom 384,
  เลื่อน content แล้ว header/footer ไม่ขยับ
- BLOCKED: keyboard/แตะจริงบนมือถือ (ไม่มี signed-in session ในเบราว์เซอร์)
- Report: `.ai/reports/2026-10-19-dropway-edit-house-modal-content-sized-revert.md`

## 2026-10-19 — Modal เปิดตอนคีย์บอร์ดเปิดอยู่ + ความนิ่งของหน้า Navigation

### หัวข้อ
- modal ทุกตัวเปิดในพื้นที่ที่มองเห็นเสมอ แม้คีย์บอร์ดของหน้าด้านหลังจะเปิดอยู่
- modal แก้ไขบ้านทั้ง `/navigation` และ `/houses` ใช้โครง header / scrolling
  content / fixed footer เหมือนกัน
- ปุ่มเครื่องมือลอยของหน้า navigation ไม่ถูกแถบล่าง/คีย์บอร์ดบัง

### Root cause
- `.modal-overlay` ใช้ `position: fixed; inset: 0` = layout viewport แต่
  คีย์บอร์ดย่อแค่ `visualViewport` ⇒ overlay สูงเท่า layout viewport และ dialog
  ที่ `items-center` ถูกจัดกลางรวมส่วนที่คีย์บอร์ดบัง = modal เปิดต่ำ
- การแตะปุ่มบน iOS ไม่เปลี่ยน focus ⇒ ช่องค้นหาด้านหลังยัง focused และ
  คีย์บอร์ดค้างอยู่
- ตรรกะ pin sheet เดิม (`align-self: flex-start` + `margin-top` ตอน focusin)
  ยึด modal ไว้ที่ตำแหน่งเดิมซึ่งอยู่ในโซนต่ำ จึงขัดกับการแก้ overlay

### เปลี่ยนอะไร
- `src/app/globals.css`: `.modal-overlay` อิง visual viewport
  (`top: var(--app-vp-top, 0px)`, `height: 100vh` fallback แล้วทับด้วย
  `height: var(--app-vvh, 100dvh)`, `bottom: auto`, `overscroll-behavior:
  contain`); เพิ่ม `.nav-fab` (safe area + `--app-kb-inset`)
- `src/lib/viewport.ts`: `--app-vp-top` = `visualViewport.offsetTop` (เดิม
  `pageTop`), เพิ่ม `--app-kb-inset`; ถอด pin (`pinSheet`/`vpPinned`/
  inline margin) ออก; เพิ่ม MutationObserver ที่ blur field ด้านหลังเมื่อมี
  `.modal-sheet` ใหม่ถูก insert; ยัง scroll เฉพาะ `[data-modal-scroll]`
  ของ dialog ด้วย `scrollTop` เท่านั้น (ไม่มี `window.scrollTo`/
  `scrollIntoView`/autofocus)
- `src/app/houses/page.tsx`: modal เพิ่ม/แก้ไขบ้านเป็น split dialog
  (overlay `items-end ... sm:items-center sm:p-4`, sheet `flex h-full flex-col
  overflow-hidden p-0 sm:h-auto`, header `shrink-0`, content
  `data-modal-scroll`, footer `shrink-0` + safe area) — ปุ่มยกเลิก/บันทึกและ
  ฟังก์ชันเดิมทั้งหมด
- `src/app/navigation/page.tsx`: เพิ่ม ref content/dropdown + effect เลื่อน
  content เท่าที่จำเป็นให้ dropdown แนะนำที่อยู่พ้น footer/คีย์บอร์ด; FAB
  ใช้ `.nav-fab`; `pb-32` → `pb-44` (มือถือ); อัปเดตคอมเมนต์ของ hook
- ไม่แตะ `saveHouse()`, `closeModal()`, restricted/unsaved confirmation,
  address autocomplete, `detectLocation()`, `verifyOnMaps()`, Supabase/API/
  schema/auth/RLS, Google Maps logic, การกรอง/เรียง/แบ่งหน้า, ปุ่ม X (ไม่เพิ่ม)

### สถานะ
- code commit: `934c18f3ec341aa19e844e815dea1eb2e4417351` (push แล้ว, remote ตรง)
- ผ่าน `npx tsc --noEmit`, `npm run lint`, `npm run build`, `git diff --check`,
  structural harness 36/36 PASS, HTTP `307` `/` และ `200` `/navigation`
  `/houses` `/login`
- BLOCKED: TEST A–E บนเครื่องจริง (ไม่มี signed-in browser/device)
- Report: `.ai/reports/2026-10-19-dropway-keyboard-open-modal-and-navigation-stability.md`

## 2026-10-18 — Edit House Modal (หน้า Navigation): mobile layout + scroll เฉพาะ content

### หัวข้อ
- modal "แก้ไขบ้าน" มี header / content / footer แยกกันชัดเจน
- content เป็น scroll container เดียว; header และปุ่มยกเลิก/บันทึก อยู่นิ่ง
- ช่องพิกัดพิมพ์ได้จริงโดยไม่ถูกล้างค่าระหว่างพิมพ์

### Root cause
- ทั้ง header, ฟิลด์ และ `.modal-foot` อยู่ใน `.modal-sheet` ที่ `overflow-y:
  auto` → ตอน focus input เบราว์เซอร์/hook เลื่อน scrollTop ของทั้ง sheet
  ทำให้ header และปุ่มล่างเลื่อนตาม (modal กระโดด, กดผิด)
- `useModalKeyboardBehavior()` scroll `sheet.scrollTop` อย่างเดียว ไม่มีแนวคิด
  content scroll container
- input พิกัดเดิมใช้ `value` ที่คำนวณจาก `formData.lat && formData.lng` และ
  onChange เซ็ต lat/lng เป็น null ทันทีเมื่อยังพิมพ์ไม่ครบ `lat,lng` → ตัวแรก
  ที่พิมพ์ทำให้ช่องว่าง/เด้ง
- overlay เดิม `items-center` ทุก breakpoint ทำให้จอเล็ก + คีย์บอร์ดเปิดเหลือ
  พื้นที่ content น้อย

### เปลี่ยนอะไร
- `src/app/navigation/page.tsx` (เฉพาะ modal แก้ไขบ้าน): overlay
  `items-end ... sm:items-center`, sheet `flex h-full flex-col overflow-hidden
  ... sm:h-auto`, header `shrink-0`, content
  `data-modal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain`,
  footer `modal-foot flex shrink-0` + safe-area padding (ไม่มี sticky/absolute),
  `aria-labelledby`; input พิกัดใช้ state `houseCoordsInput` (parsing เดิม),
  เงื่อนไขปุ่ม Maps เป็น null check
- `src/lib/viewport.ts`: `getScrollContainer()` เลือก `[data-modal-scroll]`
  ก่อน fallback เป็น sheet; scroll เฉพาะ container นั้น (modal อื่นไม่เปลี่ยน)
- `src/app/globals.css`: แก้ comment ของ `.modal-sheet` / `.modal-foot` ให้ตรง
  กับรูปแบบใหม่ (ไม่มี rule/class ใหม่)
- ไม่แตะ `saveHouse()`, `closeModal()`, restricted confirmation/เงื่อนไข dirty,
  address autocomplete, `detectLocation()`, `verifyOnMaps()`, lat/lng ที่บันทึก,
  Supabase/API/schema/auth, ปุ่ม X (ไม่เพิ่มกลับ), หน้า `/houses`

### สถานะ
- code commit: `d373f6d555f311c32e92c9e9828da5b34477317c` (push แล้ว, remote ตรง)
- ผ่าน `npx tsc --noEmit`, `npm run lint`, `npm run build`, `git diff --check`,
  harness 21/21 PASS, HTTP 200 `/navigation` `/houses` `/login`
- BLOCKED: การแตะจริงบนมือถือ/keyboard เปิด-ปิด (ไม่มี signed-in browser/device)
- Report: `.ai/reports/2026-10-18-dropway-edit-house-modal-mobile-scroll.md`

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
