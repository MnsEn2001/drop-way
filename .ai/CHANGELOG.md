# .ai/CHANGELOG.md

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
