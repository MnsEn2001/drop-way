// C:\\DropWay\\New_Version\\dropway-final\\src\\components\\Navbar.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import type { LucideIcon } from "lucide-react";
import { Menu, X, LogOut, Warehouse, MapPinned } from "lucide-react";

// Single source of truth for the in-app navigation destinations on mobile.
const MOBILE_TABS: ReadonlyArray<{ href: string; label: string; Icon: LucideIcon }> = [
  { href: "/houses", label: "คลังหลัก", Icon: Warehouse },
  { href: "/navigation", label: "นำทาง", Icon: MapPinned },
];

function mobileTabClass(active: boolean) {
  return [
    "flex min-h-[44px] min-w-[64px] flex-col items-center justify-center gap-0.5 rounded-xl px-3 text-[13px] font-medium tracking-tight transition-colors zoom-pinch-ok",
    active ? "text-teal-700" : "text-gray-500 hover:text-teal-700",
  ].join(" ");
}

function mobileTabIconClass(active: boolean) {
  return [
    "flex h-8 w-12 items-center justify-center rounded-lg transition-colors",
    active ? "bg-teal-50 text-teal-700" : "bg-transparent text-current",
  ].join(" ");
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

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

  // Drawer behavior: Escape closes, focus moves in on open, focus returns on close.
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const drawer = drawerRef.current;
    const trigger = menuButtonRef.current;

    const focusables = () => {
      if (!drawer) return [] as HTMLElement[];
      return Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      );
    };

    drawer?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawer) return;

      const items = focusables();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = active instanceof HTMLElement && drawer.contains(active);

      if (event.shiftKey) {
        if (!inside || active === first || active === drawer) {
          event.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [mobileMenuOpen]);

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

  // กำลังโหลด — แสดงโครงที่นิ่งเหมือนจริง ไม่มีลิงก์ปลอม
  if (loading) {
    return (
      <>
        {/* Desktop Loading */}
        <nav className="hidden md:flex items-center justify-between border-b border-gray-200/90 bg-white px-4 py-3">
          <span className="text-lg font-semibold text-teal-700">DropWay</span>
          <div className="flex-1" />
        </nav>

        {/* Mobile Loading skeleton: same geometry as the real bottom bar, no links */}
        <div
          aria-hidden="true"
          className="mobile-bottom-nav md:hidden"
        >
          <div className="mobile-nav-inner mx-auto flex max-w-sm items-center justify-around px-4">
            {[0, 1, 2].map((key) => (
              <div key={key} className="flex flex-col items-center gap-1.5">
                <div className="h-8 w-12 animate-pulse rounded-lg bg-gray-100" />
                <div className="h-3 w-10 animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Desktop Navbar */}
      <nav
        aria-label="แถบนำทางหลัก"
        className="hidden md:flex items-center justify-between border-b border-gray-200/90 bg-white px-4 py-3"
      >
        <div className="flex items-center gap-6">
          <Link href="/houses" className="text-lg font-semibold text-teal-700">
            DropWay
          </Link>
          {user && (
            <>
              <Link
                href="/houses"
                aria-current={isActive("/houses") ? "page" : undefined}
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
                aria-current={isActive("/navigation") ? "page" : undefined}
                className={`text-base font-medium transition-colors ${
                  isActive("/navigation")
                    ? "text-teal-700"
                    : "text-gray-500 hover:text-teal-700"
                }`}
              >
                การนำทาง
              </Link>
            </>
          )}
        </div>

        {user && (
          <button type="button" onClick={logout} className="btn btn-danger">
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>ออกจากระบบ</span>
          </button>
        )}
      </nav>

      {/* Mobile Bottom Bar — the only mobile navigation system */}
      <nav aria-label="แถบนำทางหลัก" className="mobile-bottom-nav md:hidden">
        <div className="mobile-nav-inner mx-auto flex max-w-sm items-center justify-around px-4">
          {user ? (
            <>
              {MOBILE_TABS.map(({ href, label, Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={mobileTabClass(active)}
                  >
                    <span aria-hidden="true" className={mobileTabIconClass(active)}>
                      <Icon className="h-[22px] w-[22px]" />
                    </span>
                    <span>{label}</span>
                  </Link>
                );
              })}

              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="เปิดเมนู"
                aria-haspopup="dialog"
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu-drawer"
                className={mobileTabClass(false)}
              >
                <span aria-hidden="true" className={mobileTabIconClass(false)}>
                  <Menu className="h-[22px] w-[22px]" />
                </span>
                <span>เมนู</span>
              </button>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <span className="text-base font-semibold text-teal-700">DropWay</span>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {user && mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeMenu}
            aria-hidden="true"
          />

          <div
            id="mobile-menu-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="เมนู"
            tabIndex={-1}
            className="modal-sheet absolute bottom-0 left-0 right-0"
          >
            <div className="flex justify-center pt-4 pb-1">
              <div className="h-1 w-10 rounded-full bg-gray-200" aria-hidden="true" />
            </div>

            <nav aria-label="เมนูหลัก" className="space-y-1 px-4 py-4">
              {MOBILE_TABS.map(({ href, label, Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeMenu}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-base font-medium transition-colors zoom-pinch-ok ${
                      active
                        ? "bg-teal-50 text-teal-700"
                        : "text-gray-700 hover:bg-gray-50 hover:text-teal-700"
                    }`}
                  >
                    <Icon className="h-6 w-6 text-teal-700" aria-hidden="true" />
                    {label}
                  </Link>
                );
              })}

              <div className="pt-2">
                <div className="border-t border-gray-200/90" aria-hidden="true" />
              </div>

              <button
                type="button"
                onClick={logout}
                className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-left text-base font-medium text-red-700 transition-colors hover:bg-red-50 hover:text-red-800 zoom-pinch-ok"
              >
                <LogOut className="h-6 w-6" aria-hidden="true" />
                ออกจากระบบ
              </button>
            </nav>

            <div className="flex justify-center pb-4">
              <button
                type="button"
                onClick={closeMenu}
                aria-label="ปิดเมนู"
                className="rounded-full bg-gray-100 p-3 transition-colors hover:bg-gray-200 zoom-pinch-ok"
              >
                <X className="h-5 w-5 text-gray-500" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
