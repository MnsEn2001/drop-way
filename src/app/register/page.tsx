"use client";

import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast"; // ⭐ เพิ่ม import

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const register = async () => {
    if (!email || !password || !confirmPassword) {
      toast.error("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    if (password.length < 6) {
      toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/houses`,
      },
    });

    setLoading(false);

    if (error) {
      toast.error("สมัครไม่สำเร็จ: " + error.message);
    } else {
      toast.success("สมัครสำเร็จ! กรุณาเช็กอีเมลเพื่อยืนยันบัญชี");
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          สมัครสมาชิก
        </h1>
        <p className="text-center text-gray-600 mb-8">
          สร้างบัญชีเพื่อเริ่มใช้งาน
        </p>

        <div className="space-y-5">
          <input
            type="email"
            placeholder="อีเมลของคุณ"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            className="w-full px-5 py-3.5 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            disabled={loading}
          />
          <input
            type="password"
            placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-5 py-3.5 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            disabled={loading}
          />
          <input
            type="password"
            placeholder="ยืนยันรหัสผ่าน"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-5 py-3.5 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            disabled={loading}
          />
          <button
            onClick={register}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
          </button>
        </div>

        <p className="text-center mt-8 text-gray-600">
          มีบัญชีแล้ว?{" "}
          <Link
            href="/login"
            className="text-purple-600 font-semibold hover:underline"
          >
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </div>
  );
}
