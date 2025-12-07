// src/lib/supabase/client.ts  ← ต้องเป็นแบบนี้ 100%
import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      get(name: string) {
        if (typeof document === "undefined") return null;
        const value = document.cookie
          .split("; ")
          .find((row) => row.startsWith(`${name}=`))
          ?.split("=")[1];
        return value ?? null;
      },
      set(name: string, value: string, options: any) {
        if (typeof document === "undefined") return;
        document.cookie = `${name}=${value}; path=/; max-age=${options.maxAge || 3600}; SameSite=Lax; Secure`;
      },
      remove(name: string) {
        if (typeof document === "undefined") return;
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      },
    },
  },
);
