// C:\DropWay\New_Version\dropway-final\src\components\Navbar.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import {
  Menu,
  X,
  Home as HomeIcon,
  Navigation,
  LogOut,
  Warehouse,
  MapPinned,
} from "lucide-react";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
      setLoading(false);
    };
    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Keep existing auth behavior; do not expose details here.
    }
    setMobileMenuOpen(false);
    location.href = "/login";
  };

  const closeMenu = () => setMobileMenuOpen(false);

  // ฟังก์ชันเช็กว่า path นี้ active หรือไม่
  const isActive = (path: string) => pathname === path;

  // กำลังโหลด
  if (loading) {
    return (
      <>
        {/* Desktop Loading */}
        <nav className="hidden md:flex items-center justify-between border-b bg-white px-4 pb-3">
          <span className="text-lg font-semibold text-teal-700">DropWay</span>
          <div className="flex-1" />
        </nav>

        {/* Mobile Bottom Bar Loading */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-white pb calc(32px + env(safe-area-inset-bottom, 0px))">
          <div className="flex justify-around items-center py-3">
            <div className="flex flex-col items-center gap-1 text-muted">
              <HomeIcon className="w-[22px] h-[22px]" />
              <span className="text-[11px] font-medium tracking-tight">คลังหลัก</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-muted">
              <Navigation className="w-[22px] h-[22px]" />
              <span className="text-[11px] font-medium tracking-tight">นำทาง</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-muted">
              <Menu className="w-[22px] h-[22px]" />
              <span className="text-[11px] font-medium tracking-tight">เมนู</span>
            </div>
          </div>
        </nav>
      </>
    );
  }

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden md:flex items-center justify-between border-b bg-white px-4 py-3">
        <div className="flex items-center gap-6 flex-wrap">
          {user ? (
            <>
              <Link
                href="/houses"
                className={`text-base font-semibold transition-colors ${
                  isActive("/houses")
                    ? "text-teal-700"
                    : "text-muted hover:text-teal-700"
                }`}
              >
                คลังหลัก
              </Link>
              <Link
                href="/navigation"
                className={`text-base font-medium transition-colors ${
                  isActive("/navigation")
                    ? "text-teal-700"
                    : "text-muted hover:text-teal-700"
                }`}
              >
                การนำทาง
              </Link>
            </>
          ) : (
            <span className="text-lg font-semibold text-teal-700">DropWay</span>
          )}
        </div>

        {user && (
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-full border border-muted bg-white px-4 py-2 text-sm font-medium text-danger hover:bg-danger-subtle hover:border-danger hover:text-danger focus-visible:outline-2 focus-visible:outline-focus-ring"
          >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
          </button>
        )}
      </nav>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-white pb calc(32px + env(safe-area-inset-bottom, 0px))">
        <div className="flex justify-around items-center max-w-sm mx-auto">
          {user ? (
            <>
              <Link
                href="/houses"
                className={`flex flex-col items-center gap-1 min-w-[12px] transition-colors ${
                  isActive("/houses")
                    ? "text-teal-700"
                    : "text-muted hover:text-teal-700"
                }`}
                onClick={closeMenu}
              >
                <Warehouse className="w-[22px] h-[22px]" />
                <span className="text-[11px] font-medium tracking-tight">คลังหลัก</span>
              </Link>

              <Link
                href="/navigation"
                className={`flex flex-col items-center gap-1 min-w-[12px] transition-colors ${
                  isActive("/navigation")
                    ? "text-teal-700"
                    : "text-muted hover:text-teal-700"
                }`}
                onClick={closeMenu}
              >
                <MapPinned className="w-[22px] h-[22px]" />
                <span className="text-[11px] font-medium tracking-tight">นำทาง</span>
              </Link>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="flex flex-col items-center gap-1 min-w-[12px] text-muted hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-focus-ring"
              >
                <Menu className="w-[22px] h-[22px]" />
                <span className="text-[11px] font-medium tracking-tight">เมนู</span>
              </button>
            </>
          ) : (
            <div className="flex-1 flex justify-center py-2">
              <span className="text-base font-semibold text-teal-700">DropWay</span>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {user && mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="เมนู"
          className="md:hidden fixed inset-0 z-50 bg-black/40"
          onClick={closeMenu}
        >
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-4 pb-2">
              <div className="w-10 h-1 rounded-full bg-muted" />
            </div>

            <div className="px-5 py-6 space-y-5">
              <Link
                href="/houses"
                className="flex items-center gap-4 text-base font-medium text-foreground hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-focus-ring"
                onClick={closeMenu}
              >
                <Warehouse className="w-6 h-6 text-teal-700" />
                คลังหลัก
              </Link>

              <Link
                href="/navigation"
                className="flex items-center gap-4 text-base font-medium text-foreground hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-focus-ring"
                onClick={closeMenu}
              >
                <MapPinned className="w-6 h-6 text-teal-700" />
                การนำทาง
              </Link>

              <div className="border-t border-border" />

              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-4 w-full text-left text-base font-medium text-danger hover:text-danger-hover focus-visible:outline-2 focus-visible:outline-focus-ring"
              >
                <LogOut className="w-6 h-6" />
                ออกจากระบบ
              </button>
            </div>

            <div className="flex justify-center pb-5">
              <button
                type="button"
                onClick={closeMenu}
                className="p-2 rounded-full bg-muted hover:bg-muted-strong focus-visible:outline-2 focus-visible:outline-focus-ring"
              >
                <X className="w-5 h-5 text-foreground-muted" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
