"use client";

import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast"; // ⭐ เพิ่ม import นี้

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const login = async () => {
    if (!email || !password) {
      toast.error("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast.error("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
    } else {
      toast.success("เข้าสู่ระบบสำเร็จ!");
      router.push("/houses");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          เข้าสู่ระบบ
        </h1>
        <p className="text-center text-gray-600 mb-8">ยินดีต้อนรับกลับมา!</p>

        <div className="space-y-5">
          <input
            type="email"
            placeholder="อีเมลของคุณ"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            className="w-full px-5 py-3.5 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            disabled={loading}
          />
          <input
            type="password"
            placeholder="รหัสผ่าน"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-5 py-3.5 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            disabled={loading}
          />
          <button
            onClick={login}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-lg font-semibold rounded-xl hover:from-indigo-700 hover:to-blue-700 transition shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </div>

        <p className="text-center mt-8 text-gray-600">
          ยังไม่มีบัญชี?{" "}
          <Link
            href="/register"
            className="text-indigo-600 font-semibold hover:underline"
          >
            สมัครสมาชิก
          </Link>
        </p>
      </div>
    </div>
  );
}
