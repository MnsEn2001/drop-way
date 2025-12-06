// src/middleware.ts
import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function middleware(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // ถ้าล็อกอินอยู่แล้ว แล้วเปิดหน้าแรก → เด้งไป dashboard ทันที
  if (user && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ถ้ายังไม่ล็อกอิน แล้วพยายามเข้า dashboard → เด้งไป login
  if (!user && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ทุกกรณีอื่น → ให้แสดงหน้าปกติ (หน้าแรก, login, signup, etc.)
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/login", "/signup"],
};
