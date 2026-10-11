// C:\\DropWay\\New_Version\\dropway-final\\src\\components\\Navbar.tsx
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

const ACTIVE_CLASS = "text-teal-700";
const INACTIVE_CLASS = "text-gray-500 hover:text-teal-700";

function mobileTab(
  href: string,
  icon: React.ReactNode,
  label: string,
  currentTab: boolean
) {
  return (
    <Link
      href={href}
      className={`relative flex flex-col items-center gap-1 min-h-[52px] p-2 rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal focus-visible:z-50 zoom-pinch-ok ${
        currentTab
          ? ACTIVE_CLASS
          : INACTIVE_CLASS
      }`}
      aria-label={`ไปยัง ${label}`}
      aria-current={currentTab ? "page" : undefined}
    >
      <span
        className={`flex items-center justify-center w-12 h-12 rounded-xl text-[22px] transition-colors zoom-pinch-ok ${
          currentTab
            ? "bg-teal-50 text-teal-700"
            : "bg-gray-50 text-gray-500"
        }`}
        aria-hidden="false"
      >
        {icon}
      </span>
      <span className="text-[13px] font-medium tracking-tight">{label}</span>
    </Link>
  );
}

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

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

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
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-white pb calc(56px + env(safe-area-inset-bottom, 0px))"
        >
          <div className="flex justify-around items-center max-w-sm mx-auto px-4 py-3">
            {mobileTab("/houses", <HomeIcon className="text-teal-700" />, "คลังหลัก", false)}
            {mobileTab("/navigation", <Navigation className="text-teal-700" />, "นำทาง", false)}
            {mobileTab("/menu", <Menu className="text-teal-700" />, "เมนู", false)}
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
                    : "text-gray-500 hover:text-teal-700"
                }`}
              >
                คลังหลัก
              </Link>
              <Link
                href="/navigation"
                className={`text-base font-medium transition-colors ${
                  isActive("/navigation")
                    ? "text-teal-700"
                    : "text-gray-500 hover:text-teal-700"
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
            type="button"
            onClick={logout}
            className="btn btn-danger"
          >
            <LogOut className="w-4 h-4" />
            <span>ออกจากระบบ</span>
          </button>
        )}
      </nav>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-white pb calc(56px + env(safe-area-inset-bottom, 0px))">
        <div className="flex justify-around items-center max-w-sm mx-auto px-4 pb-2">
          {user ? (
            <>
              {mobileTab(
                "/houses",
                <Warehouse className="text-teal-700" />,
                "คลังหลัก",
                isActive("/houses")
              )}
              {mobileTab(
                "/navigation",
                <MapPinned className="text-teal-700" />,
                "นำทาง",
                isActive("/navigation")
              )}
              {mobileTab(
                "/menu",
                <Menu className="text-teal-700" />,
                "เมนู",
                false
              )}
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
            className="absolute bottom-0 left-0 right-0 modal-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ touchAction: "manipulation" }}
          >
            <div className="flex justify-center pt-4 pb-2">
              <div className="w-10 h-1 rounded-full bg-gray-200" title="ปิดเมนู" />
            </div>

            <div className="px-5 py-6 space-y-5">
              <Link
                href="/houses"
                className="flex items-center gap-3 text-base font-medium text-gray-900 hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal focus-visible:z-50 zoom-pinch-ok"
                onClick={closeMenu}
              >
                <Warehouse className="w-6 h-6 text-teal-700" />
                คลังหลัก
              </Link>

              <Link
                href="/navigation"
                className="flex items-center gap-3 text-base font-medium text-gray-900 hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal focus-visible:z-50 zoom-pinch-ok"
                onClick={closeMenu}
              >
                <MapPinned className="w-6 h-6 text-teal-700" />
                การนำทาง
              </Link>

              <div className="border-t border-gray-200/90" />

              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-3 w-full text-left text-base font-medium text-red-700 hover:text-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal focus-visible:z-50 zoom-pinch-ok"
              >
                <LogOut className="w-6 h-6" />
                ออกจากระบบ
              </button>
            </div>

            <div className="flex justify-center pb-5">
              <button
                type="button"
                onClick={closeMenu}
                aria-label="ปิดเมนู"
                className="relative p-3 rounded-full bg-gray-100 hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal focus-visible:z-50 zoom-pinch-ok"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
