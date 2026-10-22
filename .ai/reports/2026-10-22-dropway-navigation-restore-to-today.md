# 2026-10-22 — Navigation: นำรายการจาก "ส่งแล้ว" กลับไป "วันนี้"

## Task
ผู้ใช้กด "ส่งสำเร็จ / เซ็นรับสำเร็จ" ผิดพลาดได้ ต้องมีทางนำรายการที่อยู่ในแถบ
"ส่งแล้ว" กลับไปแถบ "วันนี้" โดยเปลี่ยนสถานะจริงใน backend (ไม่ใช่แค่ UI)
และใช้ status/flow/confirmation เดิมของระบบให้มากที่สุด

## 1. สถานะเดิม และสถานะที่เลือกใช้

| | ค่า |
|---|---|
| แถบ "วันนี้" (filter เดิม) | `!delivery_status \|\| delivery_status === "pending"` |
| แถบ "ส่งแล้ว" (filter เดิม) | `delivery_status === "delivered"` |
| การบันทึก "ส่งสำเร็จ" | `confirmDeliver()` → `user_navigation_houses.update({ delivery_status: "delivered", delivery_note, delivered_at })` |
| สถานะที่ใช้ตอน "นำกลับไปวันนี้" | `delivery_status = "pending"`, `delivered_at = null` |

ไม่มี `assigned` / `out_for_delivery` ในระบบนี้ — workflow จริงมี 3 ค่า:
`pending`, `delivered`, `reported` (ยืนยันจาก type `NavigationHouse.delivery_status`
และจาก filter/การเขียนข้อมูลจริงในหน้า `/navigation`) ดังนั้นสถานะก่อนหน้า
`delivered` ที่ถูกต้องคือ `pending` ไม่ได้เดาใหม่

## 2. API / field ที่ถูกแก้
- ไม่มี API route ใหม่: ใช้ browser Supabase client ตัวเดิม
  (`src/lib/supabase.ts`, anon key + session → RLS ของโปรเจกต์บังคับใช้เหมือน
  `confirmDeliver` / `confirmReport` / `confirmComment`)
- `user_navigation_houses.update({ delivery_status: "pending", delivered_at: null })`
  - `.eq("id", nav_id)` — แถวเดิม (ไม่ delete / ไม่ insert)
  - `.eq("delivery_status", "delivered")` — กันกดซ้ำและกันแถวที่ไม่ได้ส่งแล้ว
- หลัง update อ่าน `navigation_view` (`nav_id`, `delivery_status`) เพื่อยืนยัน
  ว่า backend เป็น `pending` จริง แล้วจึง `reloadNavigation()` (ไม่ reload ทั้งหน้า)

## 3. DATA ที่คงอยู่
แถวเดิมถูก update เท่านั้น — บ้าน/ลูกค้า/ที่อยู่/เบอร์/พิกัด/`note`/
`quantity`/`delivery_note` (ยอดเงินและการชำระ เช่น `จ่ายด้วยเงินสดจำนวน
100.00 บาท รอปิดยอด QR`)/`driver_note`/`report_reason`/`reported_at` ไม่ถูกแตะ
`delivered_at` ถูกล้างเพราะไม่ใช่เวลาส่งจริงอีกต่อไป
(ระบบไม่มี history/audit table — ไม่ได้เพิ่มระบบใหม่ตามเงื่อนไข MVP)

## 4. Confirmation
- Modal ใหม่ `นำรายการกลับไปวันนี้?` ใช้ชั้น/สไตล์เดียวกับ confirmation เดิม:
  `modal-overlay modal-overlay-top` (z-index 1000) + `modal-sheet` +
  `modal-foot` + `btn btn-secondary` (ยกเลิก) / `btn btn-primary`
  (นำกลับไปวันนี้, มี loading `กำลังบันทึก...`)
- ไม่ได้ reuse ตัว dialog `showRestrictedConfirmModal` โดยตรง เพราะข้อความ
  คงที่ ("มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก" / "ไม่ปิด" / "ปิดทิ้ง") ไม่ตรงกับ
  action นี้ — reuse เฉพาะ pattern/ชั้น z-index และเพิ่มเข้า `anyDialogOpen`
  เพื่อให้ body lock ทำงาน

## 5. UI
- ปุ่ม `↩ นำกลับไปวันนี้` (icon `Undo2`) อยู่ในเนื้อการ์ด เต็มความกว้าง
  `min-h-11` (44px) แสดงเฉพาะ `viewMode === "delivered"` — ไม่ชนกับ
  `.action-rail` และไม่ทำให้ layout หน้าอื่นเปลี่ยน
- ระหว่างบันทึก ปุ่ม confirm ถูก disable + `restoreInFlightRef` กัน double tap
  (สอง click ในจังหวะเดียวกัน = 1 request)
- error: toast `นำรายการกลับไปวันนี้ไม่สำเร็จ กรุณาลองใหม่`, การ์ดยังอยู่
  "ส่งแล้ว", dialog ยังเปิดให้ลองใหม่, ไม่มี optimistic removal

## 6. ไฟล์ที่แก้
- `src/app/navigation/page.tsx` (state, handlers, ปุ่มในการ์ด, confirm modal,
  `anyDialogOpen`, import `Undo2`)
- `.ai/CHANGELOG.md`, `.ai/CURRENT_STATE.md`, `.ai/AI_HANDOFF.md`, report นี้

## 7. ผลตรวจ
- `npx tsc --noEmit` → 0 error
- `npm run lint` → No ESLint warnings or errors
- `npm run build` → สำเร็จ 9/9 static pages
- E2E Chromium (Playwright, 390×844, `tmp/verify_restore_to_today.mjs`,
  Supabase REST ถูก intercept ด้วย stateful stub) → **26/26 ผ่าน**:
  - TEST 1 วันนี้ → ส่งแล้ว (PATCH `delivery_status: "delivered"`)
  - TEST 2 เปิด confirmation → ยกเลิก → ไม่มี mutation, การ์ดยังอยู่ "ส่งแล้ว"
  - TEST 3 ยืนยัน → PATCH `{delivery_status:"pending", delivered_at:null}`
    พร้อม guard `delivery_status=eq.delivered`, การ์ดออกจาก "ส่งแล้ว",
    กลับไป "วันนี้", ข้อมูลการชำระ/คอมเมนต์คนขับยังอยู่
  - TEST 4 refresh ทั้งหน้า → ยังอยู่ "วันนี้"
  - TEST 5 session ใหม่ (context ใหม่ = logout/login) → ยังอยู่ "วันนี้"
  - TEST 6 double tap (สอง click ใน tick เดียว) → 1 PATCH
  - TEST 7 backend error (500) → toast error, การ์ดยังอยู่ "ส่งแล้ว",
    refresh แล้วยังอยู่ "ส่งแล้ว"
  - TEST 8 นำกลับ 1 รายการ → มีเพียงแถวนั้นที่เปลี่ยน, รายการอื่น (รวม
    `reported`) ไม่ถูกแตะ
  - ปุ่มสูง 44px, label ถูกต้อง, ไม่มีปุ่มนี้ในแท็บ "วันนี้"

## 8. ข้อจำกัด (ยังไม่ยืนยัน)
- E2E ใช้ stateful REST stub ไม่ใช่ Supabase จริง: payload/สถานะ/การอ่านซ้ำ
  ถูกพิสูจน์แล้ว แต่ RLS ของโปรเจกต์จริงยัง **NOT VERIFIED** จาก environment นี้
  (authorization มาจาก Supabase RLS เหมือน update อื่นๆ ทุกตัวในหน้านี้ —
  ไม่มี service-role bypass ฝั่ง client)
- การสัมผัสจริงบนมือถือ (touch target/ความรู้สึกกด) ยัง NOT VERIFIED
