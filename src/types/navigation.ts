export type NavigationHouse = {
  // จาก user_navigation_houses (ข้อมูลนำทางเฉพาะผู้ใช้)
  nav_id: string; // id ในตาราง user_navigation_houses
  user_id: string; // auth.uid()
  nav_note: string | null; // หมายเหตุการนำทางทั่วไป (ถ้ามี)
  nav_priority: number; // ลำดับความสำคัญในการนำทาง

  // เชื่อมโยงกับบ้านหลัก
  house_id: string; // FK ไปยัง houses.id (สำคัญมาก ใช้ค้นหา/อัปเดตบ้าน)

  // ข้อมูลจากตาราง houses (ผ่าน JOIN ใน view)
  full_name: string | null;
  phone: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  note: string | null; // หมายเหตุจากเจ้าของบ้าน (ไม่ใช่ของคนขับ)
  quantity: number; // จำนวนพัสดุ/ชิ้น

  // ข้อมูล timestamp จาก houses
  created_at: string; // ISO string จาก houses
  updated_at: string;

  // สถานะและบันทึกการส่งงาน (จาก user_navigation_houses)
  delivery_status?: "pending" | "delivered" | "reported" | null;
  delivery_note?: string | null; // หมายเหตุการชำระเงิน/ส่งงาน
  delivered_at?: string | null;

  // รายงานปัญหา
  report_reason?: string | null;
  reported_at?: string | null;

  // ⭐ คอมเมนต์/บันทึกเพิ่มเติมของคนขับ (ใหม่)
  driver_note?: string | null;

  // ⭐ ข้อมูลการโทร (ถ้าจะใช้ในอนาคต)
  call_count?: number;
  call_note?: string | null;
};
