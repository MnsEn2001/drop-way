# Report — Edit House Modal: revert full-height, กลับเป็น content-sized (2026-10-19)

งาน: แก้ปัญหา \"modal แก้ไขบ้านบนมือถือยาวเต็มจอ/ยาวลงด้านล่าง\" หลัง task ก่อนหน้า
โดยหยุดแนวทาง full-screen modal และตรวจ visual behavior จริงเท่าที่ทำได้ใน environment นี้

## 1. ทำไม Modal ถึงยาวลงด้านล่าง

สองสาเหตุรวมกันใน commit `934c18f` (task ก่อนหน้า):

1. sheet ถูกเติม `h-full` ⇒ ความสูงเท่ากับ overlay (ทั้งหน้าจอ) แทนที่จะพอดีเนื้อหา
   และ `max-height` เดิม (85% ของพื้นที่มองเห็น) เป็นตัวตัดยอด ทำให้ได้ sheet
   สูง ~85% ของจอ
2. overlay เปลี่ยนเป็น `items-end justify-center sm:items-center sm:p-4`
   ⇒ บนมือถือ sheet ถูกจัดชิดขอบล่าง (bottom sheet) จึงดู \"ติดด้านล่าง\" และกิน
   พื้นที่เกือบเต็มหน้าจอ

วัดด้วย Chromium จริง (viewport 390×844, โครง markup เดิม + CSS ที่ build จริง):

| สภาพ | sheet สูง | ขอบล่าง | หมายเหตุ |
| --- | --- | --- | --- |
| keyboard ปิด | 717px (85% ของ 844) | 844 = ขอบล่างจอ | bottom sheet เต็มความสูงที่อนุญาต |
| keyboard เปิด (visible 400px) | 340px (85% ของ 400) | 400 = ขอบล่างพื้นที่มองเห็น | ชนขอบล่าง/คีย์บอร์ด |

## 2. CSS/class ตัวไหนเป็นต้นเหตุ

- `h-full` บน `.modal-sheet` (คู่กับ `.modal-sheet { max-height: min(85dvh, calc(var(--app-vvh,100dvh) * .85)) }`)
- `rounded-b-none rounded-t-2xl` + overlay `items-end` ⇒ ยืนยันเจตนา bottom sheet
- `sm:h-auto` ทำให้เฉพาะ desktop กลับมาเป็น auto height (มือถือจึงเต็มสูง)

## 3. สิ่งที่ revert จาก task ก่อนหน้า

- ถอด `h-full` ออกจาก sheet ทั้งสองหน้า และถอด `rounded-b-none`, `rounded-t-2xl`,
  `sm:h-auto`
- overlay กลับเป็น `modal-overlay flex items-center justify-center p-4`
  (มี padding รอบด้านบนมือถืออีกครั้ง ⇒ มีช่องว่าง 1rem รอบ modal)
- **คงไว้** (ไม่ revert): ระบบ overlay อิง visual viewport (`--app-vp-top` /
  `--app-vvh`) จาก `934c18f`, การ blur เฉพาะ field ด้านหลังที่ focused, การ scroll
  เฉพาะ `[data-modal-scroll]`, body lock `body.nav-dialog-open`, โครง
  header/content/footer และ `.nav-fab`

## 4. วิธีแก้ keyboard

- ไม่แก้ด้วย full-screen อีก: modal ยังเป็น content-sized + `items-center`
- ความสูงถูกจำกัดด้วยพื้นที่มองเห็นจริง: `.modal-sheet-fit` →
  `max-height: calc(100vh - 2rem)` แล้วทับด้วย
  `calc(var(--app-vvh, 100dvh) - 2rem)`, desktop
  `@media (min-width: 640px)` → `min(90vh, calc(var(--app-vvh, 100dvh) - 2rem))`
  (ใช้ `--app-vvh` จาก `src/lib/viewport.ts` ที่มีอยู่แล้ว — ไม่เพิ่ม JS/dependency)
- เมื่อคีย์บอร์ดเปิดอยู่ก่อนเปิด modal: ยังใช้ `.modal-overlay` ที่อิง
  `--app-vp-top`/`--app-vvh` (มีอยู่จาก task ก่อน) + MutationObserver เดิมที่ blur
  เฉพาะ element ที่ focused และอยู่นอก `.modal-sheet` (ไม่ blur แบบ global,
  ไม่ autofocus อะไรใหม่)
- ผลการวัดของโครงใหม่ (390×844):
  - เนื้อหาปกติ: sheet 423px, top 211 (กลางจอ), content ไม่ต้อง scroll
  - เนื้อหายาว: sheet 812px = 844 − 32 (ไม่ใช่ full screen), content 663/1078 scroll
  - คีย์บอร์ดเปิด (visible 400px): sheet 368px, header top 16, footer bottom 384
  - คีย์บอร์ดเปิดแบบแคบมาก (visible 300px): sheet 268px, header top 16, footer bottom 284
  - เลื่อน content 200px: header/footer ไม่ขยับ (เฉพาะ content ที่ scroll)

## 5. วิธีแก้ Navigation

- ไม่มี panel ใดในหน้า navigation ที่เป็น full-height อยู่แล้ว (ตรวจแล้ว: ไม่มี
  `h-full`/`h-screen`/`100dvh` ใน `src/app/navigation/page.tsx` และ Navbar drawer
  เป็น bottom sheet ที่ถูก `.modal-sheet` จำกัดความสูง) จึงไม่ต้องแก้โครง
- สิ่งที่ทำ: modal แก้ไขบ้านในหน้านี้ใช้กติกา content-sized เดียวกัน และคง
  dropdown effect เดิมที่เลื่อนเฉพาะ content ให้ suggestion ไม่ถูก footer/คีย์บอร์ดบัง
- คง logic เดิมทั้งหมด: `saveHouse()`, `closeModal()`, restricted confirmation,
  `formData`, `editingHouse`, autocomplete, `detectLocation()`, `verifyOnMaps()`,
  `houseCoordsInput`, `.nav-fab`, `pb-44`, hand mode

## 6. ไฟล์ที่แก้

- `src/app/globals.css` — เพิ่ม `.modal-sheet-fit` (+ desktop media), เพิ่ม
  `-webkit-overflow-scrolling: touch` ให้ `[data-modal-scroll]`, อัปเดตคอมเมนต์
- `src/app/navigation/page.tsx` — overlay/sheet ของ modal แก้ไขบ้าน
- `src/app/houses/page.tsx` — overlay/sheet ของ modal เพิ่ม/แก้ไขบ้าน + ref/effect
  เลื่อน content ให้ dropdown ที่อยู่พ้นขอบล่าง (เหมือนหน้า navigation)
- `.ai/*` — CHANGELOG / CURRENT_STATE / AI_HANDOFF / report นี้

หมายเหตุ: ไม่แก้ `src/lib/viewport.ts`, `package.json`, `next.config.mjs`,
`tailwind.config.ts` และไม่เพิ่ม dependency

## 7. TypeScript

`npx tsc --noEmit` → 0 errors (รันซ้ำหลังแก้ houses/page.tsx รอบสุดท้าย)

## 8. Build

`npm run lint` → No ESLint warnings or errors
`npm run build` → สำเร็จ 9/9 static pages (มีเตือน \"No lockfile found\" ของ Next
เหมือนเดิม ไม่ใช่ error)
ตรวจ CSS ที่ build จริง (`.next/static/css/*.css`): `.modal-sheet{...}` ตามด้วย
`.modal-sheet-fit{...}` และ `@media (min-width:640px){.modal-sheet-fit{...}}`

## 9. ผลทดสอบบน mobile

ทดสอบใน Chromium (deviceScaleFactor 2, isMobile, viewport 390×844) ด้วย harness
สองตัวที่รันจาก repo:

- `tmp/verify_modal_layout.mjs` → 72/72 PASS (สัญญา class + cascade + โครง
  header/content/footer + logic เดิมยังอยู่ + ค่า cap)
- `tmp/verify_modal_browser.mjs` → 16/16 PASS (geometry จริง + เทียบ baseline
  markup เก่าเพื่อยืนยัน root cause + สูตร scroll dropdown)
- `tmp/smoke_preview.mjs` → `/login`, `/register` 200 ไม่มี console/page error
  (harness ทั้งสองตัวใน `tmp/` เป็นไฟล์ชั่วคราว ไม่ commit — ต้องมี
  `playwright-core` + chromium-headless-shell + system libs ถึงจะรันได้)
- HTTP: `/` 307, `/navigation` `/houses` `/login` `/register` 200
  (dev server ต้อง `freebuff-preview restart` หนึ่งครั้ง เพราะ `.next` ถูก
  production build ทับ — ไม่ใช่บั๊กของโค้ด)

ทดสอบตามรายการ TEST 1–6 ของโจทย์:

| TEST | ผล | หลักฐาน |
| --- | --- | --- |
| 1. เปิด modal ปกติ | PASS | sheet 423px (50% ของจอ) กลางจอ, content ไม่ scroll |
| 2. keyboard ปิด | PASS | อยู่กลางจอ (top 211, bottom 634 จาก 844) |
| 3. keyboard เปิดมาก่อน | PASS | เนื้อหายาว: sheet ≤ 400/300 − 32, header top 16, footer bottom ≤ visible |
| 4. แตะช่องที่อยู่ | PASS (partial) | dropdown absolute z-50, ถูก clip โดย scroller (ไม่ล้นออกนอก dialog), สูตร scroll-into-view พาให้พ้นขอบล่าง |
| 5. scroll | PASS | header/footer ไม่ขยับ, เฉพาะ content scroll |
| 6. Navigation | PASS | ไม่มี panel/sheet ที่ยืดเต็มความสูง, ใช้กติกาเดียวกับ modal แก้ไขบ้าน |

## 10. Issue ที่เหลือ

- **ยังไม่ได้ทดสอบบนมือถือจริง** (ไม่มี signed-in session และไม่มีอุปกรณ์ใน
  environment นี้): การเปิดคีย์บอร์ดจริง, behavior ของ `visualViewport` บน iOS
  (การ pan ของ layout viewport), safe-area และการแตะ dropdown บนอุปกรณ์
  → harness ยืนยันได้แค่ \"สัญญา layout\" และเรขาคณิตใน engine จริง
- iOS เวอร์ชันเก่าที่ไม่ย่อ `visualViewport` เมื่อคีย์บอร์ดเปิด จะไม่ได้รับ
  ประโยชน์ของ `--app-vvh` (แต่ยังใช้ค่า fallback `100dvh` และไม่พังเพิ่ม)
- dropdown ที่อยู่ใน scroll container ยังถูก clip ตามขอบ scroller (ไม่ได้ทำ portal)
  — ชดเชยด้วยการเลื่อน content ให้เห็นรายการ
- หน้า houses ไม่มี restricted confirmation ตอนกดยกเลิก (พฤติกรรมเดิม ไม่ได้แก้)
