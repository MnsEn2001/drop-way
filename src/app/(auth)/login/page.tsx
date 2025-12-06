// src/app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      let friendlyMessage = "";

      if (error.message.includes("Invalid login credentials")) {
        friendlyMessage = "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง";
      } else if (error.message.includes("Email not confirmed")) {
        friendlyMessage = "กรุณายืนยันอีเมลของคุณก่อนเข้าสู่ระบบ";
      } else if (
        error.message.includes("rate limit") ||
        error.message.includes("too many")
      ) {
        friendlyMessage =
          "มีการพยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
      } else {
        friendlyMessage = error.message.includes("password")
          ? "รหัสผ่านไม่ถูกต้อง"
          : "ไม่พบบัญชีนี้ในระบบ";
      }

      setError(friendlyMessage);
      setLoading(false);
    } else {
      router.replace("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-10 text-center">
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Dropway
            </h1>
            <p className="text-blue-100 mt-2 text-lg">ยินดีต้อนรับกลับ!</p>
          </div>

          {/* Form Body */}
          <div className="p-8 pt-10 space-y-6">
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  อีเมล
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="example@dropway.com"
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none disabled:bg-gray-50"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  รหัสผ่าน
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none disabled:bg-gray-50"
                />
              </div>

              {/* Enhanced Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl text-sm text-center animate-pulse shadow-sm">
                  <p className="font-medium">{error}</p>
                  {error.includes("อีเมลหรือรหัสผ่านไม่ถูกต้อง") && (
                    <p className="text-xs mt-2 text-red-600">
                      ลืมรหัสผ่าน? กด{" "}
                      <Link
                        href="/forgot-password"
                        className="underline font-semibold"
                      >
                        ลืมรหัสผ่าน
                      </Link>{" "}
                      เพื่อตั้งใหม่
                    </p>
                  )}
                  {error.includes("ยืนยันอีเมล") && (
                    <p className="text-xs mt-2">
                      ยังไม่ได้รับเมล? ตรวจสอบใน Junk/Spam หรือ{" "}
                      <button
                        onClick={() => router.push("/signup")}
                        className="underline font-semibold text-blue-600"
                      >
                        สมัครใหม่
                      </button>
                    </p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-60 disabled:transform-none disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    กำลังเข้าสู่ระบบ...
                  </>
                ) : (
                  "เข้าสู่ระบบ"
                )}
              </button>
            </form>

            {/* Links */}
            <div className="text-center space-y-3 mt-6 text-sm">
              <p className="text-gray-600">
                ยังไม่มีบัญชี?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  สมัครสมาชิกฟรี
                </Link>
              </p>
              <p>
                <Link
                  href="/forgot-password"
                  className="text-gray-500 hover:text-gray-700 underline text-xs"
                >
                  ลืมรหัสผ่าน?
                </Link>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-gray-500 text-xs mt-8">
          © 2025 Dropway. ส่งของไว การันตีถึงปลายทาง
        </p>
      </div>
    </div>
  );
}
