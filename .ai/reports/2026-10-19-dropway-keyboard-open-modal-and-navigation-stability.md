# 2026-10-19 — Mobile modal เปิดตอนคีย์บอร์ดเปิดอยู่ + ความนิ่งของหน้า Navigation

## วัตถุประสงค์

1. แก้ bug: ผู้ใช้แตะ input (เช่น ช่องค้นหา) → คีย์บอร์ดเปิด → กดปุ่มเปิด
   modal "แก้ไขบ้าน" → modal ถูกจัดตำแหน่งไปด้านล่าง (อยู่หลังคีย์บอร์ด)
2. ให้ modal แก้ไขบ้าน (ทั้งหน้า `/navigation` และ `/houses`) มีโครงสร้าง
   header คงที่ / content scroll ได้ / footer คงที่ และไม่ถูกคีย์บอร์ดดัน
3. ปรับหน้า `/navigation` ให้ใช้หลักการเดียวกัน (ปุ่มหลักไม่ถูกคีย์บอร์ด/แถบล่าง
   บัง, รองรับ safe area, ไม่แตะ business logic)

## Baseline

- remote: `https://github.com/MnsEn2001/drop-way.git`, branch `main`
- ก่อนเริ่ม: `origin/main` = `HEAD` = `d983b69d3916928366a585fbd278509192d4c63f`
- code commit ของงานนี้: `934c18f3ec341aa19e844e815dea1eb2e4417351` (push แล้ว,
  `git ls-remote --heads origin main` ตรงกับ `HEAD`)

## Root cause ที่แท้จริง

1. **Modal ถูกวางตาม layout viewport ไม่ใช่ visual viewport (สาเหตุหลัก)**
   `.modal-overlay` ใช้ `position: fixed; inset: 0` เท่านั้น บนมือถือ คีย์บอร์ด
   ย่อ `visualViewport.height` แต่ layout viewport ยังสูงเท่าเดิม → overlay สูง
   เท่า layout viewport และ `.modal-sheet` ที่ `items-center` ถูกจัดกลางในพื้นที่
   ที่รวมส่วนที่คีย์บอร์ดบังอยู่ ⇒ modal เปิด "ต่ำลง" ทันทีที่คีย์บอร์ดเปิดอยู่ก่อน
   (ไม่ได้เกิดจาก `100vh` หรือ hardcoded margin แต่เกิดจาก overlay ไม่รู้จัก
   `visualViewport` เลย)
2. **คีย์บอร์ดของช่องค้นหาด้านหลังไม่ถูกปล่อย** บน iOS การแตะปุ่มไม่เปลี่ยน
   focus ⇒ input หลัง modal ยังเป็น `document.activeElement` อยู่ คีย์บอร์ดจึง
   ค้างและ visual viewport ยังสั้นตอน modal เปิด
3. **ตรรกะ pin ตำแหน่ง sheet เดิม** (`align-self: flex-start` + `margin-top`
   ตอน `focusin`) ออกแบบมาสำหรับ overlay สูงเท่า layout viewport จึงไปยึด modal
   ไว้ที่ตำแหน่งเดิม (ค่อนไปทางล่าง) ขณะที่พื้นที่ที่มองเห็นสั้นลง — ขัดกับวิธีแก้
   ข้อ 1 จึงต้องถอดออกและให้ CSS เป็นตัวกำหนดตำแหน่ง

## สิ่งที่แก้ (ไฟล์)

- `src/app/globals.css`
  - `.modal-overlay` เพิ่ม `top: var(--app-vp-top, 0px)`, `bottom: auto`,
    `height: 100vh` (fallback) แล้วทับด้วย `height: var(--app-vvh, 100dvh)`
    และ `overscroll-behavior: contain` → overlay = พื้นที่ที่มองเห็นจริง
    ทุก modal ในแอป (houses 4 + navigation 8) ได้ผลเดียวกันโดยไม่ต้องแก้ทีละตัว
  - เพิ่ม `.nav-fab` (แทน `fixed bottom-20 right-4 z-50` เดิมของปุ่มเครื่องมือ
    หน้า navigation): `bottom: calc(5rem + env(safe-area-inset-bottom,0px) +
    var(--app-kb-inset,0px))`, เดสก์ท็อป `calc(5rem + var(--app-kb-inset,0px))`
- `src/lib/viewport.ts`
  - `useVisualViewportMetrics()` เขียน `--app-vp-top` เป็น
    `visualViewport.offsetTop` (เดิมเป็น `pageTop` ซึ่งใช้กับ fixed overlay
    ไม่ได้), เพิ่ม `--app-kb-inset`
    = `max(0, innerHeight - offsetTop - height)` สำหรับยกปุ่มลอย
  - ถอดระบบ pin (`pinSheet`, `dataset.vpPinned`, inline `marginTop/alignSelf`)
    ทั้งหมด — ตำแหน่งมาจาก CSS แล้ว
  - คงการเลื่อนเฉพาะ scroll container ของ dialog (`[data-modal-scroll]` ก่อน,
    ไม่มีก็ `sheet`) ด้วย `scrollTop` เท่านั้น; ยังไม่มี `window.scrollTo(`,
    `.scrollIntoView(`, React state บน viewport resize หรือ autofocus
  - เพิ่ม `MutationObserver`: เมื่อมี `.modal-sheet` ใหม่ถูก insert และ
    `document.activeElement` เป็น text field ที่ไม่ได้อยู่ใน sheet นั้น →
    `blur()` ตัวนั้น (ปล่อยคีย์บอร์ดของหน้าด้านหลัง) โดยไม่ focus อะไรแทน
- `src/app/navigation/page.tsx`
  - modal แก้ไขบ้าน: คงโครง header `shrink-0` / content
    `data-modal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain` /
    footer `shrink-0` + safe area (ตามงาน 2026-10-18)
  - เพิ่ม ref ของ content + dropdown และ effect ที่เลื่อน `content.scrollTop`
    เท่าที่จำเป็นเมื่อ dropdown แนะนำที่อยู่โผล่ต่ำเกินพื้นที่ที่มองเห็น
    (ไม่แตะ page scroll, ยังคง `onMouseDown={(e) => e.preventDefault()}`
    ของ dropdown เดิม)
  - เปลี่ยนคอมเมนต์ของ `useModalKeyboardBehavior()` ให้ตรงกับกลไกใหม่
    (overlay อิง visual viewport ไม่ใช่ "ล็อกตำแหน่ง")
  - `.page-shell` `pb-32` → `pb-44` (เฉพาะมือถือ) ให้พ้นปุ่มลอยที่ยกขึ้นมา
  - FAB สองสถานะเปลี่ยนจาก `fixed bottom-20 right-4 z-50` เป็น `nav-fab`
- `src/app/houses/page.tsx`
  - modal "เพิ่ม / แก้ไขบ้าน" เปลี่ยนเป็นโครงเดียวกัน: overlay
    `items-end justify-center sm:items-center sm:p-4`, sheet
    `flex h-full w-full max-w-md flex-col overflow-hidden rounded-b-none
    rounded-t-2xl p-0 sm:h-auto sm:rounded-2xl`, header `shrink-0`, content
    `data-modal-scroll`, footer `modal-foot flex shrink-0 ... +
    env(safe-area-inset-bottom)` (ไม่มี X, ปุ่มยกเลิก/บันทึกเหมือนเดิม)

## Business logic ที่ไม่ได้แตะ

`saveHouse()`, `closeModal()`, restricted/unsaved confirmation และเงื่อนไข
dirty, `formData`, `addressSuggestions`/`highlightedSuggestionIndex`,
`selectAddressSuggestion()`, `handleAddressChange()`, `handleAddressKeyDown()`,
`detectLocation()`, `verifyOnMaps()`, `houseCoordsInput` (parsing เดิม),
Supabase/API/schema/auth/RLS, Google Maps URL, การเรียง/กรอง/แบ่งหน้า,
`changeHandMode`, `localStorage["navigationActionRailSide"]` — ไม่แก้

## คำสั่งที่รันจริง + ผล

| command | result |
| --- | --- |
| `git fetch origin main` / `git rev-parse origin/main HEAD` | ทั้งคู่ `d983b69…` ก่อนแก้ |
| `npx tsc --noEmit` | exit 0 (รันสองครั้ง: หลังแก้ครั้งแรก และหลังแก้คอมเมนต์/เว้นบรรทัด) |
| `npm run lint` | exit 0 — "✔ No ESLint warnings or errors" |
| `npm run build` | exit 0 — "✓ Compiled successfully", 9/9 static pages |
| `git diff --check` | exit 0 |
| `node tmp/verify_keyboard_modal.mjs` (harness ชั่วคราว ไม่ได้ commit) | **36/36 PASS** |
| ตรวจ CSS ที่ build แล้ว (`.next/static/css/*.css`) | `.modal-overlay{…top:var(--app-vp-top,0)…height:var(--app-vvh,100dvh)}`, `.nav-fab{…--app-kb-inset, 0px)}` |
| `curl` `/`, `/navigation`, `/houses`, `/login` | `307` → `/houses`, `200`, `200`, `200` |
| `git push origin main` + `git ls-remote --heads origin main` | `934c18f3ec341aa19e844e815dea1eb2e4417351` ตรงกับ `HEAD` |

### harness ตรวจอะไร (source + built CSS)

overlay อิง `--app-vp-top`/`--app-vvh` + มี fallback 100vh; hook ตั้ง
`--app-vp-top` จาก `offsetTop` และมี `--app-kb-inset`; ไม่มี pin เดิม; ไม่มี
`window.scrollTo(`/`.scrollIntoView(`; มี MutationObserver + `active.blur()`
และ disconnect ตอน unmount; modal แก้ไขบ้านทั้งสองหน้ามี overlay/sheet/header/
content(`data-modal-scroll`)/footer(`shrink-0` + safe area) ตามลำดับ, ไม่มีปุ่ม X,
ปุ่มยกเลิกยังเข้า restricted confirm, ปุ่มบันทึกยังเรียก `saveHouse()`, dropdown
ยังมี `onMouseDown preventDefault`; `.nav-fab` ใช้ safe area + `--app-kb-inset`
และถูกใช้ทั้งสองสถานะของ FAB

## ผ่าน / ไม่ผ่าน / ตรวจไม่ได้

- **PASS**: TypeScript, lint, build, `git diff --check`, structural harness
  36/36, HTTP 200/307, CSS ที่ build จริง, push + remote SHA ตรงกัน
- **FAIL**: ไม่มี
- **BLOCKED (ยังทดสอบไม่ได้)**: การทดสอบจริงบนมือถือ (TEST A–E ในโจทย์) —
  environment นี้ไม่มี signed-in browser session, ไม่มี browser runtime
  (ไม่มี Playwright/Puppeteer/Chromium) จึงยืนยันได้ถึงระดับ source + built CSS
  + typecheck/lint/build + structural harness เท่านั้น
- **เฉพาะที่ยังไม่ยืนยัน**: พฤติกรรมคีย์บอร์ด Android Chrome / iOS Safari จริง
  (ความสูง visual viewport ระหว่างคีย์บอร์ดเปิด, safe area, จอเตี้ย/landscape),
  address dropdown ขณะคีย์บอร์ดเปิดบนเครื่องจริง, และค่า `--app-kb-inset`
  ระหว่าง pinch-zoom (แอปปิด zoom ไว้แล้วผ่าน viewport config)

## ข้อจำกัด / งานต่อ

- บน iOS เวอร์ชันเก่าที่คีย์บอร์ดไม่ย่อ `visualViewport` (overlay แบบเก่า)
  กลไกนี้ช่วยไม่ได้ — โค้ดยังทำงานเหมือนเดิมไม่พัง
- `.modal-sheet` ยังใช้ `max-height: min(85dvh, --app-vvh * 0.85)`; จอเตี้ยมาก
  + คีย์บอร์ดเปิดพร้อมกัน พื้นที่ content จะเหลือน้อย (แต่ header/footer ยังอยู่
  ในกรอบที่มองเห็นและ content scroll ได้)
- address dropdown ยัง clip ตามขอบ scroll container (ไม่ใช่ portal) — งานนี้
  แค่เลื่อน content ให้ dropdown อยู่ในพื้นที่ที่มองเห็น ไม่ได้ย้าย stacking
- ยังไม่มี automated test ในโปรเจกต์; harness ที่ใช้เป็นไฟล์ชั่วคราวใน `tmp/`
  (ไม่ได้ commit)
