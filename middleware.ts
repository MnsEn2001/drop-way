// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // หน้าที่ไม่ต้องล็อกอิน
  const publicPaths = ["/", "/login", "/register"];
  const pathname = request.nextUrl.pathname;

  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // เช็ก session จาก Supabase cookie
  const accessToken = request.cookies.get("sb-access-token")?.value;
  const refreshToken = request.cookies.get("sb-refresh-token")?.value;

  if (!accessToken || !refreshToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
