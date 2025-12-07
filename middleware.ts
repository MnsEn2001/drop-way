// src/middleware.ts
import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function middleware(request: NextRequest) {
  const supabase = createServerSupabaseClient();
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
      // ยังไม่ล็อกอิน → ให้แสดงหน้าแรกปกติ (ไม่ต้องทำอะไร)
      return NextResponse.next();
    }
  }

  // ถ้าเข้า /dashboard แต่ยังไม่ล็อกอิน → เด้งไปหน้าแรก
  if (!user && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // ทุกกรณีอื่น → ให้ผ่านไปปกติ
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
