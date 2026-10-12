"use client";

import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Loader2, ShieldCheck, Warehouse } from "lucide-react";
import { EMAIL_PATTERN, toThaiAuthError } from "@/lib/authMessages";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();

  const login = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (loading) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setFormError("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setFormError("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }

    setFormError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        const message = toThaiAuthError(error.message);
        setFormError(message);
        toast.error(message);
        return;
      }

      toast.success("เข้าสู่ระบบสำเร็จ");
      router.push("/houses");
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
          <h1 className="text-2xl font-bold text-gray-900">เข้าสู่ระบบ</h1>
          <p className="mt-1 text-sm text-gray-600">
            จัดการคลังบ้านและเส้นทางส่งของของคุณ
          </p>

          <form onSubmit={login} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="login-email" className="label">
                อีเมล
              </label>
              <input
                id="login-email"
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
              <label htmlFor="login-password" className="label">
                รหัสผ่าน
              </label>
              <input
                id="login-password"
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="รหัสผ่านของคุณ"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                "เข้าสู่ระบบ"
              )}
            </button>
          </form>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-sm text-gray-600">
            <ShieldCheck className="h-4 w-4 text-teal-700" aria-hidden="true" />
            ยังไม่มีบัญชี?{" "}
            <Link
              href="/register"
              className="font-semibold text-teal-700 hover:underline"
            >
              สมัครสมาชิก
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
