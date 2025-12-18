// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar"; // ปรับ path ตามโครงสร้างของคุณ
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DropWay",
  description: "คลังบ้านและการนำทาง",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className={inter.className}>
        <Navbar />
        {children}
        <Toaster
          position="top-right" // แสดง Toast ที่มุมขวาบน
          reverseOrder={false}
          gutter={12}
          containerStyle={{
            top: 20, // เว้นจากขอบบน
            right: 20, // เว้นจากขอบขวา
          }}
          toastOptions={{
            duration: 1000,
            style: {
              background: "#363636",
              color: "#fff",
              fontSize: "14px",
              padding: "14px 18px",
              borderRadius: "12px",
              maxWidth: "400px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            },

            // Success - ไม่มี icon
            success: {
              style: {
                background: "#10b981", // เขียว emerald
              },
            },

            // Error - ไม่มี icon
            error: {
              style: {
                background: "#ef4444", // แดง
              },
            },

            // Loading (ถ้าใช้ toast.loading)
            loading: {
              style: {
                background: "#6366f1", // ม่วง indigo
              },
            },
          }}
        />
      </body>
    </html>
  );
}
