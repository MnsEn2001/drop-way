// src/app/(auth)/signup/page.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client"; // แก้ตรงนี้แค่บรรทัดเดียว!
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const startResendTimer = () => {
    setResendTimer(60);
    setCanResend(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resendConfirmation = async () => {
    setError("");
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    if (resendError) {
      setError(resendError.message);
    } else {
      startResendTimer();
      alert("ส่งลิ้งยืนยันใหม่เรียบร้อย! กรุณาตรวจสอบใน Gmail ของคุณ");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    if (password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setLoading(true);
    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/dashboard`,
      },
    });

    setLoading(false);

    if (signupError) {
      setError(signupError.message);
    } else {
      setShowSuccess(true);
      startResendTimer();
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-linear-to-r from-blue-50 to-indigo-100 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-10 w-full max-w-md text-gray-800 text-center">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
              สมัครสมาชิกสำเร็จ!
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              กรุณาไปกดลิ้งยืนยันที่ถูกส่งไปยัง Gmail ของคุณ ({email})
              แล้วเรียบร้อย
            </p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 text-sm">
              {canResend ? (
                <button
                  onClick={resendConfirmation}
                  className="text-green-600 font-semibold hover:underline flex items-center justify-center gap-2 mx-auto"
                >
                  ส่งลิ้งยืนยันใหม่
                </button>
              ) : (
                <span>
                  ส่งลิ้งยืนยันใหม่ได้ใน{" "}
                  <span className="font-bold text-green-600">
                    {resendTimer} วินาที
                  </span>
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-blue-600 text-white py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg hover:bg-blue-700 transition"
          >
            ไปที่หน้าเข้าสู่ระบบ
          </button>
          {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-r from-blue-50 to-indigo-100 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-10 w-full max-w-md text-gray-800">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
            สมัครสมาชิก Dropway
          </h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            สร้างบัญชีเพื่อเริ่มใช้งาน
          </p>
        </div>
        <form onSubmit={handleSignup} className="space-y-4 sm:space-y-6">
          <input
            type="email"
            placeholder="อีเมล"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            required
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 sm:px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="ยืนยันรหัสผ่าน"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 sm:px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
          </button>
        </form>
        <p className="text-center mt-6 text-gray-600 text-sm sm:text-base">
          มีบัญชีแล้ว?{" "}
          <Link
            href="/login"
            className="text-blue-600 font-semibold hover:underline"
          >
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </div>
  );
}
