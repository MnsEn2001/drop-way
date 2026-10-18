# 2026-10-18 — Edit House Modal: mobile layout / scroll stability

## วัตถุประสงค์
แก้ `modal "แก้ไขบ้าน"` ของหน้า `/navigation` ที่เมื่อแตะ input / เลือก address
suggestion / พิมพ์พิกัดแล้ว modal หรือ content กระโดด เลื่อน หรือเปลี่ยนตำแหน่ง
ทำให้กดผิด element — โดยให้เหลือ scroll เฉพาะ content, header/footer อยู่นิ่ง,
ไม่แตะ business logic

## Baseline
- remote: `https://github.com/MnsEn2001/drop-way.git`, branch `main`
- `origin/main` = `HEAD` = `755cc25468c35615f3cacc302350241c9a0f0932` ก่อนเริ่มงาน

## ไฟล์ที่แก้
- `src/app/navigation/page.tsx` (+ ตัวแก้ใน `src/lib/viewport.ts`, `src/app/globals.css`)
- commit: `d373f6d555f311c32e92c9e9828da5b34477317c`

## สาเหตุที่พบ (ตรวจจาก source จริง)
1. **โครงสร้างเดิมเป็น single-scroll sheet** — `<div class="space-y-4">` ที่ห่อ
   ทั้ง header (`h2`), ฟิลด์ทั้งหมด และ `.modal-foot` อยู่ใน `.modal-sheet` ที่
   `overflow-y: auto` ทำให้ตอน focus input เบราว์เซอร์/hook เลื่อน `scrollTop`
   ของ **ทั้ง sheet** → header และปุ่มยกเลิก/บันทึกเลื่อนตาม = อาการ modal กระโดด
   และนิ้วที่กำลังจะกดปุ่มโดน element อื่น
2. **hook กลาง scroll ผิด container** — `useModalKeyboardBehavior()` ใน
   `src/lib/viewport.ts` ใช้ `sheet.scrollTop` อย่างเดียว ไม่รู้จักพื้นที่
   content ที่ควร scroll แยก
3. **ช่องพิกัดล้างค่าทุกคีย์** — `value` ของ input พิกัดเดิมคำนวณจาก
   `formData.lat && formData.lng` และ onChange เซ็ต `lat/lng = null` ทันทีเมื่อ
   ยังพิมพ์ไม่ครบ `lat,lng` → พิมพ์ตัวแรกแล้วช่องถูกล้างค่า/เด้งกลับ
   (ทดสอบได้จาก logic: `parts.length !== 2` → null ทันที)
4. overlay เดิม `items-center` ทุก breakpoint ทำให้จอเล็ก + คีย์บอร์ดเปิด
   พื้นที่ content เหลือน้อยและตำแหน่ง modal ขึ้นกับ viewport ที่หด

## สิ่งที่เปลี่ยน
- `src/app/navigation/page.tsx` (เฉพาะ modal แก้ไขบ้าน)
  - overlay: `modal-overlay flex items-end justify-center sm:items-center sm:p-4`
    (มือถือยึดขอบล่าง, desktop ยัง centered เดิม)
  - sheet: `modal-sheet flex h-full w-full max-w-sm flex-col overflow-hidden
    rounded-b-none rounded-t-2xl p-0 sm:h-auto sm:rounded-2xl`
    — ใช้ `max-height` global เดิม (`min(85dvh, --app-vvh * 0.85)`), ไม่ override
  - **Header** `shrink-0` + `border-b` (มือถือ) / ไม่มี border บน `sm`
  - **Content** `data-modal-scroll min-h-0 flex-1 overflow-y-auto
    overscroll-contain px-5 py-4 sm:px-6` — เป็น scroll container เดียว
  - **Footer** `modal-foot flex shrink-0 gap-3 px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:pb-6`
    — อยู่นอก scroll area, ไม่มี `position: sticky`, ไม่มี `bottom: 0`
  - เพิ่ม `aria-labelledby="edit-house-title"` + `id` ให้ `h2`
  - ช่องพิกัดใช้ state ใหม่ `houseCoordsInput` (text buffer) แทนการคำนวณ value
    จาก `formData` — parsing `lat,lng` เดิมทุกบรรทัด (ค่า null เมื่อรูปแบบผิด)
  - เงื่อนไขปุ่ม Google Maps เปลี่ยนเป็น `formData.lat != null && formData.lng != null`
    (อนุญาตตามโจทย์; กันพิกัด 0 ถูกมองเป็น false)
  - reset `houseCoordsInput` ใน `openEditModal` / `closeModal`,
    `detectLocation` เขียนค่าลง buffer ด้วย — ไม่แตะ lat/lng ที่บันทึก
- `src/lib/viewport.ts`
  - `getScrollContainer(sheet)` เลือก `[data-modal-scroll]` ก่อน fallback เป็น
    sheet เดิม → modal อื่นทั้งแอปพฤติกรรมเดิมทุกอย่าง
  - คำนวณ `visibleTop/visibleBottom` จาก rect ของ scroll container และ scroll
    เฉพาะ container นั้น (ยังไม่มี `window.scrollTo` / `scrollIntoView`)
- `src/app/globals.css` — แก้เฉพาะ comment ของ `.modal-sheet` / `.modal-foot`
  ให้ตรงกับรูปแบบใหม่ (ไม่มี rule ใหม่, ไม่มี class ซ้ำ)

### ไม่ได้เปลี่ยน
`editingHouse`, `formData` fields, `addressSuggestions`,
`highlightedSuggestionIndex`, `selectAddressSuggestion()`,
`handleAddressChange()`, `handleAddressKeyDown()`, `detectLocation()` (ยกเว้น
เขียน buffer), `verifyOnMaps()`, `saveHouse()`, `closeModal()`,
restricted confirmation + เงื่อนไข dirty, validation, Supabase/API/schema/auth/
RLS, Google Maps URL, ปุ่ม X (ไม่ถูกเพิ่มกลับ), modal อื่นทั้งหมด,
หน้า `/houses`

## คำสั่งที่รันจริง + ผล
| command | result |
| --- | --- |
| `git fetch origin main` / `git rev-parse origin/main HEAD` | ทั้งคู่ `755cc25…` ก่อนแก้ |
| `npx tsc --noEmit` | exit 0 (สองครั้ง: ก่อนและหลังแก้ comment) |
| `npm run lint` | exit 0 — "✔ No ESLint warnings or errors" |
| `npm run build` | exit 0 — "✓ Compiled successfully", 9/9 static pages |
| `git diff --check` | exit 0 (ไม่มี whitespace error) |
| `node tmp/verify_modal.mjs` (harness ชั่วคราว ไม่ได้ commit) | **21/21 PASS** |
| `curl` `/navigation` `/houses` `/login` | 200 / 200 / 200 |
| ตรวจ CSS ที่ build แล้ว | utilities (`overflow-hidden`, `h-full`, `rounded-b-none`) อยู่หลัง `.modal-sheet` ใน components layer → override ถูกต้อง; `sm:rounded-2xl` อยู่หลัง `rounded-b-none` |
| `git push origin main` + `git ls-remote --heads origin main` | `d373f6d555f311c32e92c9e9828da5b34477317c` ตรงกับ `HEAD` |

### harness ตรวจอะไร (source-level)
โครงสร้าง overlay/sheet/header/content/footer และลำดับ, `data-modal-scroll`
เป็น scroll container เดียว, footer `shrink-0` + safe-area และอยู่นอก scroller,
ไม่มีปุ่ม X, dropdown ยังมี `onMouseDown preventDefault` + `absolute z-50`,
ปุ่มยกเลิกยังเข้า restricted confirm, ปุ่มบันทึกยังเรียก `saveHouse()`,
ข้อความ "ไม่มีพิกัด…" ยังอยู่, ปุ่ม Maps ใช้ null check + `verifyOnMaps`,
ช่องพิกัดใช้ buffer และ parsing เดิม, hook ใช้ `[data-modal-scroll]`

## ผ่าน / ไม่ผ่าน / ตรวจไม่ได้
- **PASS**: TypeScript, lint, build, `git diff --check`, structural harness 21/21,
  HTTP 200, CSS cascade, push + remote SHA ตรงกัน
- **FAIL**: ไม่มี
- **BLOCKED (ไม่ได้ทดสอบ)**: การเปิด modal และแตะ input/เลือก suggestion/แตะ
  ยกเลิก-บันทึกบนมือถือจริง — environment นี้ไม่มี signed-in browser session
  และไม่มี browser runtime (ไม่พบ Playwright/Puppeteer/Chromium) จึงยืนยันได้
  ถึงระดับ source + built CSS + typecheck/build เท่านั้น
- **ยังไม่ยืนยัน**: พฤติกรรมคีย์บอร์ด Android/iOS จริง (safe area, ความสูง
  visual viewport ระหว่างพิมพ์), Supabase RLS

## ข้อควรระวัง / งานต่อ
- `.modal-sheet` ยังใช้ `max-height: min(85dvh, --app-vvh * 0.85)`; บนมือถือ
  เมื่อคีย์บอร์ดเปิด พื้นที่ content จะเหลือน้อยลงตาม vvh และ hook จะ scroll
  content ให้ field ที่โฟกัสอยู่เหนือคีย์บอร์ด — footer อาจอยู่ใต้คีย์บอร์ดใน
  จอที่เตี้ยมาก (ข้อจำกัดเดิมของสถาปัตยกรรม pin + vvh ไม่ได้แก้ในรอบนี้)
- address dropdown ยังอยู่ใน scroll container (clipped ตามขอบ content) —
  ถ้าต้องการให้ล้นออกนอก content ต้องย้ายเป็น portal ซึ่งนอกขอบเขตงานนี้
- หน้า `/houses` ยังใช้ modal เพิ่ม/แก้ไขบ้านแบบ single-scroll เดิม (ไม่ได้แก้
  ในงานนี้ เพราะโจทย์อ้างถึง restricted confirmation/"ไม่มีพิกัด" ซึ่งมีเฉพาะ
  หน้า navigation); ถ้าต้องการ UX เดียวกันต้องทำเป็นงานแยก
- กฎเดิมใน `.ai/AI_HANDOFF.md` ที่ห้าม `items-end`/`overflow-hidden` ถูกยกเว้น
  เฉพาะ modal นี้ตามคำขอของผู้ใช้ — documented ใน handoff แล้ว
