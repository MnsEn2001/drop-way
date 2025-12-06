// src/components/layout/Navbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  LogOut,
  Menu,
  Home,
  User as UserIcon,
  LogIn,
  MapPin,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { useState, useEffect } from "react";

export function Navbar({ initialUser }: { initialUser: User | null }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(initialUser);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (
        event === "SIGNED_OUT" ||
        event === "TOKEN_REFRESHED" ||
        event === "SIGNED_IN"
      ) {
        setUser(session?.user ?? null);
      }

      // Auto-refresh ถ้า token ใกล้หมด
      if (session) {
        const expiresAt = session.expires_at ?? 0;
        const now = Math.floor(Date.now() / 1000);
        if (expiresAt - now < 600) {
          await supabase.auth.refreshSession();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const menuItems = user
    ? [
        { href: "/dashboard", label: "แดชบอร์ด", icon: Home },
        { href: "/dashboard/houses", label: "คลังบ้าน", icon: Package },
        {
          href: "/dashboard/navigate",
          label: "นำทางส่งของ",
          icon: MapPin,
        },
      ]
    : [
        { href: "/", label: "หน้าแรก", icon: Home },
        { href: "/login", label: "เข้าสู่ระบบ", icon: LogIn },
        { href: "/signup", label: "สมัครสมาชิก", icon: UserIcon },
      ];

  const activeHref = menuItems.reduce((prev, curr) => {
    if (
      pathname.startsWith(curr.href) &&
      curr.href.length > (prev?.length || 0)
    ) {
      return curr.href;
    }
    return prev;
  }, "");

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password";

  if (isAuthPage) return null;

  return (
    <>
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition text-gray-800"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link href="/" className="flex items-center gap-3">
              <Package className="w-9 h-9 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Dropway</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8 ml-10">
            {menuItems.map((item) => {
              const isActive = item.href === activeHref;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-base font-medium transition ${
                    isActive
                      ? "text-blue-600 border-b-2 border-blue-600 pb-1"
                      : "text-gray-600 hover:text-blue-600"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition font-medium"
              >
                <LogOut className="w-5 h-5" />
                ออกจากระบบ
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-5 py-2 text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition"
                >
                  เข้าสู่ระบบ
                </Link>
                <Link
                  href="/signup"
                  className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                >
                  สมัครสมาชิก
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <aside className="absolute top-16 left-0 bottom-0 w-72 bg-gray-900 text-white">
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-gray-800">
                <h1 className="text-2xl font-bold">Dropway</h1>
                <p className="text-sm text-gray-400">ระบบส่งของจ.ตาก</p>
              </div>
              <nav className="flex-1 px-4 py-6 space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.href === activeHref;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all ${
                        isActive
                          ? "bg-blue-600 text-white font-semibold shadow-lg"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              {user && (
                <div className="p-4 border-t border-gray-800">
                  <button
                    onClick={() => {
                      setSidebarOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-4 px-5 py-3.5 rounded-xl text-red-400 hover:bg-gray-800 transition"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>ออกจากระบบ</span>
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
