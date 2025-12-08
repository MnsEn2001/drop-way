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
  Trash2,
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
const getOptimizedRouteOrder = async (
  start: { lat: number; lng: number },
  housesWithCoords: House[],
): Promise<House[]> => {
  if (housesWithCoords.length === 0) return [];
  const coords = [
    start,
    ...housesWithCoords.map((h) => ({ lat: h.lat!, lng: h.lng! })),
  ];
  const coordStr = coords.map((c) => `${c.lng},${c.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=false&geometries=false&source=first&destination=last&roundtrip=false&alternatives=false`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (data.code === "Ok" && data.waypoints && Array.isArray(data.waypoints)) {
      // แก้ตรงนี้ให้ TS รู้ type ชัดเจน
      const order: number[] = data.waypoints
        .slice(1) // ข้ามจุดเริ่มต้น
        .map((wp: { waypoint_index: number }) => wp.waypoint_index - 1)
        .filter((idx: number) => idx >= 0 && idx < housesWithCoords.length);
      const reordered = order
        .map((idx) => housesWithCoords[idx])
        .filter((h): h is House => h !== undefined);
      return reordered.length > 0 ? reordered : housesWithCoords;
    }
  } catch (err) {
    console.warn(
      "OSRM ล้มเหลว ใช้ระยะทางตรงแทน:",
      err instanceof Error ? err.message : err,
    );
  }
  // Fallback: เรียงตามระยะทางตรง (แบบมี type ครบ)
  return housesWithCoords
    .map((h) => ({
      ...h,
      dist: haversineDistance(start.lat, start.lng, h.lat!, h.lng!),
    }))
    .sort((a, b) => a.dist - b.dist);
};
export default function NavigatePage() {
  const [houses, setHouses] = useState<House[]>([]);
  const [optimizedHouses, setOptimizedHouses] = useState<House[]>([]);
  const [currentPosition, setCurrentPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [startPosition, setStartPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
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
  // เพิ่ม state ใหม่
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [deliverNote, setDeliverNote] = useState("");
  const [houseToDeliver, setHouseToDeliver] = useState<House | null>(null);
  const [viewMode, setViewMode] = useState<"today" | "delivered">("today");
  const [deliveredHouses, setDeliveredHouses] = useState<any[]>([]);
  // === Toast ใหม่ แบบสวย อยู่ด้านล่างกลาง (เหมือนหน้า houses) ===
  const [toasts, setToasts] = useState<
    { id: string; msg: string; type: "success" | "error" }[]
  >([]);

  const shouldResort = useRef(true);
  const watchId = useRef<number | null>(null);
  // โหลดข้อมูลส่งแล้ว
  const loadDelivered = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setDeliveredHouses([]);
        return;
      }
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("delivered_today")
        .select("*")
        .eq("user_id", user.id)
        .gte("delivered_at", `${today}T00:00:00`)
        .lte("delivered_at", `${today}T23:59:59`)
        .order("delivered_at", { ascending: false });
      if (error) {
        console.error("โหลดรายการส่งแล้วผิดพลาด:", error);
        addToast("โหลดข้อมูลส่งแล้วล้มเหลว", "error");
        return;
      }
      setDeliveredHouses(data || []);
    } catch (err) {
      console.error("Error in loadDelivered:", err);
      setDeliveredHouses([]);
    }
  }, []);
  // เรียกตอนโหลดหน้า
  useEffect(() => {
    loadDelivered();
  }, [loadDelivered]);
  // Realtime สำหรับ delivered_today
  useEffect(() => {
    const channel = supabase
      .channel("delivered_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivered_today" },
        () => loadDelivered(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDelivered]);
  const loadData = useCallback(async () => {
    try {
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
    } catch (err) {
      console.error("โหลดข้อมูลวันนี้ผิดพลาด:", err);
      addToast("โหลดข้อมูลวันนี้ล้มเหลว", "error");
    }
  }, []);
  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("navigate_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "today_houses" },
        () => loadData(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "today_houses" },
        () => loadData(),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "today_houses" },
        () => loadData(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "houses" },
        () => loadData(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);
  const loadStartPosition = async () => {
    try {
      // 1. ดึงจาก localStorage ก่อนเลย (เร็วที่สุด และไม่ต้องรอ DB)
      const saved = localStorage.getItem("todayStartPosition");
      if (saved) {
        const pos = JSON.parse(saved);
        setStartPosition(pos);
        console.log("โหลดจุดเริ่มต้นจาก localStorage:", pos);
        return; // เจอแล้ว → จบเลย ไม่ต้องไปหาที่อื่น
      }
      // 2. ถ้าไม่มีใน localStorage ค่อยดึงจากฐานข้อมูล
      const { data, error } = await supabase.rpc("get_start_position");
      if (error) throw error;
      if (data && data[0]) {
        const pos = { lat: data[0].lat, lng: data[0].lng };
        setStartPosition(pos);
        localStorage.setItem("todayStartPosition", JSON.stringify(pos)); // เก็บสำรองไว้ด้วย
        console.log("โหลดจุดเริ่มต้นจากฐานข้อมูล:", pos);
        return;
      }
      // 3. ถ้าไม่มีทั้ง 2 ที่ → ใช้ตำแหน่งปัจจุบัน (เหมือนที่คุณต้องการ)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (p) => {
            const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
            setStartPosition(pos);
            localStorage.setItem("todayStartPosition", JSON.stringify(pos));
            addToast("ใช้ตำแหน่งปัจจุบันเป็นจุดเริ่มต้น");
          },
          () => {
            setStartPosition(DEFAULT_POSITION);
            localStorage.setItem(
              "todayStartPosition",
              JSON.stringify(DEFAULT_POSITION),
            );
          },
          { enableHighAccuracy: true, timeout: 10000 },
        );
      }
    } catch (err) {
      console.warn("โหลดจุดเริ่มต้นไม่ได้ ใช้ค่าเริ่มต้น:", err);
      setStartPosition(DEFAULT_POSITION);
    }
  };
  // กรองรายการส่งแล้ว (เหมือนแท็บวันนี้ทุกประการ)
  const displayedDelivered = useMemo(() => {
    if (!searchQuery) return deliveredHouses;
    const q = searchQuery.toLowerCase();
    return deliveredHouses.filter((h: any) =>
      [h.full_name, h.phone, h.address, h.delivered_note, h.note]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(q)),
    );
  }, [deliveredHouses, searchQuery]);
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
  useEffect(() => {
    if (showStartModal) loadStartPosition();
  }, [showStartModal]);
  // ใช้ OSRM จัดลำดับจริง
  useEffect(() => {
    if (!shouldResort.current || houses.length === 0) return;
    const runOptimization = async () => {
      setOptimizing(true);
      const origin = startPosition || currentPosition || DEFAULT_POSITION;
      const withCoords = houses.filter((h) => h.lat && h.lng);
      const noCoords = houses.filter((h) => !h.lat || !h.lng);
      const optimized = await getOptimizedRouteOrder(origin, withCoords);
      const finalList = [...optimized, ...noCoords];
      setOptimizedHouses(finalList);
      shouldResort.current = false;
      setOptimizing(false);
      // อัปเดต order_index ในฐานข้อมูล
      finalList.forEach(async (h, i) => {
        await supabase
          .from("today_houses")
          .update({ order_index: i + 1 })
          .eq("id", h.id);
      });
    };
    runOptimization();
  }, [houses, currentPosition, startPosition]);
  const displayed = useMemo(() => {
    if (!searchQuery) return optimizedHouses;
    const q = searchQuery.toLowerCase();
    return optimizedHouses.filter(
      (h) =>
        h.full_name.toLowerCase().includes(q) ||
        h.phone.includes(q) ||
        h.address.toLowerCase().includes(q) ||
        h.report_note?.toLowerCase().includes(q),
    );
  }, [optimizedHouses, searchQuery]);

  const addToast = (msg: string, type: "success" | "error" = "success") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
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
  // เปลี่ยนฟังก์ชัน markDelivered
  const markDelivered = async (house: House) => {
    setHouseToDeliver(house);
    setDeliverNote(""); // รีเซ็ต
    setShowDeliverModal(true);
  };
  // ฟังก์ชันยืนยันส่งจริง
  const confirmDeliver = async () => {
    if (!houseToDeliver) return;
    const finalNote = deliverNote.trim() || "ส่งแล้ว (ไม่ระบุหมายเหตุ)";
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("ไม่พบผู้ใช้");
      // Optimistic update: ลบจาก UI ทันที
      setHouses((prev) => prev.filter((h) => h.id !== houseToDeliver.id));
      setOptimizedHouses((prev) =>
        prev.filter((h) => h.id !== houseToDeliver.id),
      );
      const deliveredItem = {
        id: crypto.randomUUID(), // หรือใช้ Date.now() ก็ได้
        user_id: user.id,
        full_name: houseToDeliver.full_name,
        phone: houseToDeliver.phone,
        address: houseToDeliver.address,
        lat: houseToDeliver.lat,
        lng: houseToDeliver.lng,
        note: houseToDeliver.note,
        delivered_note: finalNote,
        delivered_at: new Date().toISOString(),
      };
      // 1. บันทึกในฐานข้อมูล
      const { error: insertError } = await supabase
        .from("delivered_today")
        .insert(deliveredItem);
      if (insertError) {
        // Rollback optimistic update ถ้าล้มเหลว
        loadData();
        throw insertError;
      }
      // 2. ลบออกจาก today_houses
      const { error: deleteError } = await supabase
        .from("today_houses")
        .delete()
        .eq("id", houseToDeliver.id);
      if (deleteError) {
        // Rollback
        loadData();
        throw deleteError;
      }
      // เพิ่มสิ่งนี้: อัพเดต state ทันที ไม่ต้องรอ realtime!
      setDeliveredHouses((prev) => [deliveredItem, ...prev]);
      addToast(`ส่งแล้ว: ${finalNote}`, "success");
    } catch (err: any) {
      console.error("ส่งไม่สำเร็จ:", err);
      addToast("ส่งไม่สำเร็จ: " + err.message || err, "error");
      loadData(); // Reload ถ้าผิดพลาด
    } finally {
      setShowDeliverModal(false);
      setHouseToDeliver(null);
      setDeliverNote("");
    }
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

    try {
      // 1. อัปเดต today_houses (ตาม id เดิม)
      const { error: err1 } = await supabase
        .from("today_houses")
        .update(updates)
        .eq("id", currentHouse.id);

      if (err1) throw err1;

      // 2. อัปเดตหรือสร้างใน houses โดยใช้ (full_name + phone) เป็น key
      const { data: existing, error: fetchErr } = await supabase
        .from("houses")
        .select("id")
        .match({
          full_name: updates.full_name,
          phone: updates.phone,
        })
        .maybeSingle(); // สำคัญ: ใช้ maybeSingle() ถ้าไม่มีจะได้ null ไม่ error

      if (fetchErr && fetchErr.code !== "PGRST116") throw fetchErr;

      if (existing) {
        // เจอแล้ว → UPDATE
        const { error: updateErr } = await supabase
          .from("houses")
          .update(updates)
          .eq("id", existing.id);

        if (updateErr) throw updateErr;
      } else {
        // ไม่เจอ → INSERT ใหม่ (ไม่ต้องสนใจ id เดิม)
        const { error: insertErr } = await supabase
          .from("houses")
          .insert(updates); // ไม่ต้องส่ง id

        if (insertErr) throw insertErr;
      }

      addToast("แก้ไขข้อมูลสำเร็จและซิงค์กับคลังหลักแล้ว", "success");
      setShowEditModal(false);
      setCurrentHouse(null);
      loadData();
    } catch (err: any) {
      console.error("แก้ไขไม่สำเร็จ:", err);
      addToast("แก้ไขไม่สำเร็จ: " + (err.message || "ลองใหม่"), "error");
    }
  };

  const reportIssue = async () => {
    if (!currentHouse || !reportNote.trim())
      return addToast("กรุณาใส่ข้อความ", "error");
    await supabase
      .from("today_houses")
      .update({
        report_note: reportNote.trim(),
        reported_at: new Date().toISOString(),
      })
      .eq("id", currentHouse.id);
    addToast("รายงานแล้ว");
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
      () => addToast("ดึง GPS ไม่ได้", "error"),
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
    setIsDetecting(true);
    let finalLat: number;
    let finalLng: number;
    if (detectedStartLat !== null && detectedStartLng !== null) {
      finalLat = detectedStartLat;
      finalLng = detectedStartLng;
    } else {
      // ดึง GPS อัตโนมัติ
      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 15000,
            });
          },
        );
        finalLat = position.coords.latitude;
        finalLng = position.coords.longitude;
        setDetectedStartLat(finalLat);
        setDetectedStartLng(finalLng);
        setStartInput(`${finalLat.toFixed(6)}, ${finalLng.toFixed(6)}`);
      } catch (err) {
        addToast("ดึงตำแหน่งไม่สำเร็จ", "error");
        setIsDetecting(false);
        return;
      }
    }
    const newPos = { lat: finalLat, lng: finalLng };
    try {
      // 1. เซฟลงฐานข้อมูล
      const { error } = await supabase.rpc("save_start_position", {
        p_lat: finalLat,
        p_lng: finalLng,
      });
      if (error) throw error;
      // 2. เซฟลง localStorage ทันที (สำคัญมาก!)
      localStorage.setItem("todayStartPosition", JSON.stringify(newPos));
      setStartPosition(newPos);
      shouldResort.current = true;
      addToast("ตั้งจุดเริ่มต้นสำเร็จ!");
      setShowStartModal(false);
    } catch (err: any) {
      addToast("เซฟไม่สำเร็จ: " + err.message, "error");
    } finally {
      setIsDetecting(false);
    }
  };
  const detectCurrentLocation = () => {
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDetectedStartLat(lat);
        setDetectedStartLng(lng);
        setStartInput(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        addToast("ตรวจจับสำเร็จ!");
        setIsDetecting(false);
      },
      () => {
        addToast("ตรวจจับไม่ได้", "error");
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
        {/* Header + ปุ่มสลับโหมด */}
        <div className="sticky top-0 bg-white border-b z-40 shadow">
          <div className="max-w-7xl mx-auto px-4 py-4">
            {/* ชื่อหน้า + ปุ่มสลับโหมด */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold">
                  {viewMode === "today" ? "นำทางวันนี้" : "ส่งแล้ววันนี้"}
                </h1>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button
                    onClick={() => setViewMode("today")}
                    className={`px-5 py-2 rounded-lg font-bold transition-all ${
                      viewMode === "today"
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-gray-600"
                    }`}
                  >
                    วันนี้ ({displayed.length})
                  </button>
                  <button
                    onClick={() => setViewMode("delivered")}
                    className={`px-5 py-2 rounded-lg font-bold transition-all ${
                      viewMode === "delivered"
                        ? "bg-green-600 text-white shadow-md"
                        : "text-gray-600"
                    }`}
                  >
                    ส่งแล้ว ({displayedDelivered.length})
                  </button>
                </div>
              </div>
              <div className="hidden lg:flex gap-3">
                {viewMode === "today" && (
                  <>
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
                  </>
                )}
              </div>
            </div>
            {/* แถวค้นหา + ลบทั้งหมด */}
            <div className="flex items-center gap-3">
              {/* ปุ่มถังขยะ — ลบจริงทั้ง 2 แท็บ 100% */}
              {(viewMode === "today"
                ? displayed.length
                : displayedDelivered.length) > 0 && (
                <button
                  onClick={async () => {
                    const isTodayMode = viewMode === "today";
                    const count = isTodayMode
                      ? displayed.length
                      : displayedDelivered.length;
                    if (
                      !confirm(
                        `ลบ${isTodayMode ? "งานทั้งหมด" : "รายการส่งแล้วทั้งหมด"} ${count} รายการ จริงหรือ?`,
                      )
                    )
                      return;
                    try {
                      const {
                        data: { user },
                      } = await supabase.auth.getUser();
                      if (!user) {
                        addToast("ไม่พบผู้ใช้ กรุณาเข้าสู่ระบบใหม่", "error");
                        return;
                      }
                      if (isTodayMode) {
                        // ลบ today_houses
                        const { error } = await supabase
                          .from("today_houses")
                          .delete()
                          .eq("user_id", user.id);
                        if (error) throw error;
                        setHouses([]);
                        setOptimizedHouses([]);
                        addToast("ลบงานทั้งหมดเรียบร้อย!", "success");
                      } else {
                        // ลบ delivered_today เฉพาะวันนี้ของ user นี้ (วิธีที่ปลอดภัยที่สุด)
                        const today = new Date().toISOString().split("T")[0];
                        const { error } = await supabase
                          .from("delivered_today")
                          .delete()
                          .eq("user_id", user.id)
                          .gte("delivered_at", `${today}T00:00:00.000Z`)
                          .lte("delivered_at", `${today}T23:59:59.999Z`);
                        if (error) throw error;
                        setDeliveredHouses([]);
                        addToast(
                          `ลบรายการส่งแล้วทั้งหมด ${count} รายการเรียบร้อย!`,
                          "success",
                        );
                      }
                    } catch (err: any) {
                      console.error("ลบไม่สำเร็จ:", err);
                      addToast(
                        "ลบไม่สำเร็จ: " + (err.message || "กรุณาลองใหม่"),
                        "error",
                      );
                    }
                  }}
                  className="flex-shrink-0 p-3 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-md transition-all group"
                  title={
                    viewMode === "today"
                      ? "ลบงานทั้งหมดในวันนี้"
                      : "ลบรายการส่งแล้วทั้งหมด"
                  }
                >
                  <Trash2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </button>
              )}
              {/* ช่องค้นหา */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder={
                    viewMode === "today"
                      ? "ค้นหา ชื่อ เบอร์ ที่อยู่ รายงาน..."
                      : "ค้นหา ชื่อ เบอร์ ที่อยู่ หมายเหตุตอนส่ง..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 border rounded-xl focus:border-blue-500 outline-none transition font-medium"
                  id="navigate-search-input"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      document.getElementById("navigate-search-input")?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 z-10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* รายการบ้าน */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* วันนี้ */}
          {viewMode === "today" ? (
            displayed.length === 0 ? (
              <div className="text-center py-20 text-gray-500 text-lg">
                {searchQuery ? "ไม่พบรายการที่ค้นหา" : "ยังไม่มีงานวันนี้"}
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
                    className="bg-white rounded-2xl shadow hover:shadow-xl border mb-4 overflow-hidden transition-all"
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
                            className="hover:bg-gray-100 p-2 rounded-lg transition"
                          >
                            <Edit3 className="w-5 h-5 text-blue-600" />
                          </button>
                          <button
                            onClick={() => {
                              setCurrentHouse(house);
                              setReportNote(house.report_note || "");
                              setShowReportModal(true);
                            }}
                            className="hover:bg-gray-100 p-2 rounded-lg transition"
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
                          <Copy className="w-4 h-4 text-gray-500 hover:text-gray-700" />
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
                          className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition"
                        >
                          <Navigation className="w-5 h-5" /> นำทาง
                        </button>
                      ) : (
                        <div className="flex-1 py-3 text-center bg-gray-100 rounded-xl text-gray-500">
                          ไม่มีพิกัด
                        </div>
                      )}
                      <button
                        onClick={() => markDelivered(house)}
                        className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg transition"
                      >
                        <CheckCircle className="w-5 h-5 inline mr-1" /> ส่งแล้ว
                      </button>
                    </div>
                  </div>
                );
              })
            )
          ) : /* ส่งแล้ววันนี้ */
          displayedDelivered.length === 0 ? (
            <div className="text-center py-20 text-gray-500 text-lg">
              {searchQuery
                ? "ไม่พบรายการที่ค้นหา"
                : "ยังไม่มีรายการที่ส่งแล้ววันนี้"}
            </div>
          ) : (
            <div className="space-y-4">
              {displayedDelivered.map((h, idx) => (
                <div
                  key={h.id}
                  className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-5 shadow-md hover:shadow-lg transition-all"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-2xl font-bold text-green-700">
                        #{displayedDelivered.length - idx}
                      </span>
                      <span className="text-sm text-green-600 ml-3">
                        {new Date(h.delivered_at).toLocaleTimeString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                      ส่งแล้ว
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {h.full_name}
                  </h3>
                  <p className="text-sm text-gray-600">{h.phone}</p>
                  <p className="text-xs text-gray-500 mt-1">{h.address}</p>
                  {h.delivered_note && (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-green-300">
                      <p className="text-sm font-medium text-green-700">
                        หมายเหตุตอนส่ง:{" "}
                        <span className="font-bold">{h.delivered_note}</span>
                      </p>
                    </div>
                  )}
                  {h.note && (
                    <p className="text-xs text-amber-700 mt-2 italic">
                      หมายเหตุเดิม: {h.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Toast ใหม่ - อยู่ด้านล่างกลาง สวยมาก */}
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm min-w-[280px] animate-in slide-in-from-bottom fade-in duration-300 pointer-events-auto transition-all`}
              style={{
                background:
                  t.type === "success"
                    ? "linear-gradient(to right, #16a34a, #22c55e)"
                    : "linear-gradient(to right, #dc2626, #ef4444)",
              }}
            >
              {t.type === "success" ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
              <span>{t.msg}</span>
            </div>
          ))}
        </div>

        {/* Bottom Bar มือถือ */}
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
        {/* Modal ทั้งหมด */}
        {/* Modal: ยืนยันส่งแล้ว + กรอกหมายเหตุ */}
        {showDeliverModal && houseToDeliver && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <h2 className="text-xl font-bold text-green-600 mb-4">
                ยืนยันส่งแล้ว
              </h2>
              <div className="bg-gray-50 p-4 rounded-xl mb-4">
                <p className="font-bold">{houseToDeliver.full_name}</p>
                <p className="text-sm text-gray-600">{houseToDeliver.phone}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {houseToDeliver.address}
                </p>
              </div>
              <textarea
                placeholder="เช่น ฝากไว้หน้าบ้าน, ลูกค้าไม่อยู่, โอนแล้ว 500 บาท..."
                value={deliverNote}
                onChange={(e) => setDeliverNote(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border-2 border-green-200 rounded-xl focus:border-green-500 outline-none resize-none"
                autoFocus
              />
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowDeliverModal(false)}
                  className="flex-1 py-3 bg-gray-200 rounded-xl font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmDeliver}
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold shadow-lg"
                >
                  ส่งแล้ว
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center mt-3">
                สามารถกด “ส่งแล้ว” โดยไม่กรอกก็ได้
              </p>
            </div>
          </div>
        )}
        {/* ========= Modal: ตั้งจุดเริ่มต้น (แก้ไขใหม่) ========= */}
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
              {/* ปุ่มตรวจจับตำแหน่งปัจจุบัน */}
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
              {/* ช่องกรอกพิกัดมือ */}
              <input
                type="text"
                placeholder="พิกัด (lat,lng) เช่น 16.883300,99.125000"
                value={startInput}
                onChange={(e) => {
                  let input = e.target.value;
                  // 1. ลบทุกช่องว่าง + ทุกอย่างที่ไม่ใช่ตัวเลข, จุด, comma, ลบ
                  input = input.replace(/[^0-9.,-]/g, "");
                  // 2. ป้องกันหลาย comma ติดกัน
                  input = input.replace(/,+/g, ",");
                  // 3. แปลงให้เป็นรูปแบบ "จำนวน,จำนวน" เท่านั้น
                  const parts = input
                    .split(",")
                    .map((p) => p.trim())
                    .filter(Boolean);
                  const cleaned = parts.slice(0, 2).join(",");
                  // 4. อัปเดตช่องให้สวยทันที (ไม่มีช่องว่างเลย)
                  setStartInput(cleaned);
                  // 5. ดึงค่า lat/lng ไปใช้จริง
                  if (cleaned && cleaned.includes(",")) {
                    const [latStr, lngStr] = cleaned.split(",");
                    const lat = parseFloat(latStr);
                    const lng = parseFloat(lngStr);
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-mono text-center focus:border-blue-500 focus:outline-none mb-3 tracking-tight"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
              />
              {/* แสดงพิกัดที่กำลังจะใช้ */}
              {detectedStartLat !== null && detectedStartLng !== null && (
                <div className="text-center mb-4 text-sm">
                  <button
                    onClick={() =>
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${detectedStartLat},${detectedStartLng}`,
                        "_blank",
                      )
                    }
                    className="text-blue-600 hover:text-blue-800 text-sm underline mt-1"
                  >
                    ดูบน Google Maps
                  </button>
                </div>
              )}
              {/* ปุ่มด้านล่าง */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowStartModal(false)}
                  className="flex-1 py-3 bg-gray-200 rounded-xl"
                >
                  ยกเลิก
                </button>
                {/* ปุ่มตั้งค่า – ฉลาดขึ้น! */}
                <button
                  onClick={handleSetStartPosition}
                  disabled={isDetecting}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {detectedStartLat === null && detectedStartLng === null
                    ? "ใช้ตำแหน่งปัจจุบัน"
                    : "ตั้งค่าพิกัดนี้"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal: แก้ไขบ้าน (เหมือนหน้า houses 100%) */}
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl mb-3 focus:border-blue-500 outline-none"
              />
              <input
                type="text"
                placeholder="เบอร์โทร"
                value={currentHouse.phone}
                onChange={(e) =>
                  setCurrentHouse({ ...currentHouse, phone: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl mb-3 focus:border-blue-500 outline-none"
              />
              <textarea
                placeholder="ที่อยู่"
                value={currentHouse.address}
                onChange={(e) =>
                  setCurrentHouse({ ...currentHouse, address: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl mb-3 resize-none focus:border-blue-500 outline-none"
              />
              <textarea
                placeholder="หมายเหตุ"
                value={currentHouse.note || ""}
                onChange={(e) =>
                  setCurrentHouse({ ...currentHouse, note: e.target.value })
                }
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl mb-4 resize-none focus:border-blue-500 outline-none"
              />
              {/* === ส่วนพิกัด (เหมือนหน้า houses เป๊ะ) === */}
              <div className="space-y-3">
                {/* ปุ่มตรวจจับตำแหน่ง */}
                <button
                  onClick={() => {
                    if (!navigator.geolocation) {
                      addToast("เบราว์เซอร์ไม่รองรับ GPS", "error");
                      return;
                    }
                    setIsDetecting(true);
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const lat = pos.coords.latitude;
                        const lng = pos.coords.longitude;
                        setCurrentHouse({
                          ...currentHouse,
                          lat,
                          lng,
                        });
                        addToast("ตรวจจับพิกัดสำเร็จ!", "success");
                        setIsDetecting(false);
                      },
                      () => {
                        addToast("ไม่สามารถตรวจจับตำแหน่งได้", "error");
                        setIsDetecting(false);
                      },
                      { enableHighAccuracy: true, timeout: 10000 },
                    );
                  }}
                  disabled={isDetecting}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-60 transition"
                >
                  {isDetecting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <MapPin className="w-5 h-5" />
                  )}
                  {isDetecting ? "กำลังตรวจจับ..." : "ตรวจจับตำแหน่งปัจจุบัน"}
                </button>
                {/* ช่องกรอกพิกัดมือ */}
                <input
                  type="text"
                  placeholder="พิกัด (lat,lng) เช่น 16.883300,99.125000"
                  value={
                    currentHouse.lat && currentHouse.lng
                      ? `${currentHouse.lat},${currentHouse.lng}`
                      : ""
                  }
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    if (!value) {
                      setCurrentHouse({
                        ...currentHouse,
                        lat: null,
                        lng: null,
                      });
                      return;
                    }
                    const parts = value.split(",");
                    if (parts.length === 2) {
                      const lat = parseFloat(parts[0]);
                      const lng = parseFloat(parts[1]);
                      if (!isNaN(lat) && !isNaN(lng)) {
                        setCurrentHouse({ ...currentHouse, lat, lng });
                      }
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-mono text-center focus:border-blue-500 outline-none"
                />

                {/* ปุ่มตรวจสอบบน Maps */}
                {currentHouse.lat && currentHouse.lng && (
                  <div className="text-center">
                    <button
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps/search/?api=1&query=${currentHouse.lat},${currentHouse.lng}`,
                          "_blank",
                        )
                      }
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium underline flex items-center gap-1 mx-auto"
                    >
                      ตรวจสอบบน Google Maps
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 bg-gray-200 rounded-xl font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={saveEdit}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg"
                >
                  บันทึกการแก้ไข
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
