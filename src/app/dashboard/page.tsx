"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client"; // แก้ตรงนี้แค่บรรทัดเดียว!
import {
  Home,
  MapPin,
  Upload,
  AlertCircle,
  Clock,
  TrendingUp,
} from "lucide-react";

export default function DashboardPage() {
  const [totalHouses, setTotalHouses] = useState(0);
  const [todayHouses, setTodayHouses] = useState(0);
  const [pendingHouses, setPendingHouses] = useState(0);
  const [userName, setUserName] = useState("เพื่อน");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [recentActivities, setRecentActivities] = useState<
    { action: string; time: string }[]
  >([]);
  const [coordPercent, setCoordPercent] = useState(0);

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return "เมื่อกี้";
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    return `${diffDays} วันที่แล้ว`;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserName(user?.email?.split("@")[0] || "เพื่อน");

      const { count: totalCount } = await supabase
        .from("houses")
        .select("*", { count: "exact", head: true });
      setTotalHouses(totalCount || 0);

      const { data: todayData } = await supabase.rpc(
        "refresh_and_merge_today_houses",
      );
      setTodayHouses(todayData?.length || 0);

      const { count: pendingCount } = await supabase
        .from("pending_houses")
        .select("*", { count: "exact", head: true });
      setPendingHouses(pendingCount || 0);

      const { count: withCoordsCount } = await supabase
        .from("houses")
        .select("*", { count: "exact", head: true })
        .not("lat", "is", null)
        .not("lng", "is", null);

      const safeTotal = totalCount || 0;
      const safeWithCoords = withCoordsCount || 0;
      setCoordPercent(
        safeTotal > 0 ? Math.round((safeWithCoords / safeTotal) * 100) : 0,
      );

      const { data: activities } = await (supabase as any)
        .from("audits")
        .select("action, created_at")
        .limit(5)
        .order("created_at", { ascending: false });

      setRecentActivities(
        activities?.map((a: any) => ({
          action: a.action || "เพิ่มบ้านใหม่",
          time: formatTimeAgo(a.created_at),
        })) || [],
      );
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชเบราว์เซอร์อีกครั้ง");
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getTip = () => {
    if (todayHouses > 15)
      return "งานวันนี้เยอะ! ลองเรียงเส้นทางก่อนออกเดินทางนะ";
    if (pendingHouses > 5)
      return `มีงานค้าง ${pendingHouses} รายการ ลองดึงมาใช้ดู`;
    if (coordPercent < 70)
      return `มีบ้าน ${100 - coordPercent}% ที่ยังไม่มีพิกัด ลองเพิ่มดู`;
    return null;
  };

  const tip = getTip();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <div className="text-base sm:text-lg text-gray-500 flex items-center gap-2">
          <Clock className="w-5 h-5 animate-spin" />
          กำลังโหลดข้อมูล...
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header with Welcome + Last Updated */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-15">
        <div className="flex flex-col">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 flex items-center gap-2">
            <Home className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
            ยินดีต้อนรับกลับ
          </h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            วันนี้มีงาน {todayHouses} รายการ
          </p>
          <p className="text-xs text-gray-400 mt-1">
            อัพเดทล่าสุด: {lastUpdated.toLocaleTimeString("th-TH")}
          </p>
        </div>
        {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
      </div>

      {/* Personalized Tip Banner */}
      {tip && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
          <p className="text-sm text-blue-800">{tip}</p>
        </div>
      )}

      {/* Quick Actions - รองรับมือถือ */}
      <div className="mb-6 sm:mb-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <a
          href="/dashboard/houses"
          className="flex flex-col items-center p-4 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-center"
        >
          <MapPin className="w-8 h-8 text-blue-600 mb-2" />
          <span className="text-sm font-medium text-gray-700">
            คลังบ้าน ({totalHouses})
          </span>
        </a>
        <a
          href="/dashboard/routes/navigate"
          className="flex flex-col items-center p-4 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-center"
        >
          <MapPin className="w-8 h-8 text-green-600 mb-2" />
          <span className="text-sm font-medium text-gray-700">
            เส้นทางวันนี้ ({todayHouses})
          </span>
        </a>
        <a
          href="/dashboard/routes/upload"
          className="flex flex-col items-center p-4 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-center"
        >
          <Upload className="w-8 h-8 text-purple-600 mb-2" />
          <span className="text-sm font-medium text-gray-700">อัพโหลด CSV</span>
        </a>
      </div>

      {/* Expanded Summary Cards - 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg text-center">
          <MapPin className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-4xl sm:text-5xl font-bold text-blue-600 mb-2">
            {totalHouses}
          </h3>
          <p className="text-gray-600 text-sm sm:text-base">
            บ้านทั้งหมดในคลัง
          </p>
        </div>
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg text-center">
          <MapPin className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-4xl sm:text-5xl font-bold text-green-600 mb-2">
            {todayHouses}
          </h3>
          <p className="text-gray-600 text-sm sm:text-base">งานวันนี้</p>
        </div>
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg text-center">
          <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-orange-600 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-4xl sm:text-5xl font-bold text-orange-600 mb-2">
            {pendingHouses}
          </h3>
          <p className="text-gray-600 text-sm sm:text-base">งานค้าง</p>
        </div>
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg text-center">
          <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 text-purple-600 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-4xl sm:text-5xl font-bold text-purple-600 mb-2">
            {coordPercent}%
          </h3>
          <p className="text-gray-600 text-sm sm:text-base">บ้านมีพิกัด</p>
        </div>
      </div>

      {/* Recent Activities Section */}
      {recentActivities.length > 0 && (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            กิจกรรมล่าสุด
          </h3>
          <ul className="space-y-3">
            {recentActivities.slice(0, 5).map((activity, index) => (
              <li
                key={index}
                className="flex justify-between items-center text-sm text-gray-600 border-b border-gray-100 pb-2 last:border-b-0"
              >
                <span>{activity.action}</span>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
