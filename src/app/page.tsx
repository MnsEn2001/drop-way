// src/app/page.tsx
import Link from "next/link";
import { Package, ArrowRight, Upload, Route, MapPin } from "lucide-react";

export default function HomePage() {
  return (
    <div className="pt-16 min-h-screen">
      {/* Hero Section */}
      <section className="bg-linear-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
          <div className="text-center">
            <div className="flex justify-center mb-6 sm:mb-8">
              <Package className="h-16 w-16 sm:h-20 sm:w-20" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 sm:mb-6">
              Dropway
            </h1>
            <p className="text-lg sm:text-xl mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed">
              ระบบจัดเส้นทางส่งของอัจฉริยะสำหรับไรเดอร์และธุรกิจขนส่ง
              <br />
              อัพโหลดรายชื่อบ้าน → คำนวณเส้นทางสั้นที่สุด → นำทางด้วย Google
              Maps
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition text-sm sm:text-base"
              >
                เข้าสู่ระบบ
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 border-2 border-white font-semibold rounded-lg hover:bg-white hover:text-blue-600 transition text-sm sm:text-base"
              >
                สมัครสมาชิกฟรี
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12 text-gray-900">
            ทำอะไรได้บ้างใน Dropway
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
            <div className="text-center px-4">
              <div className="flex justify-center mb-3 sm:mb-4">
                <div className="p-3 sm:p-4 bg-blue-100 rounded-full">
                  <Upload className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">
                อัพโหลดรายชื่อบ้าน
              </h3>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                รองรับไฟล์ CSV / Excel นำเข้าบ้านหลายร้อยหลังภายในไม่กี่วินาที
              </p>
            </div>
            <div className="text-center px-4">
              <div className="flex justify-center mb-3 sm:mb-4">
                <div className="p-3 sm:p-4 bg-green-100 rounded-full">
                  <Route className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">
                คำนวณเส้นทางเร็วที่สุด
              </h3>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                อัลกอริทึมจัดลำดับบ้านอัตโนมัติ ช่วยประหยัดเวลาและน้ำมัน
              </p>
            </div>
            <div className="text-center px-4">
              <div className="flex justify-center mb-3 sm:mb-4">
                <div className="p-3 sm:p-4 bg-purple-100 rounded-full">
                  <MapPin className="h-8 w-8 sm:h-10 sm:w-10 text-purple-600" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">
                นำทางทีละบ้าน
              </h3>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                กดปุ่มเดียวเปิด Google Maps นำทางไปยังบ้านถัดไปทันที
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-base sm:text-lg font-semibold mb-2">Dropway</p>
          <p className="text-gray-400 text-sm sm:text-base">
            © 2025 Dropway. สร้างขึ้นเพื่อไรเดอร์ไทย
          </p>
        </div>
      </footer>
    </div>
  );
}
