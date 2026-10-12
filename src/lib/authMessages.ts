/**
 * Maps Supabase auth error messages to readable Thai copy.
 * Raw messages are safe to keep as a fallback so users still get a
 * diagnosable error instead of a silent failure.
 */
const AUTH_ERROR_MAP: ReadonlyArray<[RegExp, string]> = [
  [/invalid login credentials/i, "อีเมลหรือรหัสผ่านไม่ถูกต้อง"],
  [/email not confirmed/i, "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ"],
  [/user already registered|already registered/i, "อีเมลนี้ถูกใช้งานแล้ว"],
  [/password should be at least/i, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"],
  [/valid email|invalid email/i, "รูปแบบอีเมลไม่ถูกต้อง"],
  [/rate limit|too many requests|over_email_send_rate_limit/i, "มีคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่"],
  [/network|failed to fetch|fetch failed/i, "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่"],
];

export function toThaiAuthError(message: string | null | undefined): string {
  const raw = (message ?? "").trim();
  for (const [pattern, thai] of AUTH_ERROR_MAP) {
    if (pattern.test(raw)) return thai;
  }
  return raw ? `ทำรายการไม่สำเร็จ: ${raw}` : "ทำรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
