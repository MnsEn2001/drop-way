# DropWay — ปรับให้ modal ทุกใบอยู่ตรงกลางจอทุกขนาด (2026-10-12)

## วัตถุประสงค์
แก้ปัญหาหน้าต่าง/modal ที่ชิดด้านล่างบนมือถือ (`items-end`) และจัดกึ่งกลางเฉพาะ desktop (`sm:items-center`) ให้ทุก modal อยู่กึ่งกลางพื้นที่ที่มองเห็นบนทุกขนาดหน้าจอ โดยไม่แตะ business logic และใช้กลไก visual viewport เดิมของโปรเจกต์ (ห้ามสร้างระบบ viewport ซ้ำ)

## Baseline ก่อนเริ่มงาน (ตรวจจริง ไม่ใช้ SHA จากเอกสาร)
- Remote: `https://github.com/MnsEn2001/drop-way.git`, branch `main`
- `git fetch origin main` แล้ว: `origin/main` = `HEAD` = `a43d0547537730c2b891811de38b756cdb461b8e`
- Working tree: มีเฉพาะ `package-lock.json` (untracked เดิม — ไม่ได้แตะ/ไม่ได้ stage)
- ไม่มี remote commit ใหม่และไม่มีงาน uncommitted ของผู้ใช้ → ไม่มีอะไรถูกทับ

## ไฟล์ที่แก้
1. `src/app/navigation/page.tsx` — 15 บรรทัด (8 overlay + 5 max-h + calculator sheet + header ของ calculator)
2. `src/app/houses/page.tsx` — 6 บรรทัด (4 overlay + 2 max-h)
3. `src/app/globals.css` — `.modal-sheet` base (มุมโค้ง + เอา padding safe-area ด้านล่างออก)

## Inventory modal ที่ตรวจพบทั้งหมด
`src/app/navigation/page.tsx` — 8 ใบ (ทุกใบใช้ pattern เดิม `modal-overlay flex items-end justify-center sm:items-center sm:p-4`):
1. เลือกหมายเลขหน้า ("ไปที่หน้า", max-w-xs) — บรรทัด 2485
2. ตัวกรองบ้าน (Filter, max-w-md) — 2609
3. แก้ไขบ้าน (max-w-sm) — 2761
4. ตั้งจุดเริ่มต้นทาง (max-w-sm) — 2919
5. ยืนยันส่งงาน (max-w-sm) — 3063
6. บันทึกคอมเมนต์/หมายเหตุคนขับ (max-w-sm) — 3272
7. เครื่องคิดเลขเงินทอน (max-w-md/lg, p-0, มี header teal) — 3340
8. รายงานปัญหา (max-w-sm) — 3491

`src/app/houses/page.tsx` — 4 ใบ (pattern เดิมเดียวกันทุกตัวอักษร): เลือกหมายเลขหน้า (1325), ตัวกรอง (1376), เพิ่ม/แก้ไขบ้าน (1521), ยืนยันลบบ้าน (1742)

**ไม่นับเป็น modal:** backdrop ของ FAB เมนู (`fixed inset-0 bg-black/30 z-40`, navigation บรรทัด 2537) — เป็นพื้นหลังของปุ่มลอยมุมจอ ไม่ใช่หน้าต่าง ไม่ได้แก้

## การแก้ไข

### 1) Overlay: จัดกึ่งกลางทุกขนาดจอ + padding รอบทุกด้าน
ทั้ง 12 ใบ (8 + 4):
- ก่อน: `modal-overlay flex items-end justify-center sm:items-center sm:p-4`
- หลัง: `modal-overlay flex items-center justify-center p-4`
→ แกนตั้งกลางทุก breakpoint (ไม่มี `items-end`/`sm:` ให้สองโซนตำแหน่งต่างกันอีก) และมี padding 16px รอบทุกด้าน หน้าต่างไม่ชนขอบจอ

### 2) `.modal-sheet` ใน `globals.css` (CSS กลาง — ตรวจก่อนแก้ตามข้อกำหนด)
- `border-radius: 1rem 1rem 0 0` (มุมโค้งเฉพาะด้านบน = แบบ bottom-sheet) → **`border-radius: 1rem`** (ครบทุกด้านทุก breakpoint รวมมือถือ) — ค่าเดียวกับ utility `rounded-2xl` เดิมที่ sheet บางใบใช้ จึงไม่มีการชนกันของค่า
- เอา `padding-bottom: env(safe-area-inset-bottom, 0px)` ออก — เป็น affordance ของ bottom-sheet ( sheet เคยอยู่ชิดขอบล่าง) เมื่อจัดกลางแล้วเป็นพื้นที่ว่างตายตัวที่ทำให้ดูไม่สมมาตร โดย overlay มี padding รอบheet อยู่แล้ว
- **คงไว้ตามเดิมทุกประการ:** `max-height: 80vh` fallback + `max-height: min(85dvh, calc(var(--app-vvh, 100dvh) * 0.85))` (อิง visual viewport จริง), `overflow-y: auto`, `overflow-x: hidden`, `overscroll-behavior: contain`, `.modal-foot` sticky — ไม่ได้แตะ

### 3) เอา `sm:max-h-[90vh]` ออกจาก sheet 7 ใบ
บรรทัด 2614/2764/2922/3066/3275 (navigation) และ 1384/1531 (houses) — utility นี้ override max-height ของ CSS base บน desktop ทำให้ desktop เพิกเฉยตัวแปร `--app-vvh` และสูงได้ถึง 90vh ต่างจากมือถือ 85% ของ viewport ที่มองเห็น → เอาออกเพื่อให้ทุกขนาดจอใช้ max-height อิงพื้นที่มองเห็นจริงสูตรเดียวกัน ความกว้างสูงสุด (max-w-*) ของแต่ละใบคงเดิมทั้งหมด

### 4) เครื่องคิดเลข: เลื่อนได้จริงบนจอเตี้ย
- Sheet: เอา `overflow-hidden` ออก (`w-full max-w-md overflow-hidden p-0 sm:max-w-lg` → `w-full max-w-md p-0 sm:max-w-lg`) — เดิมบังคับซ่อนเมื่อเนื้อหาเกิน max-height (~734px โดยประมาณจากปุ่ม h-16 4 แถว) ทำให้แถวปุ่มล่าง/ปุ่มปิดถูกตัดและเอื้อมไม่ถึงบนจอเตี้ย → ตอนนี้ base `overflow-y: auto` ทำงาน เลื่อนถึงทุกปุ่ม
- Header teal รับมุมโค้งเอง: `bg-teal-700 text-white p-4 text-center` → เพิ่ม `rounded-t-[1rem]` (เพราะไม่มี overflow-hidden ครอบ sheet แล้ว) ส่วนท้าย sheet เป็นพื้นขาวเดียวกับ sheet จึงไม่ต้องทำมุมล่าง

### ทำไมแก้ houses ด้วย
`houses/page.tsx` มี pattern `items-end` เดิมตัวอักษรเดียวกันทั้ง 4 ใบ และใช้ `.modal-sheet` ร่วมกัน — ถ้าแก้เฉพาะ navigation ใบจะเหลือ bottom-sheet ที่มุมโค้งทั้ง 4 ด้านติดขอบจอ (มุมล่างโผล่เป็นรอยโค้งแปลก ๆ) จึงแก้ overlay ทั้ง 4 ใบให้ตรงกลางตามกัน และเป็นผลตามเป้าหมาย "ทุก modal อยู่ตรงกลางบนทุกขนาดหน้าจอ" — แก้เฉพาะ className ไม่มี logic ปน

## คีย์บอร์ดมือถือ (ข้อกำหนดพิเศษ)
- **ไม่เปิดคีย์บอร์ดอัตโนมัติ:** `grep -rn autoFocus src/` = ว่าง (ไม่มีการเพิ่ม autoFocus กลับคืนมา) · แตะช่องกรอกเอง → input ปกติ ไม่มีอะไรบัง (overlay โปร่งใสครอบเฉพาะตอน modal เปิด)
- **คีย์บอร์ดเปิดแล้วไม่บัง dialog:** ใช้กลไกเดิมของโปรเจกต์ — `useVisualViewportHeightVar()` (`src/lib/viewport.ts`) ถูกเรียกในหน้า navigation (บรรทัด 87) และ houses (บรรทัด 40) อยู่แล้ว ไม่ได้สร้างระบบซ้ำ; เมื่อคีย์บอร์ดเปิด `--app-vvh` หด → max-height ของ sheet หดตาม → sheet อยู่ในพื้นที่มองเห็น, เนื้อหาใน sheet เลื่อนได้ (`overflow-y: auto` + `overscroll-behavior: contain`) และ `.modal-foot` sticky ทำให้ปุ่มบันทึก/ยกเลิกเอื้อมถึง
- **Focus restoration คงเดิม:** `rememberDialogTrigger` ครบ 7 จุด — คืนโฟกัสให้ปุ่มที่กดเปิดตอนปิด ไม่ได้แก้ (การคืนโฟกัสไม่ทำให้คีย์บอร์ดเด้งเพราะ elements ที่โฟกัสไม่ใช่ input)

## คงสภาพงานเดิม/ห้ามเปลี่ยน logic — ตรวจแล้ว
- Diff ทั้งหมด 25 บรรทัดเป็น className string + comment ใน CSS เท่านั้น — ไม่มีบรรทัดแตะ Supabase query/mutation, Auth/session/ownership/RLS, การบันทึกบ้าน/หมายเหตุ, GPS/การเรียงเส้นทาง/ระยะทาง, การยืนยันส่งงาน, รายงานปัญหา, การคำนวณเงิน, กันกดบันทึกซ้ำ
- `role="dialog"`/`aria-modal`/`aria-labelledby`, backdrop-close (`onClick` overlay + `stopPropagation` ของ sheet), `max-w-*` สูงสุดของแต่ละใบ, `.modal-foot` sticky, `.action-rail`, โหมดมือ, สีข้อมูลการ์ด — ไม่ถูกแตะ

## คำสั่งที่รันจริง และผลลัพธ์
| คำสั่ง | ผล |
|---|---|
| `git fetch origin main` + `git rev-parse` ทั้งสองฝั่ง | PASS — `origin/main` = `HEAD` = `a43d054` ก่อนเริ่ม ไม่มี remote ใหม่ |
| `git diff --check` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run lint` (`next lint`) | PASS — "No ESLint warnings or errors" |
| `npm run build` (`next build`, Next.js 14.2.15) | PASS — 9/9 static pages (`/houses` 17.5kB, `/navigation` 18.4kB) |
| `curl` ทุกเส้นทางใน managed preview | `/login` `/register` `/houses` `/navigation` = **HTTP 200**, `/` = 307 (redirect ตาม design) |
| grep CSS ที่คอมไพล์แล้ว | `.modal-sheet{border-radius:1rem;...max-height:min(85dvh,calc(var(--app-vvh,100dvh)*.85));overflow-y:auto;...}` และไม่มี `padding-bottom env(safe-area...)` แล้ว |
| grep client chunk | class `modal-overlay flex items-center justify-center p-4` อยู่ใน chunk `/houses` และ `/navigation` จริง |
| grep pattern เก่า (`items-end justify-center`, `sm:max-h-[90vh]`, `overflow-hidden p-0`) | ว่างทั้ง `src/` และ SSR HTML ที่ curl มาได้ |
| diff review ด้วยตา | 25 บรรทัด = className + comment CSS ล้วน |

หมายเหตุระหว่างตรวจสอบ (ไม่ใช่ regression ของโค้ด): รัน `next build` ระหว่าง dev server ทำงาน → `/login` `/register` คืน 500 ชั่วคราว (webpack pack cache corruption แบบเดียวกับรอบที่แล้ว) — แก้ด้วย `freebuff-preview restart` แล้วทุกเส้นทางกลับ 200 ทันที

## BLOCKED / NOT VERIFIED (รายงานตรงไปตรงมา)
- **ไม่มี browser หรืออุปกรณ์จริงใน environment นี้** → modal แสดงหลังล็อกอินเท่านั้น จึงยัง NOT VERIFIED: การเห็นตำแหน่งกึ่งกลางจริงบนจอ มือถือ/desktop, จอเตี้ย/แนวตั้ง/แนวนอน, พฤติกรรมตอนคีย์บอร์ดเปิดบน iOS Safari/Android Chrome จริง, การเลื่อนถึงปุ่มบันทึกจริง, กด backdrop ปิด/ยกเลิก/บันทึกจริง — สิ่งที่ยืนยันได้ในรอบนี้คือ static analysis ของ CSS/markup จริง + build/serve ผ่าน
- Production deployment ของ commit นี้ยังไม่ถูกบันทึกใน GitHub API ณ เวลาเขียนเอกสาร (deploy ล่าสุดที่สังเกตได้คือ `a43d054` สร้าง 2026-10-12T01:43:59Z) — ตรวจภายหลังด้วย `freebuff-deploy status`
- RLS/ownership และ `middleware.ts` ที่ไม่ทำงาน: งานค้างเดิม ไม่ได้แตะ

## Git
- Branch: `main`, remote: `https://github.com/MnsEn2001/drop-way.git`
- Commit งานนี้: **`ddd5a940a668af99f48db22d56fc150f006b90fb`** (`a43d054..ddd5a94`)
- ยืนยันตรงกัน 3 ทาง: `git ls-remote --heads origin main` = `git rev-parse HEAD` = GitHub API `GET /repos/MnsEn2001/drop-way/commits/main` = `ddd5a940a668af99f48db22d56fc150f006b90fb`
- ไม่มี force-push/reset — stage เฉพาะ 3 ไฟล์ที่เกี่ยวข้อง, `package-lock.json` ยัง untracked และไม่ได้ถูกเพิ่ม
