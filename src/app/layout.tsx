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
  viewportFit: "cover",
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
            // Thai copy needs to stay on screen long enough to be read.
            duration: 4000,
            style: {
              background: "#0f172a",
              color: "#fff",
              fontSize: "15px",
              lineHeight: 1.5,
              padding: "12px 16px",
              borderRadius: "12px",
              maxWidth: "92vw",
              boxShadow: "0 4px 10px rgba(15, 23, 42, 0.18)",
            },
            success: {
              duration: 3500,
              style: {
                background: "#0f766e",
              },
            },
            error: {
              duration: 6000,
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
