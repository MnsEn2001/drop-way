// app/dashboard/layout.tsx   หรือ   app/dashboard/page.tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation"; // ← เพิ่มบรรทัดนี้!

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabaseClient();

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    // ไม่ต้องทำอะไร ถ้าไม่มี session ก็ให้ user = null
  }

  // ถ้ายังไม่ล็อกอิน → เด้งไปหน้า login
  if (!user) {
    redirect("/"); // หรือ redirect("/login") ก็ได้
  }

  // ล็อกอินแล้ว → แสดง dashboard ปกติ
  return <>{children}</>;
}
