# DropWay — ปรับขนาดปุ่ม "นำทาง" ในคลังบ้าน และแยกสีข้อมูลในการ์ดหน้าการนำทาง (2026-10-12)

## วัตถุประสงค์
1. ลดขนาดและความเด่นของปุ่ม "นำทาง" ในการ์ดบ้าน (`src/app/houses/page.tsx`) ให้สมดุลกับปุ่มอื่นในเดียวกัน โดยรักษาพื้นที่สัมผัส ≥44px และไม่เปลี่ยนฟังก์ชัน/URL Google Maps
2. ทำระบบสีให้การ์ดในหน้าการนำทาง (`src/app/navigation/page.tsx`) แยกประเภทข้อมูลได้ชัดเจนและสม่ำเสมอทุกแท็บ โดยไม่แตะ business logic, ข้อความในฐานข้อมูล, สถานะ หรือกฎการเงิน

## Baseline ก่อนเริ่มงาน (ตรวจจริง ไม่ใช้ SHA จากเอกสาร)
- Remote: `https://github.com/MnsEn2001/drop-way.git`, branch `main`
- `git fetch origin main` แล้ว: `origin/main` = `HEAD` = `992e02dbb4f1dba6311f76060a4c65b822001c3b`
- Working tree: มีเฉพาะ `package-lock.json` (untracked เดิม — ไม่ได้แตะ/ไม่ได้ stage)
- ไม่มี remote commit ใหม่กว่า HEAD และไม่มีงาน uncommitted ของผู้ใช้ → ไม่มีอะไรถูกทับ

## ไฟล์ที่แก้
1. `src/app/houses/page.tsx` — 1 บรรทัด (className ปุ่มในการ์ด)
2. `src/app/navigation/page.tsx` — 9 บรรทัด (className สีในการ์ด)

---

## 1. ปุ่ม "นำทาง" ในหน้าคลังบ้าน

**ก่อน:** `className="btn btn-primary flex-1"` → ปุ่มขยายเต็มความกว้าง footer ของการ์ด พื้นสีเขียวทึบ (teal filled) เด่นกว่าปุ่ม ลบ/แก้ไข (icon-btn 44×44) มาก

**หลัง:** `className="btn btn-secondary ml-auto"`
- ความกว้างตามเนื้อความ (~110px รวมไอคอน) ไม่ใช้ `flex-1` อีกต่อไป
- `ml-auto` ชิดขวาห่างจากกลุ่ม ลบ/แก้ไข (gap เดิม 8px ทุกจุด) → แถวสมดุล ไม่แออัด
- `btn-secondary` (outline) ลดความเด่นจากพื้นทึบ แต่ยังเป็นปุ่มที่แยกออกจาก背景 ชัดเจน

**ข้อกำหนดที่ตรวจยืนยันจากโค้ดจริง:**
- พื้นที่สัมผัส: `.btn` ใน `globals.css` กำหนด `min-height: 44px; min-width: 44px` อยู่แล้ว → ไม่ต่ำกว่า 44px
- ไอคอน+ข้อความกึ่งกลาง: `.btn` เป็น `inline-flex; align-items:center; justify-content:center; gap:0.5rem` และ `.btn` มี `white-space: nowrap` → ข้อความไทยสั้น "นำทาง" ไม่ wrap ไม่ล้น
- จอแคบ (การคำนวณ): จอ 320px → พื้นที่ footer สุทธิ ~256px (px-4 ของการ์ด) vs ปุ่มรวม ~215px (44+8+44+8+~111) → ไม่ล้นแนวนอน ไม่ซ้อน
- ฟังก์ชันไม่เปลี่ยน: `onClick={() => openNavigation(h.lat!, h.lng!)}` ไม่ถูกแตะแม้แต่ตัวอักษรเดียว, URL Google Maps และเงื่อนไข `h.lat && h.lng` เดิมครบ
- ปุ่ม `flex-1` อื่นในไฟล์ (บรรทัด 1009/1510/1717) เป็นปุ่มยืนยัน/ยกเลิกใน dialog ฟอร์ม — อยู่นอกขอบเขต ไม่ได้แตะ
- `src/app/page.tsx` เป็น redirect ไป `/houses` อยู่แล้ว (ตรวจแล้ว) → งานนี้ทำในหน้าคลังบ้านซึ่งเป็นหน้าที่ผู้ใช้เห็นจริง ถูกต้อง

## 2. แยกสีข้อมูลในการ์ดหน้าการนำทาง

### ข้อยืนยันเรื่อง "ชื่อด้านหน้า" (ไม่เดาชื่อ field)
ยืนยันจากโค้ดจริงแล้วว่า:
- **"ชื่อด้านหน้า/ชื่อผู้รับที่ต้องการเน้น" = `full_name`** ซึ่งแสดงเป็น `<h3>` หัวการ์ด — `NavigationHouse` (`src/types/navigation.ts`) มี field ที่เป็นชื่อคนเพียง field เดียว จึงไม่มีความกำกวม
- "หมายเหตุ" = `note` (หมายเหตุจากบ้าน แสดงใต้ label "หมายเหตุ:")
- "คนขับบันทึก" = `driver_note` (ใต้ label "คนขับบันทึก:")
- "เบอร์โทรศัพท์" = `phone`, "ที่อยู่/ตำแหน่ง" = `address` (ไอคอน MapPin) + `distance`
- "สถานะส่งงาน/การเงิน" = `delivery_status` + `delivery_note` (pill), "รายงานปัญหา" = `report_reason` (pill)

### จุดสำคัญ: การ์ดถูก render ที่เดียว
การ์ดทุกใบในหน้าการนำทางมาจาก render block เดียว (`currentHouses.map` ~บรรทัด 2063) ใต้ `viewMode === "calculator" ? ... : <grid>` → สีใหม่มีผล **สม่ำเสมอทุกการ์ดและทุก 4 แท็บ** (วันนี้ / ส่งแล้ว / รายงานปัญหา / รอปิดยอด QR) โดยโครงสร้าง ไม่ต้องพึ่งการซ้ำ код

### สีที่เปลี่ยน (เน้นที่ label/หัวข้อเป็นหลัก เนื้อหาเข้มพออ่านง่าย)
| ข้อมูล | ก่อน | หลัง |
|---|---|---|
| ชื่อผู้รับ (`full_name`, h3) | `gray-900` | **`orange-700`** (ส้มเข้ม ~4.6:1 บนพื้นขาว) |
| เบอร์โทร (`phone`) | `gray-600` | **`blue-700`** |
| ไอคอน "โทร" ข้างเบอร์ | `emerald-600` | **`blue-600`** (ให้กลุ่มข้อมูลติดต่อเป็นสีเดียวกัน) |
| ที่อยู่ (`address`) + MapPin | `gray-600` + `gray-400` | **`teal-800`** + MapPin **`teal-600`** |
| label "หมายเหตุ:" | `gray-700` | **`amber-700`** (ตรงกับ token `--warning` เดิม) |
| เนื้อหาหมายเหตุ (`note`) | `gray-700` | **`amber-900`** (เหลืองอำพันเข้ม ~9:1) |
| label "คนขับบันทึก:" | `teal-700` | **`purple-700`** |
| เนื้อหาคนขับบันทึก (`driver_note`) | `gray-700` | **`purple-900`** |

### สี/ข้อมูลที่ "คงเดิม" ตามข้อกำหนด
- Pill สถานะส่งงาน + การเงิน: `lime-600` (จ่ายรวมเงินสด) / `amber-600` (เงินสด) / `blue-600` (โอนเข้าบัญชีฉัน) / `green-600` (ทั่วไป) — คงตามความหมายเดิมทุกประการ
- Pill รายงานปัญหา: `pink-600` (โทรไม่รับ) / `orange-600` (เลื่อน) / `red-600` (ตีกลับ) / `gray-600` (อื่น) — โทนแดง-ส้มตามระดับเตือนเดิม
- `badge badge-amber` ไม่มีพิกัด, เลขลำดับ `#` (teal-700), ตัวเลขระยะทาง (teal-700), วันที่-เวลา (gray-500), แถบ action-rail ทุกปุ่ม — ไม่เปลี่ยน
- ข้อความในฐานข้อมูล รูปแบบ `delivery_note`/`driver_note`/`report_reason` สถานะ และกฎแยกรายยอดเงิน: **ไม่ได้แก้แม้แต่บรรทัดเดียว** (สี pill อ่านจาก `includes(...)` เดิมทั้งหมด)
- ใช้เฉพาะ Tailwind utility สีที่มีอยู่แล้ว → ไม่มี token หรือระบบสีใหม่ใน `globals.css` (ไม่สร้างระบบสีซ้ำซ้อน)

## 3. งานเดิมที่ต้องรักษา — ตรวจก่อนและหลังแก้
- แถบปุ่มไอคอนแนวตั้ง: `.action-rail` CSS อยู่ครบ, markup rail ไม่ถูกแตะ (อยู่นอกช่วง diff ทั้งหมด)
- โหมดมือซ้าย/ขวา: `localStorage["navigationActionRailSide"]` + `flex-row-reverse` ไม่ถูกแตะ
- ไม่มี `autoFocus` เหลือใน `src/` (`grep -rn autoFocus src/` = ว่าง) → ไม่มีการเปิดคีย์บอร์ดอัตโนมัติเพิ่ม
- คืน focus หลังปิด dialog: `rememberDialogTrigger` ครบ 7 จุด เดิม
- GPS/การเรียงเส้นทาง/ระยะทาง/พิกัด, เพิ่ม-แก้-ลบบ้าน, บันทึกหมายเหตุ/คนขับ, สถานะส่งงาน-รายงาน-QR, การเงิน+กันกดซ้ำ, Supabase Auth/session/ownership/RLS/schema: **ไม่มีบรรทัดใน diff แตะสิ่งเหล่านี้** (diff ทั้ง 10 บรรทัดเป็นค่า className string เท่านั้น)

## 4. คำสั่งที่รันจริง และผลลัพธ์
| คำสั่ง | ผล |
|---|---|
| `git fetch origin main` + `git rev-parse` ทั้งสองฝั่ง | PASS — `origin/main` = `HEAD` = `992e02d` ก่อนเริ่ม ไม่มี remote ใหม่ |
| `git diff --check` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run lint` (`next lint`) | PASS — "No ESLint warnings or errors" |
| `npm run build` (`next build`, Next.js 14.2.15) | PASS — 9/9 static pages (`/houses` 17.5kB, `/navigation` 18.4kB) |
| `curl` ทุกเส้นทางใน managed preview | `/login` `/register` `/houses` `/navigation` = **HTTP 200**, `/` = 307 (redirect ตาม design) |
| grep CSS ที่คอมไพล์แล้ว (`.next/static/css`) | `.text-orange-700` `.text-blue-700` `.text-teal-800` `.text-amber-700` `.text-amber-900` `.text-purple-700` `.text-purple-900` `.ml-auto` มีจริงทุกตัว |
| grep client chunk | `btn-secondary ml-auto` อยู่ใน chunk `/houses` จริง, `text-purple-700` อยู่ใน chunk `/navigation` จริง |
| diff review ด้วยตา | 10 บรรทัด = className ล้วน ไม่มี logic/data access เปลี่ยน |

**หมายเหตุระหว่างตรวจสอบ (ไม่ใช่ regression ของโค้ด):** รัน `npm run build` ระหว่างที่ dev server กำลังทำงาน → เขียนทับ `.next` ทำให้ `/login` `/register` คืน 500 ชั่วคราว (webpack pack cache corruption ตาม log) — แก้ด้วย `freebuff-preview restart` (platform-managed) แล้วทุกเส้นทางกลับเป็น 200 ทันที

## 5. BLOCKED / NOT VERIFIED (รายงานตรงไปตรงมา)
- **ไม่มี browser หรือบัญชีทดสอบ Supabase ใน environment นี้** → การ์ดแสดงผลหลังล็อกอินเท่านั้น (`GET /navigation` คืนเฉพาะ loading shell) จึงยัง NOT VERIFIED:
  - สีที่แสดงจริงบนหน้าจอและ contrast จริงบนอุปกรณ์
  - การทดสอบจอแคบ/ข้อความไทยยาวจริงในเบราว์เซอร์ (ส่วนที่ทำได้มีแค่การคำนวณความกว้างจาก CSS จริงในข้อ 1)
  - การสลับ 4 แท็บจริง และการจำค่าโหมดมือข้าม refresh
- Safe area เครื่องมีติ่ง, แนวนอน, จอเตี้ย: NOT VERIFIED
- Production deployment ของ commit `1fe5449` ยังไม่ถูกบันทึกใน GitHub API ณ เวลาที่เขียนเอกสารนี้ (deploy ล่าสุดที่สังเกตได้คือ `992e02d`) — ให้ตรวจ `freebuff-deploy status`/GitHub deployments ภายหลัง
- RLS/ownership และ `middleware.ts` ที่ไม่ทำงาน: ยังเป็นงานค้างเดิม (แยกต่างหาก) ไม่ได้แตะในงาน UI นี้

## 6. Git
- Branch: `main`, remote: `https://github.com/MnsEn2001/drop-way.git`
- Commit งานนี้: **`1fe54494a4031bab611767324e7f2d303162e401`** (`992e02d..1fe5449`)
- ยืนยันตรงกัน 3 ทาง: `git ls-remote --heads origin main` = `git rev-parse HEAD` = GitHub API `GET /repos/MnsEn2001/drop-way/commits/main` = `1fe54494a4031bab611767324e7f2d303162e401`
- ไม่มี force-push/reset — stage เฉพาะ 2 ไฟล์ที่เกี่ยวข้อง, `package-lock.json` ยัง untracked และไม่ได้ถูกเพิ่ม
