# 2026-10-14 — Mobile UI: house card button order + navigation control position/icons + modal footer sizes

## วัตถุประสงค์ของการตรวจสอบ
1. หน้า `/houses` — สลับตำแหน่งปุ่มในการ์ดบ้านเป็น ลบ → นำทาง → แก้ไข (คงพฤติกรรมเดิมทุกปุ่ม)
2. หน้า `/navigation` — ย้ายปุ่มควบคุมตำแหน่งแถบปุ่ม (มือซ้าย/ขวา) ไปอยู่ในแถวเดียวกับปุ่ม
   ตั้งจุดเริ่มต้น, ทำปุ่มทั้งสามเป็นไอคอนล้วน, คง title/aria-label/aria-pressed,
   คง localStorage และค่าเริ่มต้นเดิม
3. ทุก modal ในหน้า `/navigation` — ปุ่มยกเลิก/บันทึกต้องกว้างเท่ากัน ใช้ `flex-1` + `py-3`
   ทั้งคู่ (แก้เคสที่ปุ่มยกเลิกไม่มี class ความกว้าง)

## Repository baseline (ตรวจก่อนแก้)
- `git remote get-url origin` → `https://github.com/MnsEn2001/drop-way.git`
- `git branch --show-current` → `main`
- `git fetch origin main` → `origin/main` = `934d4b02dda8c11c42eb4ea99e8dcc29b1866d5a`
- `git rev-parse HEAD` = `934d4b02dda8c11c42eb4ea99e8dcc29b1866d5a`, `git diff --stat origin/main` ว่าง
- ไฟล์ที่ตรวจก่อนแก้: `.ai/AI_RULES.md`, `.ai/AI_HANDOFF.md`, `.ai/CURRENT_STATE.md`,
  `src/app/houses/page.tsx`, `src/app/navigation/page.tsx`, `src/app/globals.css`
  (ส่วน `.btn`/`.btn-sm`/`.icon-btn`/`.modal-sheet`/`.modal-foot`)

## คำสั่งที่รันจริง และผลลัพธ์จริง

| คำสั่ง | ผลลัพธ์ |
|---|---|
| `git diff --check` | exit 0 (ไม่มี whitespace error) |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 — `✔ No ESLint warnings or errors` |
| `npm run build` (`next build` 14.2.15) | exit 0 — `✓ Compiled successfully`, `9/9` static pages |
| `node tmp/verify_ui.mjs` (harness อ่านไฟล์ source จริง) | **32/32 PASS**, exit 0 |
| `freebuff-preview restart` | `Preview is ready` |
| `curl` `/` → `307`, `/login` → `200`, `/register` → `200`, `/houses` → `200`, `/navigation` → `200` | ผ่าน |
| `grep -rl` ใน `.next/` | `ย้ายแถบปุ่มไปด้านซ้าย` พบใน `.next/static/chunks/app/navigation/page.js` และ `.next/server/app/navigation/page.js` (source ที่แก้ถูก compile จริง) |

### harness ที่รัน (32 ข้อ) — ตรวจไฟล์ source จริงของ repo
- **1.1** ปุ่มในการ์ดบ้านเรียง ลบ → นำทาง → แก้ไข (offset 424 < 710 < 1310)
- **1.2/1.3** ปุ่มนำทางยังอยู่ใต้เงื่อนไข `h.lat && h.lng` และยังใช้ class เดิม `btn btn-secondary ml-auto`
- **1.4/1.5** ปุ่มแก้ไข (`icon-btn`, `title="แก้ไข"`, `aria-label="แก้ไขข้อมูลบ้าน"`) และปุ่มลบ
  (`icon-btn icon-btn-danger`, `title="ลบ"`, `aria-label="ลบบ้านหลังนี้"`) ไม่ถูกแตะ
- **1.6** `openNavigation` ยังสร้าง Google Maps `.../maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
- **2.1–2.7** ปุ่มตั้งจุดเริ่มต้นเป็นไอคอน `MapPin` ล้วน (44px, `h-11 w-11`), มี title + aria-label,
  ยังเปิด start modal, กลุ่มปุ่มมืออยู่ใน `<div>` แถวเดียวกับปุ่มตั้งจุดเริ่มต้น (tag สมดุล 2/2)
- **3.1–3.10** ปุ่มซ้ายมาก่อนขวา; ซ้าย = `PanelLeft` + `changeHandMode("left")`, ขวา = `PanelRight` +
  `changeHandMode("right")` (ไม่สลับ), ไม่มีข้อความ "มือซ้าย/มือขวา" ที่มองเห็นแล้ว,
  มี `aria-label` + `title` + `aria-pressed` ตรงตำแหน่งจริง, ด้านที่เลือกเป็น teal,
  ทั้งคู่ ≥44×44, และ `changeHandMode` (รวม `localStorage.setItem`, key `navigationActionRailSide`,
  toast) เหมือน HEAD ทุกไบต์ รวมทั้งค่าเริ่มต้น `useState<HandMode>("right")`
- **4.1–4.6** ทั้ง 8 modal footer ของหน้า navigation (page input, restricted confirm, unsaved confirm,
  filter, edit house, deliver, comment, report) มี 2 ปุ่มที่เป็น `flex-1` + `py-3` ทั้งคู่
  (cancel = `btn btn-secondary`, confirm = `btn btn-primary`); ปุ่มยกเลิกของ modal แก้ไขบ้าน
  ที่เดิม **ไม่มี class ความกว้างเลย** ตอนนี้มีแล้ว; `.modal-foot` ยังไม่มี `position`/`bottom`
  (ไม่เป็น fixed/sticky); token ของ dirty-close (`setShowRestrictedConfirmModal` /
  `setShowUnsavedChangesConfirmModal`) และ loading/disabled (`isDeliverSubmitting`,
  `isCommentSubmitting`, `isReportSubmitting`) เท่าเดิมทุกจุด
- **5.1–5.3** `git diff --name-only` มีแค่ 2 ไฟล์ UI; call site ของ Supabase/CRUD
  (`supabase.from(`, `.update(`, `.insert(`, `.delete(`, `confirmDeliver`, `confirmReport`,
  `saveHouse`, `handleSetStartPosition`) และจำนวน `google.com/maps` / `openNavigation(` เท่าเดิม

> harness เป็นไฟล์ชั่วคราว `tmp/verify_ui.mjs` (ไม่ commit) — โปรเจกต์ยังไม่มี test runner

### หมายเหตุ harness รอบแรก
รอบแรกได้ 29/31 โดย 2 ข้อ FAIL เป็น **ข้อบกพร่องของ harness เอง ไม่ใช่ของ source**:
- ข้อ 3.4/3.5 ใช้หน้าต่างข้อความ (window) ที่กว้างเกินไป จนอ่านข้ามไปปุ่มถัดไป และนับข้อความ
  "มือซ้าย/มือขวา" ใน **คอมเมนต์** (`// โหมดมือ: ค่าเริ่มต้น = มือขวา`) ด้วย
- แก้เป็น `buttonBlock()` (อิง `<button ... </button>` จริง) และตรวจเฉพาะข้อความที่ render
  (`>\s*มือ(ซ้าย|ขวา)\s*<`) แล้วได้ 32/32 PASS โดยเช็คย้อนกับ HEAD ว่าเดิมเคยมีข้อความจริง

## สรุปผล PASS / FAIL / BLOCKED
| # | หัวข้อ | ผล |
|---|---|---|
| 1 | สลับปุ่มในหน้า Houses | **PASS** (source + diff; ปุ่มนำทางยังใช้ Google Maps และเงื่อนไขพิกัดเดิม) |
| 2 | ปุ่มตั้งจุดเริ่มต้นแบบไอคอน | **PASS** (MapPin ล้วน, 44px, title + aria-label คงอยู่, เปิด modal เดิม) |
| 3 | ปุ่มเลือกซ้าย–ขวาและความหมายตรงกัน | **PASS** (ซ้าย=PanelLeft→"left", ขวา=PanelRight→"right", aria-pressed ตรง, localStorage คงเดิม) |
| 4 | ขนาดปุ่มบันทึก/ยกเลิกทุกโมดัลที่เกี่ยวข้อง | **PASS** (8/8 footer เป็น `flex-1`+`py-3` ทั้งคู่; แก้ปุ่มยกเลิกที่ไม่มี class) |
| 5 | TypeScript / Lint / Build | **PASS** (`npx tsc --noEmit` 0 · `npm run lint` 0 · `npm run build` 0 · `git diff --check` 0) |
| 6 | Browser/mobile verification | **BLOCKED** |
| 7 | Git commit, push และ SHA | **PASS** (ดูด้านล่าง) |

## ส่วนที่ยังตรวจสอบไม่ได้ / ข้อจำกัด
- **BLOCKED — runtime/browser/mobile**: ไม่มี browser session หรือบัญชีที่ล็อกอินได้ใน environment นี้
  การ์ดบ้านและแถวควบคุมทั้งหมด render หลัง client-side session check + โหลดข้อมูลจาก Supabase
  จึงยืนยันได้แค่ HTTP 200 ของหน้า และตรวจ markup/class ใน source กับ chunk ที่ compile
  ยัง **ไม่ได้คลิกจริง** ว่า: กดไอคอนซ้ายแล้ว `.action-rail` ไปซ้าย, กดขวาแล้วไปขวา,
  ปุ่มในแถวไม่ล้นจอบนมือถือจริง และ footer ไม่ล้นจอเมื่อเปิดคีย์บอร์ด
- **BLOCKED**: ตรวจบน viewport มือถือจริง (Android Chrome / iOS Safari) รวม safe-area และ landscape
- ไม่ได้แก้/ตรวจ Supabase RLS หรือสิทธ์การเข้าถึง (นอกขอบเขตงานนี้ และไม่แตะเลย)
- ไม่มี test runner ในโปรเจกต์ → harness 32 ข้อเป็นเครื่องมือชั่วคราวใน session ไม่ได้ commit
- `py-3` ถูกเพิ่มให้ footer ที่เดิมมีแค่ `flex-1` (page input, confirm 2 ตัว, filter) เพื่อให้
  พื้นที่กดสม่ำเสมอกับ modal ที่ใช้ `flex-1 py-3` อยู่แล้ว — เป็นการเปลี่ยน class เท่านั้น
  ไม่แตะ logic/disabled/dirty flow

## Git
- commit งาน UI: `f660df99eb02b0c9b2881acbdd0f1ddab4cc5b74`
  (`fix(ui): reorder house card actions and make navigation controls icon-only`)
- push ขึ้น `main` แบบ fast-forward (`934d4b0..f660df9`), `git ls-remote --heads origin main`
  = `f660df99eb02b0c9b2881acbdd0f1ddab4cc5b74` = local `HEAD` → ตรวจสอบตรงกัน
- ไม่มี force-push / reset / history rewrite; ไฟล์ untracked ของผู้ใช้และ `package-lock.json`
  ไม่ถูก stage

## ข้อควรระวังที่ควรแจ้งผู้พัฒนา
- ปุ่ม "นำทาง" ในการ์ดบ้านยังใช้ `ml-auto` ตามดีไซน์เดิม (ตรึงไว้ฝั่งขวา) ตอนนี้จึงมีปุ่มแก้ไข
  ต่อท้ายทางขวาสุด — ถ้าต้องการให้กลุ่มปุ่มชิดซ้ายทั้งหมด ให้ย้าย `ml-auto` ไปที่ปุ่มแก้ไข
- ปุ่มตั้งจุดเริ่มต้นเหลือไอคอนอย่างเดียว ความหมายอาศัย `title` (tooltip) + `aria-label`
  จึงควรตรวจด้วยตาบนอุปกรณ์จริงว่าผู้ใช้ยังเข้าใจ
- คอมเมนต์ในโค้ดยังใช้คำ "มือซ้าย/มือขวา" อธิบายโหมด (ไม่ใช่ข้อความบนจอ) — ตั้งใจไม่แก้
