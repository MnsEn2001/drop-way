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
    await supabase.auth.signOut();
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
        <nav className="hidden md:flex items-center justify-between p-4 border-b bg-white shadow-sm">
          <span className="text-lg font-bold text-indigo-600">DropWay</span>
          <div className="w-48" />
        </nav>

        {/* Mobile Bottom Bar Loading */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
          <div className="flex justify-around items-center py-3">
            <div className="flex flex-col items-center gap-1 text-gray-400">
              <HomeIcon className="w-6 h-6" />
              <span className="text-xs">คลังหลัก</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-gray-400">
              <Navigation className="w-6 h-6" />
              <span className="text-xs">นำทาง</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-gray-400">
              <Menu className="w-6 h-6" />
              <span className="text-xs">เมนู</span>
            </div>
          </div>
        </nav>
      </>
    );
  }

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden md:flex items-center justify-between p-4 border-b bg-white shadow-sm">
        <div className="flex items-center gap-10">
          {user ? (
            <>
              <Link
                href="/houses"
                className={`font-semibold text-lg transition-colors ${
                  isActive("/houses")
                    ? "text-indigo-600"
                    : "text-gray-700 hover:text-indigo-600"
                }`}
              >
                คลังหลัก
              </Link>
              <Link
                href="/navigation"
                className={`font-medium text-lg transition-colors ${
                  isActive("/navigation")
                    ? "text-indigo-600"
                    : "text-gray-700 hover:text-indigo-600"
                }`}
              >
                การนำทาง
              </Link>
            </>
          ) : (
            <span className="text-xl font-bold text-indigo-600">DropWay</span>
          )}
        </div>

        {user && (
          <button
            onClick={logout}
            className="text-red-600 font-medium hover:text-red-700 transition flex items-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            ออกจากระบบ
          </button>
        )}
      </nav>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
        <div className="flex justify-around items-center py-3">
          {user ? (
            <>
              <Link
                href="/houses"
                className={`flex flex-col items-center gap-1 transition-colors ${
                  isActive("/houses")
                    ? "text-indigo-600"
                    : "text-gray-600 hover:text-indigo-500"
                }`}
                onClick={closeMenu}
              >
                <Warehouse className="w-6 h-6" />
                <span className="text-xs">คลังหลัก</span>
              </Link>

              <Link
                href="/navigation"
                className={`flex flex-col items-center gap-1 transition-colors ${
                  isActive("/navigation")
                    ? "text-indigo-600"
                    : "text-gray-600 hover:text-indigo-500"
                }`}
                onClick={closeMenu}
              >
                <MapPinned className="w-6 h-6" />
                <span className="text-xs">นำทาง</span>
              </Link>

              <button
                onClick={() => setMobileMenuOpen(true)}
                className="flex flex-col items-center gap-1 text-gray-600 hover:text-indigo-500 transition"
              >
                <Menu className="w-6 h-6" />
                <span className="text-xs">เมนู</span>
              </button>
            </>
          ) : (
            <div className="w-full text-center py-2">
              <span className="text-lg font-bold text-indigo-600">DropWay</span>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {user && mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-50"
          onClick={closeMenu}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-4 pb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>

            <div className="px-6 py-8 space-y-7">
              <Link
                href="/houses"
                className="flex items-center gap-4 text-xl font-medium text-gray-800 hover:text-indigo-600 transition"
                onClick={closeMenu}
              >
                <Warehouse className="w-7 h-7 text-indigo-600" />
                คลังหลัก
              </Link>

              <Link
                href="/navigation"
                className="flex items-center gap-4 text-xl font-medium text-gray-800 hover:text-indigo-600 transition"
                onClick={closeMenu}
              >
                <MapPinned className="w-7 h-7 text-indigo-600" />
                การนำทาง
              </Link>

              <hr className="border-gray-200" />

              <button
                onClick={logout}
                className="flex items-center gap-4 w-full text-left text-xl font-medium text-red-600 hover:text-red-700 transition"
              >
                <LogOut className="w-7 h-7" />
                ออกจากระบบ
              </button>
            </div>

            <div className="flex justify-center pb-6">
              <button
                onClick={closeMenu}
                className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition"
              >
                <X className="w-6 h-6 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
