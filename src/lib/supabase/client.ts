// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      get(name: string) {
        if (typeof document === "undefined") return null;
        const cookie = document.cookie
          .split("; ")
          .find((row) => row.startsWith(`${name}=`));
        return cookie?.split("=")[1] ?? null;
      },
      set(name: string, value: string, options: any) {
        if (typeof document === "undefined") return;
        document.cookie = `${name}=${value}; path=/; max-age=${options.maxAge || 3600}; SameSite=Lax`;
      },
      remove(name: string) {
        if (typeof document === "undefined") return;
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      },
    },
  },
);
