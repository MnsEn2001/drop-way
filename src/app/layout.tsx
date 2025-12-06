// src/app/layout.tsx
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabaseClient();

  // ใช้ getUser() แทน getSession() → หาย warning + ปลอดภัยกว่า
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="th">
      <body className="bg-gray-50 min-h-screen">
        <Navbar initialUser={user} />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
