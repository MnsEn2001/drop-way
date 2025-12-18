// src/types/navigation.ts

export type NavigationHouse = {
  nav_id: string;
  user_id: string;
  nav_note: string | null;
  nav_priority: number;

  // มาจาก houses
  id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  note: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;

  // เพิ่ม field สำหรับสถานะการส่งของ/รายงาน (มาจากตาราง user_navigation_houses)
  delivery_status?: "pending" | "delivered" | "reported" | null;
  delivery_note?: string | null;
  report_reason?: string | null;
  delivered_at?: string | null;
  reported_at?: string | null;
};
