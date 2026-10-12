"use client";

import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Loader2, Warehouse } from "lucide-react";
import { EMAIL_PATTERN, toThaiAuthError } from "@/lib/authMessages";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();

  const register = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (loading) return;

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password || !confirmPassword) {
      setFormError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setFormError("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }
    if (password.length < 6) {
      setFormError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setFormError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: `${location.origin}/houses`,
        },
      });

      if (error) {
        const message = toThaiAuthError(error.message);
        setFormError(message);
        toast.error(message);
        return;
      }

      toast.success("สมัครสำเร็จ! กรุณาเช็กอีเมลเพื่อยืนยันบัญชี");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-background-subtle px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
            <Warehouse className="h-6 w-6 text-teal-700" aria-hidden="true" />
          </span>
          <span className="text-xl font-bold tracking-tight text-teal-700">
            DropWay
          </span>
        </div>

        <div className="card p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900">สมัครสมาชิก</h1>
          <p className="mt-1 text-sm text-gray-600">
            สร้างบัญชีเพื่อเริ่มจัดการคลังบ้านและการนำทาง
          </p>

          <form onSubmit={register} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="register-email" className="label">
                อีเมล
              </label>
              <input
                id="register-email"
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="register-password" className="label">
                รหัสผ่าน
              </label>
              <input
                id="register-password"
                type="password"
                name="new-password"
                autoComplete="new-password"
                placeholder="อย่างน้อย 6 ตัวอักษร"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                disabled={loading}
              />
              <span className="field-hint">ใช้อย่างน้อย 6 ตัวอักษร</span>
            </div>

            <div>
              <label htmlFor="register-confirm-password" className="label">
                ยืนยันรหัสผ่าน
              </label>
              <input
                id="register-confirm-password"
                type="password"
                name="confirm-password"
                autoComplete="new-password"
                placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                disabled={loading}
              />
            </div>

            {formError && (
              <p role="alert" className="field-error">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-block py-3 text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  กำลังสมัคร...
                </>
              ) : (
                "สมัครสมาชิก"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            มีบัญชีแล้ว?{" "}
            <Link
              href="/login"
              className="font-semibold text-teal-700 hover:underline"
            >
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
