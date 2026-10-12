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
