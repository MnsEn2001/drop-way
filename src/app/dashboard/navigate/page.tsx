// src/app/dashboard/routes/navigate/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Navigation,
  RefreshCw,
  MapPin,
  Loader2,
  X,
  Copy,
  Search,
  Flag,
  AlertTriangle,
  CheckCircle,
  MapIcon,
  Edit3,
} from "lucide-react";

interface House {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  lat: number | null;
  lng: number | null;
  note: string | null;
  report_note?: string | null;
  reported_at?: string | null;
  order_index: number;
}

const DEFAULT_POSITION = { lat: 16.8833, lng: 99.125 };

const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatDateTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${d.getFullYear() + 543} ${d
    .toTimeString()
    .slice(0, 5)} น.`;
};

export default function NavigatePage() {
  const [houses, setHouses] = useState<House[]>([]);
  const [currentPosition, setCurrentPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [startPosition, setStartPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [showStartModal, setShowStartModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentHouse, setCurrentHouse] = useState<House | null>(null);
  const [reportNote, setReportNote] = useState("");

  // ตั้งจุดเริ่มต้น
  const [startInput, setStartInput] = useState("");
  const [detectedStartLat, setDetectedStartLat] = useState<number | null>(null);
  const [detectedStartLng, setDetectedStartLng] = useState<number | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const shouldResort = useRef(true);
  const watchId = useRef<number | null>(null);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("navigate_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "today_houses" },
        () => loadData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "houses" },
        () => loadData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("today_houses")
      .select("*")
      .eq("user_id", user.id);

    const cleaned = (data || []).map((h: any) => ({
      id: h.id,
      full_name: h.full_name || "",
      phone: h.phone || "",
      address: h.address || "",
      lat: h.lat ? Number(h.lat) : null,
      lng: h.lng ? Number(h.lng) : null,
      note: h.note ?? null,
      report_note: h.report_note ?? null,
      reported_at: h.reported_at ?? null,
      order_index: Number(h.order_index) || 9999,
    }));

    setHouses(cleaned);
    shouldResort.current = true;
  }, []);

  // 2. แก้ loadStartPosition ให้ดึงจากฐานข้อมูลก่อนเสมอ (สำคัญมาก!)
  const loadStartPosition = async () => {
    try {
      const { data, error } = await supabase.rpc("get_start_position");

      if (error) throw error;

      if (data && data[0]) {
        const pos = { lat: data[0].lat, lng: data[0].lng };
        setStartPosition(pos);
        localStorage.setItem("todayStartPosition", JSON.stringify(pos)); // อัปเดต backup
        return;
      }

      // ถ้าไม่มีในฐานข้อมูล ให้ลองดึงจาก localStorage (กรณีเก่า)
      const saved = localStorage.getItem("todayStartPosition");
      if (saved) {
        const pos = JSON.parse(saved);
        setStartPosition(pos);
      }
    } catch (err) {
      console.warn("ไม่สามารถโหลดจุดเริ่มต้นได้:", err);
      // ไม่ต้องทำอะไร แค่เงียบไว้
    }
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      await loadData();
      await loadStartPosition();

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (p) =>
            mounted &&
            setCurrentPosition({
              lat: p.coords.latitude,
              lng: p.coords.longitude,
            }),
          () => mounted && setCurrentPosition(DEFAULT_POSITION),
          { enableHighAccuracy: true },
        );

        watchId.current = navigator.geolocation.watchPosition(
          (p) => {
            setCurrentPosition({
              lat: p.coords.latitude,
              lng: p.coords.longitude,
            });
            shouldResort.current = true;
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 5000 },
        );
      }
      setLoading(false);
    };
    init();

    return () => {
      mounted = false;
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [loadData]);

  // 1. เพิ่ม useEffect นี้ ไว้ด้านบนสุดของ component (หลัง state ทั้งหมด)
  useEffect(() => {
    if (showStartModal) {
      loadStartPosition(); // ดึงจุดล่าสุดจากฐานข้อมูลทุกครั้งที่เปิด modal
    }
  }, [showStartModal]);

  // เรียงลำดับ
  const sortedHouses = useMemo(() => {
    if (houses.length === 0) return [];
    const origin = startPosition || currentPosition || DEFAULT_POSITION;
    const withCoord = houses.filter((h) => h.lat && h.lng);
    const noCoord = houses.filter((h) => !h.lat || !h.lng);

    const sorted = withCoord
      .map((h) => ({
        ...h,
        dist: haversineDistance(origin.lat, origin.lng, h.lat!, h.lng!),
      }))
      .sort((a, b) => a.dist - b.dist);

    return [...sorted, ...noCoord];
  }, [houses, currentPosition, startPosition]);

  useEffect(() => {
    if (!shouldResort.current) return;
    shouldResort.current = false;
    sortedHouses.forEach(async (h, i) => {
      await supabase
        .from("today_houses")
        .update({ order_index: i + 1 })
        .eq("id", h.id);
    });
  }, [sortedHouses]);

  const displayed = useMemo(() => {
    if (!searchQuery) return sortedHouses;
    const q = searchQuery.toLowerCase();
    return sortedHouses.filter(
      (h) =>
        h.full_name.toLowerCase().includes(q) ||
        h.phone.includes(q) ||
        h.address.toLowerCase().includes(q) ||
        h.report_note?.toLowerCase().includes(q),
    );
  }, [sortedHouses, searchQuery]);

  const addToast = (msg: string, type: "success" | "error" = "success") => {
    const el = document.createElement("div");
    el.className = `fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-2xl text-white font-bold animate-in slide-in-from-top ${
      type === "success" ? "bg-green-600" : "bg-red-600"
    }`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  };

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    addToast("คัดลอกเบอร์แล้ว");
  };

  const openMaps = (lat: number, lng: number) => {
    const o = startPosition || currentPosition || DEFAULT_POSITION;
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${o.lat},${o.lng}&destination=${lat},${lng}&travelmode=driving`,
      "_blank",
    );
  };

  const markDelivered = async (id: string) => {
    if (!confirm("ยืนยันว่าส่งแล้ว?")) return;
    await supabase.from("today_houses").delete().eq("id", id);
    addToast("ส่งแล้ว ลบออกจากรายการ");
    loadData();
  };

  const saveEdit = async () => {
    if (!currentHouse) return;
    const updates = {
      full_name: currentHouse.full_name.trim(),
      phone: currentHouse.phone.trim(),
      address: currentHouse.address.trim(),
      lat: currentHouse.lat,
      lng: currentHouse.lng,
      note: currentHouse.note?.trim() || null,
    };
    await Promise.all([
      supabase.from("today_houses").update(updates).eq("id", currentHouse.id),
      supabase
        .from("houses")
        .upsert({ id: currentHouse.id, ...updates }, { onConflict: "id" }),
    ]);
    addToast("แก้ไขสำเร็จ (ทั้งคลังและวันนี้)");
    setShowEditModal(false);
    loadData();
  };

  const reportIssue = async () => {
    if (!currentHouse || !reportNote.trim())
      return addToast("กรุณาใส่ข้อความรายงาน", "error");
    await supabase
      .from("today_houses")
      .update({
        report_note: reportNote.trim(),
        reported_at: new Date().toISOString(),
      })
      .eq("id", currentHouse.id);
    addToast("บันทึกการรายงานแล้ว");
    setShowReportModal(false);
    setReportNote("");
    loadData();
  };

  const forceRefreshLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCurrentPosition({ lat: p.coords.latitude, lng: p.coords.longitude });
        addToast("รีเฟรช GPS สำเร็จ");
        shouldResort.current = true;
      },
      () => addToast("ไม่สามารถดึง GPS ได้", "error"),
      { enableHighAccuracy: true },
    );
  };

  const openFullRoute = () => {
    const origin = startPosition || currentPosition || DEFAULT_POSITION;
    const valid = displayed.filter((h) => h.lat && h.lng).slice(0, 20);
    if (valid.length === 0) return addToast("ไม่มีพิกัด", "error");
    const points = [
      origin,
      ...valid.map((h) => ({ lat: h.lat!, lng: h.lng! })),
    ];
    const url = `https://www.google.com/maps/dir/${points.map((p) => `${p.lat},${p.lng}`).join("/")}`;
    window.open(url, "_blank");
    addToast(`เปิดเส้นทาง ${valid.length} จุด`);
  };

  const handleSetStartPosition = async () => {
    let finalLat: number | null = detectedStartLat;
    let finalLng: number | null = detectedStartLng;

    // ถ้ายังไม่ได้กรอกหรือตรวจจับ → ใช้ตำแหน่งปัจจุบัน (GPS) อัตโนมัติ
    if (!finalLat || !finalLng) {
      if (!currentPosition) {
        return addToast("ไม่พบตำแหน่งปัจจุบัน กรุณาเปิด GPS", "error");
      }
      finalLat = currentPosition.lat;
      finalLng = currentPosition.lng;
      addToast("ใช้ตำแหน่งปัจจุบันเป็นจุดเริ่มต้น", "success");
    }

    try {
      const { error } = await supabase.rpc("save_start_position", {
        p_lat: finalLat,
        p_lng: finalLng,
      });

      if (error) throw error;

      const newPos = { lat: finalLat, lng: finalLng };
      setStartPosition(newPos);
      localStorage.setItem("todayStartPosition", JSON.stringify(newPos));
      shouldResort.current = true;

      addToast(
        finalLat === currentPosition?.lat
          ? "ใช้ตำแหน่งปัจจุบันเป็นจุดเริ่มต้นแล้ว!"
          : "ตั้งจุดเริ่มต้นสำเร็จ!",
        "success",
      );
      setShowStartModal(false);
    } catch (err: any) {
      addToast("เซฟไม่สำเร็จ: " + err.message, "error");
    }
  };

  const handleManualInput = () => {
    const parts = startInput.split(",").map((p) => parseFloat(p.trim()));
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
      addToast("รูปแบบพิกัดไม่ถูกต้อง", "error");
      return;
    }
    setDetectedStartLat(parts[0]);
    setDetectedStartLng(parts[1]);
    addToast("ตรวจจับพิกัดสำเร็จ");
  };

  const detectCurrentLocation = () => {
    if (!navigator.geolocation)
      return addToast("เบราว์เซอร์ไม่รองรับ", "error");
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDetectedStartLat(lat);
        setDetectedStartLng(lng);
        setStartInput(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        addToast("ตรวจจับพิกัดสำเร็จ!", "success");
        setIsDetecting(false);
      },
      () => {
        addToast("ไม่สามารถตรวจจับได้", "error");
        setIsDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8 text-gray-800">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b z-40 shadow">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">
                นำทางวันนี้ ({displayed.length})
              </h1>

              {/* ปุ่มสำหรับคอมพิวเตอร์ (ซ่อนบนมือถือ) */}
              <div className="hidden lg:flex gap-3">
                <button
                  onClick={() => setShowStartModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg"
                >
                  <Flag className="w-5 h-5" />
                  {startPosition ? "แก้จุดเริ่ม" : "ตั้งจุดเริ่ม"}
                </button>
                <button
                  onClick={forceRefreshLocation}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg font-bold"
                >
                  <RefreshCw className="w-5 h-5" />
                  รีเฟรช
                </button>
                <button
                  onClick={openFullRoute}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-bold"
                >
                  <MapIcon className="w-5 h-5" />
                  เส้นทางทั้งหมด
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="ค้นหา ชื่อ เบอร์ ที่อยู่ รายงาน..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border rounded-xl focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* รายการบ้าน */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {displayed.length === 0 ? (
            <div className="text-center py-20 text-gray-500 text-lg">
              ยังไม่มีงานวันนี้
            </div>
          ) : (
            displayed.map((house, idx) => {
              const dist =
                house.lat && house.lng && (startPosition || currentPosition)
                  ? haversineDistance(
                      (startPosition || currentPosition)!.lat,
                      (startPosition || currentPosition)!.lng,
                      house.lat,
                      house.lng,
                    ).toFixed(1)
                  : null;

              return (
                <div
                  key={house.id}
                  className="bg-white rounded-2xl shadow hover:shadow-xl border mb-4 overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-2xl font-bold text-indigo-600">
                        #{idx + 1}
                      </span>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setCurrentHouse(house);
                            setShowEditModal(true);
                          }}
                        >
                          <Edit3 className="w-5 h-5 text-blue-600" />
                        </button>
                        <button
                          onClick={() => {
                            setCurrentHouse(house);
                            setReportNote(house.report_note || "");
                            setShowReportModal(true);
                          }}
                        >
                          <AlertTriangle className="w-5 h-5 text-orange-600" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold">{house.full_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-600">
                        {house.phone}
                      </span>
                      <button onClick={() => copyPhone(house.phone)}>
                        <Copy className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>

                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                      {house.address}
                    </p>
                    {house.note && (
                      <p className="text-xs text-amber-700 mt-2 italic">
                        หมายเหตุ: {house.note}
                      </p>
                    )}

                    {house.report_note && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-medium text-red-700">
                          รายงาน: {house.report_note}
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          {formatDateTime(house.reported_at!)}
                        </p>
                      </div>
                    )}

                    {dist && (
                      <p className="text-xs text-gray-500 mt-3">
                        ระยะทาง ~{" "}
                        <span className="font-bold text-blue-600">
                          {dist} กม.
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="px-5 pb-5 flex gap-3">
                    {house.lat && house.lng ? (
                      <button
                        onClick={() => openMaps(house.lat!, house.lng!)}
                        className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                      >
                        <Navigation className="w-5 h-5" /> นำทาง
                      </button>
                    ) : (
                      <div className="flex-1 py-3 text-center bg-gray-100 rounded-xl text-gray-500">
                        ไม่มีพิกัด
                      </div>
                    )}
                    <button
                      onClick={() => markDelivered(house.id)}
                      className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl"
                    >
                      <CheckCircle className="w-5 h-5 inline mr-1" /> ส่งแล้ว
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Bar สำหรับมือถือเท่านั้น */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg lg:hidden z-50">
          <div className="flex justify-around py-3">
            <button
              onClick={() => setShowStartModal(true)}
              className="flex flex-col items-center gap-1"
            >
              <Flag className="w-7 h-7 text-purple-600" />
              <span className="text-xs">จุดเริ่ม</span>
            </button>
            <button
              onClick={forceRefreshLocation}
              className="flex flex-col items-center gap-1"
            >
              <RefreshCw className="w-8 h-8 text-yellow-600" />
              <span className="text-xs">รีเฟรช</span>
            </button>
            <button
              onClick={openFullRoute}
              className="flex flex-col items-center gap-1"
            >
              <MapIcon className="w-8 h-8 text-red-600" />
              <span className="text-xs">เส้นทางทั้งหมด</span>
            </button>
          </div>
        </div>

        {/* Modal ทั้งหมด (เหมือนเดิม) */}
        {/* ตั้งจุดเริ่มต้น */}
        {showStartModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-purple-600">
                  ตั้งจุดเริ่มต้น
                </h2>
                <button onClick={() => setShowStartModal(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>

              <button
                onClick={detectCurrentLocation}
                disabled={isDetecting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-60 transition mb-4"
              >
                {isDetecting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <MapPin className="w-5 h-5" />
                )}
                {isDetecting ? "กำลังตรวจจับ..." : "ตรวจจับตำแหน่งปัจจุบัน"}
              </button>

              <input
                type="text"
                placeholder="พิกัด (lat,lng) เช่น 16.883300,99.125000"
                value={startInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setStartInput(value);
                  const parts = value.split(",").map((p) => p.trim());
                  if (parts.length === 2) {
                    const lat = parseFloat(parts[0]);
                    const lng = parseFloat(parts[1]);
                    if (!isNaN(lat) && !isNaN(lng)) {
                      setDetectedStartLat(lat);
                      setDetectedStartLng(lng);
                    } else {
                      setDetectedStartLat(null);
                      setDetectedStartLng(null);
                    }
                  } else {
                    setDetectedStartLat(null);
                    setDetectedStartLng(null);
                  }
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:border-blue-500 focus:outline-none mb-3 font-mono text-center"
              />

              {detectedStartLat && detectedStartLng && (
                <div className="text-center mb-5">
                  <button
                    onClick={() =>
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${detectedStartLat},${detectedStartLng}`,
                        "_blank",
                      )
                    }
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                  >
                    ตรวจสอบบน Google Maps
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowStartModal(false)}
                  className="flex-1 py-3 bg-gray-200 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSetStartPosition}
                  disabled={!detectedStartLat}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  ตั้งค่า
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal: แก้ไขบ้าน */}
        {showEditModal && currentHouse && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold">แก้ไขบ้าน</h2>
                <button onClick={() => setShowEditModal(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>

              <input
                type="text"
                placeholder="ชื่อ-นามสกุล"
                value={currentHouse.full_name}
                onChange={(e) =>
                  setCurrentHouse({
                    ...currentHouse,
                    full_name: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border rounded-xl mb-3"
              />
              <input
                type="text"
                placeholder="เบอร์โทร"
                value={currentHouse.phone}
                onChange={(e) =>
                  setCurrentHouse({ ...currentHouse, phone: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-xl mb-3"
              />
              <textarea
                placeholder="ที่อยู่"
                value={currentHouse.address}
                onChange={(e) =>
                  setCurrentHouse({ ...currentHouse, address: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-3 border rounded-xl mb-3 resize-none"
              />
              <textarea
                placeholder="หมายเหตุ"
                value={currentHouse.note || ""}
                onChange={(e) =>
                  setCurrentHouse({ ...currentHouse, note: e.target.value })
                }
                rows={2}
                className="w-full px-4 py-3 border rounded-xl mb-3 resize-none"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 bg-gray-200 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={saveEdit}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: รายงานปัญหา */}
        {showReportModal && currentHouse && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-red-600">รายงานปัญหา</h2>
                <button onClick={() => setShowReportModal(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>

              <p className="font-medium mb-4">
                {currentHouse.full_name} — {currentHouse.phone}
              </p>

              <textarea
                placeholder="เช่น โทรไม่ติด, ไม่อยู่บ้าน, ปฏิเสธรับ..."
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 border rounded-xl mb-4 resize-none"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 py-3 bg-gray-200 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={reportIssue}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
