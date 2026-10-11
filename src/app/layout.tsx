import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DropWay",
  description: "คลังบ้านและการนำทาง",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0d9488",
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
        <main className="page-content">{children}</main>
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={10}
          containerStyle={{
            top: 12,
            right: 12,
          }}
          toastOptions={{
            duration: 1000,
            style: {
              background: "#0f172a",
              color: "#fff",
              fontSize: "14px",
              padding: "12px 14px",
              borderRadius: "10px",
              maxWidth: "92vw",
              boxShadow: "0 4px 10px rgba(15, 23, 42, 0.18)",
            },
            success: {
              style: {
                background: "#0f766e",
              },
            },
            error: {
              style: {
                background: "#b91c1c",
              },
            },
            loading: {
              style: {
                background: "#0d9488",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
