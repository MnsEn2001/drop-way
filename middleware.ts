// src/middleware.ts
import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server"; // ใช้ server client ที่อัปเดตแล้ว

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerSupabaseClient(); // ใช้ client ที่มี setAll จริง

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // ถ้าเปิดหน้าแรก (/)
  if (pathname === "/") {
    if (user) {
      // ล็อกอินแล้ว → เด้งไป Dashboard ทันที
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      // ยังไม่ล็อกอิน → ให้แสดงหน้าแรกปกติ
      return NextResponse.next();
    }
  }

  // ถ้าเข้า /dashboard แต่ยังไม่ล็อกอิน → เด้งไปหน้าแรก
  if (!user && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // ทุกกรณีอื่น → ให้ผ่านไปปกติ (และ copy cookies ถ้ามี refresh)
  return response;
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
