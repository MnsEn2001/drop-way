// src/middleware.ts
import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function middleware(request: NextRequest) {
  const supabase = createServerSupabaseClient();

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    // ถ้า error เพราะไม่มี token → ไม่เป็นไร ปล่อยให้ user = null
    console.log("No session in middleware (normal on first load)");
  }

  const pathname = request.nextUrl.pathname;

  if (pathname === "/") {
    if (user) return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard") && !user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
