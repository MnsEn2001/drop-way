export type NavigationHouse = {
  nav_id: string;
  user_id: string;
  nav_note: string | null;
  nav_priority: number;
  house_id: string; // ← เพิ่มบรรทัดนี้ (สำคัญมาก!)
  // มาจาก houses
  id: string; // อาจจะมีหรือไม่มีก็ได้ แต่เราไม่ใช้แล้ว
  full_name: string | null;
  phone: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  note: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
  // สถานะการส่ง
  delivery_status?: "pending" | "delivered" | "reported" | null;
  delivery_note?: string | null;
  report_reason?: string | null;
  delivered_at?: string | null;
  reported_at?: string | null;
};
