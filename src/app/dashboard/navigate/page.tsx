// C:\DropWay\dropway\src\app\dashboard\navigate\page.tsx
"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  AlertTriangle,
  CheckCircle,
  Edit3,
  ExternalLink,
  Flag,
  Loader2,
  Map as MapIcon,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

interface House {
  id: string;
  id_home: string | null;
  full_name: string;
  phone: string;
  address: string;
  lat: number | null;
  lng: number | null;
  note: string | null;
  quantity?: number;
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

const formatDeliveredDateTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear() + 543;
  const hour = d.getHours().toString().padStart(2, "0");
  const min = d.getMinutes().toString().padStart(2, "0");
  return `${day}/${month}/${year} || ${hour}:${min} น.`;
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
  const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=false&geometries=false&source=first&destination=last&roundtrip=false`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (data.code === "Ok" && data.waypoints) {
      const order: number[] = data.waypoints
        .slice(1)
        .map((wp: any) => wp.waypoint_index - 1)
        .filter((i: number) => i >= 0 && i < housesWithCoords.length);
      const reordered = order
        .map((i) => housesWithCoords[i])
        .filter((h): h is House => h !== undefined);
      return reordered.length > 0 ? reordered : housesWithCoords;
    }
  } catch (err) {
    console.warn("OSRM ล้มเหลว ใช้ระยะทางตรงแทน");
  }
  return housesWithCoords
    .map((h) => ({
      ...h,
      dist: haversineDistance(start.lat, start.lng, h.lat!, h.lng!),
    }))
    .sort((a, b) => a.dist - b.dist)
    .map(({ dist, ...h }) => h);
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
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"today" | "delivered" | "reported">(
    "today",
  );
  const [deliveredHouses, setDeliveredHouses] = useState<any[]>([]);
  const [reportedHouses, setReportedHouses] = useState<any[]>([]);

  // Modal
  const [showStartModal, setShowStartModal] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentHouse, setCurrentHouse] = useState<House | null>(null);
  const [houseToDeliver, setHouseToDeliver] = useState<House | null>(null);
  const [houseToReport, setHouseToReport] = useState<House | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [filterCoord, setFilterCoord] = useState<"all" | "has" | "none">("all");
  const [isSearchLocked, setIsSearchLocked] = useState(false);

  const [deliverNote, setDeliverNote] = useState("โอนเข้าบริษัท"); // ค่าเริ่มต้น
  const [deliverNoteCustom, setDeliverNoteCustom] = useState(""); // สำหรับกรณี "อื่นๆ"
  const [isRealTimeMode, setIsRealTimeMode] = useState(false);

  // Start position
  const [detectedStartLat, setDetectedStartLat] = useState<number | null>(null);
  const [detectedStartLng, setDetectedStartLng] = useState<number | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [coordInput, setCoordInput] = useState("");

  // Toast
  const [toasts, setToasts] = useState<
    { id: string; msg: string; type: "success" | "error" }[]
  >([]);
  const shouldResort = useRef(true);

  const addToast = (msg: string, type: "success" | "error" = "success") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, msg, type }]);

    // หายอัตโนมัติใน 2 วินาที
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 1000);
  };

  // โทรออก
  const callPhone = (phone: string) => {
    window.location.href = `tel:${phone.replace(/[^0-9]/g, "")}`;
  };

  // ลบจาก today_houses
  const deleteFromToday = async (id: string, id_home?: string | null) => {
    if (!confirm("ลบบ้านนี้จากรายการวันนี้จริงหรือ?")) return;
    try {
      const query = id_home
        ? supabase.from("today_houses").delete().eq("id_home", id_home)
        : supabase.from("today_houses").delete().eq("id", id);
      const { error } = await query;
      if (error) throw error;
      setHouses((p) => p.filter((h) => h.id !== id && h.id_home !== id_home));
      setOptimizedHouses((p) =>
        p.filter((h) => h.id !== id && h.id_home !== id_home),
      );
      addToast("ลบสำเร็จ", "success");
    } catch (err: any) {
      addToast("ลบไม่สำเร็จ: " + err.message, "error");
    }
  };

  // ลบรายการส่งแล้ว
  const deleteDelivered = async (id: string) => {
    if (!confirm("ลบรายการส่งแล้วนี้จริงหรือ?")) return;
    try {
      const { error } = await supabase
        .from("delivered_today")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setDeliveredHouses((p) => p.filter((h) => h.id !== id));
      addToast("ลบสำเร็จ", "success");
    } catch {
      addToast("ลบไม่สำเร็จ", "error");
    }
  };

  // ยืนยันส่งแล้ว
  const confirmDeliver = async () => {
    if (!houseToDeliver) return;

    // กำหนดหมายเหตุจริงที่จะบันทึกลงฐานข้อมูล
    const finalNote =
      deliverNote === "อื่นๆ"
        ? deliverNoteCustom.trim() || "อื่นๆ (ไม่ระบุรายละเอียด)"
        : deliverNote;

    const note = finalNote || "ส่งแล้ว (ไม่ระบุหมายเหตุ)";
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("ไม่พบผู้ใช้");

      const delQuery = houseToDeliver.id_home
        ? supabase
            .from("today_houses")
            .delete()
            .eq("id_home", houseToDeliver.id_home)
        : supabase.from("today_houses").delete().eq("id", houseToDeliver.id);
      const { error: delErr } = await delQuery;
      if (delErr) throw delErr;

      setHouses((p) => p.filter((h) => h.id !== houseToDeliver.id));
      setOptimizedHouses((p) => p.filter((h) => h.id !== houseToDeliver.id));

      const item = {
        id: crypto.randomUUID(),
        user_id: user.id,
        id_home: houseToDeliver.id_home || null,
        full_name: houseToDeliver.full_name,
        phone: houseToDeliver.phone,
        address: houseToDeliver.address,
        lat: houseToDeliver.lat,
        lng: houseToDeliver.lng,
        note: houseToDeliver.note,
        quantity: houseToDeliver.quantity,
        delivered_note: note,
        delivered_at: new Date().toISOString(),
      };

      const { error: insErr } = await supabase
        .from("delivered_today")
        .insert(item);
      if (insErr) throw insErr;

      setDeliveredHouses((p) => [item, ...p]);
      addToast(`ส่งแล้ว: ${note}`, "success");
    } catch (err: any) {
      addToast("ส่งไม่สำเร็จ: " + err.message, "error");
    } finally {
      setShowDeliverModal(false);
      setHouseToDeliver(null);
      setDeliverNote("โอนเข้าบริษัท"); // รีเซ็ต
      setDeliverNoteCustom(""); // รีเซ็ต
    }
  };

  // รายงานปัญหา
  const confirmReport = async () => {
    if (!houseToReport || !reportReason.trim()) {
      addToast("กรุณากรอกเหตุผลการรายงาน", "error");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("ไม่พบผู้ใช้");

      const delQuery = houseToReport.id_home
        ? supabase
            .from("today_houses")
            .delete()
            .eq("id_home", houseToReport.id_home)
        : supabase.from("today_houses").delete().eq("id", houseToReport.id);
      const { error: delErr } = await delQuery;
      if (delErr) throw delErr;

      setHouses((p) => p.filter((h) => h.id !== houseToReport.id));
      setOptimizedHouses((p) => p.filter((h) => h.id !== houseToReport.id));

      const item = {
        id: crypto.randomUUID(),
        user_id: user.id,
        id_home: houseToReport.id_home || null,
        full_name: houseToReport.full_name,
        phone: houseToReport.phone,
        address: houseToReport.address,
        lat: houseToReport.lat,
        lng: houseToReport.lng,
        note: houseToReport.note,
        quantity: houseToReport.quantity,
        report_reason: reportReason.trim(),
        reported_at: new Date().toISOString(),
      };

      const { error: insErr } = await supabase
        .from("reported_houses")
        .insert(item);
      if (insErr) throw insErr;

      setReportedHouses((p) => [item, ...p]);
      addToast(`รายงานแล้ว: ${reportReason.trim()}`, "success");
    } catch (err: any) {
      addToast("รายงานไม่สำเร็จ: " + err.message, "error");
    } finally {
      setShowReportModal(false);
      setHouseToReport(null);
      setReportReason("");
    }
  };

  // แก้ไขบ้าน
  const saveEdit = async () => {
    if (!currentHouse) return;
    const updates = {
      full_name: currentHouse.full_name.trim(),
      phone: currentHouse.phone.trim(),
      address: currentHouse.address.trim(),
      lat: currentHouse.lat,
      lng: currentHouse.lng,
      note: currentHouse.note?.trim() || null,
      quantity: currentHouse.quantity || 1,
    };
    try {
      if (currentHouse.id_home) {
        const { error: housesError } = await supabase
          .from("houses")
          .update(updates)
          .eq("id", currentHouse.id_home);
        if (housesError) throw housesError;
      }
      const { error } = await supabase
        .from("today_houses")
        .update(updates)
        .or(`id.eq.${currentHouse.id},id_home.eq.${currentHouse.id_home}`);
      if (error) throw error;

      setHouses((prev) =>
        prev.map((h) =>
          h.id === currentHouse.id || h.id_home === currentHouse.id_home
            ? { ...h, ...updates }
            : h,
        ),
      );
      setOptimizedHouses((prev) =>
        prev.map((h) =>
          h.id === currentHouse.id || h.id_home === currentHouse.id_home
            ? { ...h, ...updates }
            : h,
        ),
      );
      addToast("แก้ไขสำเร็จ! ทุกคนเห็นข้อมูลใหม่ทันที", "success");
    } catch (err: any) {
      addToast("แก้ไขไม่สำเร็จ: " + err.message, "error");
    } finally {
      setShowEditModal(false);
      setCurrentHouse(null);
    }
  };

  // แก้ไข loadTodayHouses ให้ดึงแบบธรรมดา (เร็วมาก)
  const loadTodayHouses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("today_houses")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;

      const cleaned = (data || []).map((h: any) => ({
        id: h.id,
        id_home: h.id_home || null,
        full_name: h.full_name || "",
        phone: h.phone || "",
        address: h.address || "",
        lat: h.lat,
        lng: h.lng,
        note: h.note,
        quantity: h.quantity,
        order_index: h.order_index || 9999,
      }));

      setHouses(cleaned);
      setOptimizedHouses(cleaned); // ใช้ order_index ที่มีอยู่แล้ว
      shouldResort.current = false; // ไม่ต้อง optimize ใหม่ทุกครั้ง
    } catch (err: any) {
      addToast("โหลดข้อมูลล้มเหลว: " + err.message, "error");
    }
  }, []);

  const loadDelivered = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("delivered_today")
        .select("*")
        .eq("user_id", user.id)
        .gte("delivered_at", `${today}T00:00:00`)
        .lte("delivered_at", `${today}T23:59:59`)
        .order("delivered_at", { ascending: false });
      setDeliveredHouses(data || []);
    } catch {}
  }, []);

  const loadReported = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("reported_houses")
        .select("*")
        .eq("user_id", user.id)
        .gte("reported_at", `${today}T00:00:00`)
        .lte("reported_at", `${today}T23:59:59`)
        .order("reported_at", { ascending: false });
      setReportedHouses(data || []);
    } catch {}
  }, []);

  // Init + Realtime
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadTodayHouses(), loadDelivered(), loadReported()]);
      setLoading(false);
    };
    init();

    const channel = supabase.channel("navigate_realtime");

    // today_houses changes
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "today_houses" },
      (payload) => {
        const newHouse = payload.new as any;
        const cleaned = {
          id: newHouse.id,
          id_home: newHouse.id_home || null,
          full_name: newHouse.full_name || "",
          phone: newHouse.phone || "",
          address: newHouse.address || "",
          lat: newHouse.lat,
          lng: newHouse.lng,
          note: newHouse.note,
          quantity: newHouse.quantity,
          order_index: newHouse.order_index || 9999,
        };
        setHouses((prev) => {
          const updated = [...prev, cleaned];
          // เรียงตาม order_index ทันที
          updated.sort((a, b) => a.order_index - b.order_index);
          setOptimizedHouses(updated);
          return updated;
        });
      },
    );

    channel.on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "today_houses" },
      (payload) => {
        const oldHouse = payload.old as any;
        const id = oldHouse.id;
        const id_home = oldHouse.id_home;
        setHouses((p) => {
          const updated = p.filter((h) => h.id !== id && h.id_home !== id_home);
          setOptimizedHouses(updated);
          return updated;
        });
      },
    );

    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "today_houses" },
      (payload) => {
        const updatedHouse = payload.new as any;
        const cleaned = {
          id: updatedHouse.id,
          id_home: updatedHouse.id_home || null,
          full_name: updatedHouse.full_name || "",
          phone: updatedHouse.phone || "",
          address: updatedHouse.address || "",
          lat: updatedHouse.lat,
          lng: updatedHouse.lng,
          note: updatedHouse.note,
          quantity: updatedHouse.quantity,
          order_index: updatedHouse.order_index || 9999,
        };
        setHouses((prev) =>
          prev
            .map((h) =>
              h.id === cleaned.id || h.id_home === cleaned.id_home
                ? cleaned
                : h,
            )
            .sort((a, b) => a.order_index - b.order_index),
        );
        setOptimizedHouses((prev) =>
          prev.map((h) =>
            h.id === cleaned.id || h.id_home === cleaned.id_home ? cleaned : h,
          ),
        );
      },
    );

    // delivered_today และ reported_houses ก็ทำเหมือนกัน
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "delivered_today" },
      (payload) => {
        setDeliveredHouses((p) => [payload.new, ...p]);
      },
    );

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "reported_houses" },
      (payload) => {
        setReportedHouses((p) => [payload.new, ...p]);
      },
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTodayHouses, loadDelivered, loadReported]);

  // โหลดจุดเริ่มต้นจาก localStorage ตอน mount
  useEffect(() => {
    const saved = localStorage.getItem("todayStartPosition");
    if (saved) {
      try {
        const pos = JSON.parse(saved);
        if (pos && typeof pos.lat === "number" && typeof pos.lng === "number") {
          setStartPosition(pos);
          shouldResort.current = true;
          addToast("ใช้จุดเริ่มต้นที่ตั้งไว้ก่อนหน้า", "success");
        }
      } catch (err) {
        console.warn("โหลดจุดเริ่มต้นเก่าผิดพลาด", err);
        localStorage.removeItem("todayStartPosition");
      }
    }
  }, []);

  // เรียงลำดับอัตโนมัติ
  useEffect(() => {
    if (!shouldResort.current || houses.length === 0) return;
    const run = async () => {
      const origin = startPosition || currentPosition || DEFAULT_POSITION;
      const withCoords = houses.filter((h) => h.lat && h.lng);
      const noCoords = houses.filter((h) => !h.lat || !h.lng);
      const optimized = await getOptimizedRouteOrder(origin, withCoords);
      const final = [...optimized, ...noCoords];
      setOptimizedHouses(final);
      final.forEach(async (h, i) => {
        await supabase
          .from("today_houses")
          .update({ order_index: i + 1 })
          .eq("id", h.id);
      });
      shouldResort.current = false;
    };
    run();
  }, [houses, currentPosition, startPosition]);

  // รีเฟรช GPS
  const forceRefreshLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCurrentPosition({ lat: p.coords.latitude, lng: p.coords.longitude });
        addToast("รีเฟรช GPS สำเร็จ", "success");
        shouldResort.current = true;
      },
      () => addToast("ดึง GPS ไม่ได้", "error"),
      { enableHighAccuracy: true },
    );
  };

  const openFullRoute = () => {
    const listToUse =
      isSearchLocked && searchQuery.trim() ? displayed : optimizedHouses;
    const origin = startPosition || currentPosition || DEFAULT_POSITION;
    const validHouses = listToUse.filter(
      (h): h is House & { lat: number; lng: number } => !!h.lat && !!h.lng,
    );
    if (validHouses.length === 0) {
      addToast("ไม่มีบ้านที่มีพิกัดในรายการนี้", "error");
      return;
    }
    const maxPoints = 20;
    const housesToUse = validHouses.slice(0, maxPoints);
    const coords = [
      `${origin.lat},${origin.lng}`,
      ...housesToUse.map((h) => `${h.lat},${h.lng}`),
    ].join("/");
    const url = `https://www.google.com/maps/dir/${coords}`;
    window.open(url, "_blank");
    const total = validHouses.length;
    const used = housesToUse.length;
    const source =
      isSearchLocked && searchQuery.trim() ? "ผลค้นหาที่ล็อค" : "ทั้งหมด";
    const msg =
      used < total
        ? `เปิดเส้นทาง ${used} จุดแรก จาก ${source} (${total} จุด)`
        : `เปิดเส้นทางทั้งหมดจาก ${source} (${used} จุด)`;
    addToast(msg, "success");
  };

  // แก้ไข useEffect สำหรับ currentPosition ให้อัปเดต real-time เมื่ออยู่ในโหมดนี้
  useEffect(() => {
    if (!isRealTimeMode) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentPosition(newPos);
        // ไม่เซฟลง localStorage หรือ Supabase
        shouldResort.current = true;
      },
      (error) => {
        console.warn("Real-time GPS error:", error);
        addToast("อัปเดตตำแหน่งเรียลไทม์ล้มเหลว", "error");
        setIsRealTimeMode(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isRealTimeMode]);

  // แก้ไขการโหลด startPosition จาก localStorage
  useEffect(() => {
    const saved = localStorage.getItem("todayStartPosition");
    if (saved) {
      try {
        const pos = JSON.parse(saved);
        if (pos && typeof pos.lat === "number" && typeof pos.lng === "number") {
          setStartPosition(pos);
          setIsRealTimeMode(false); // ถ้ามีค่าที่เซฟไว้ → ปิดโหมด real-time
          addToast("ใช้จุดเริ่มต้นที่ตั้งไว้", "success");
        }
      } catch (err) {
        console.warn("โหลดจุดเริ่มต้นเก่าผิดพลาด", err);
        localStorage.removeItem("todayStartPosition");
      }
    } else {
      // ถ้าไม่มีค่าที่เซฟไว้ → เปิดโหมด real-time อัตโนมัติ
      setIsRealTimeMode(true);
      addToast("กำลังใช้ตำแหน่งเรียลไทม์", "success");
    }
  }, []);

  // ตำแหน่งที่ใช้จริงในการคำนวณเส้นทาง
  const effectiveStartPosition =
    startPosition || currentPosition || DEFAULT_POSITION;

  // แก้ไข handleSetStartPosition ให้เซฟลง localStorage + Supabase
  const handleSetStartPosition = async () => {
    setIsDetecting(true);
    let lat: number, lng: number;

    if (detectedStartLat !== null && detectedStartLng !== null) {
      lat = detectedStartLat;
      lng = detectedStartLng;
    } else {
      try {
        const pos = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 15000,
            });
          },
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        addToast("ดึงตำแหน่งไม่สำเร็จ", "error");
        setIsDetecting(false);
        return;
      }
    }

    try {
      await supabase.rpc("save_start_position", { p_lat: lat, p_lng: lng });
      const newPos = { lat, lng };
      setStartPosition(newPos);
      localStorage.setItem("todayStartPosition", JSON.stringify(newPos));
      setIsRealTimeMode(false); // ปิดโหมด real-time เมื่อเซฟค่าคงที่
      shouldResort.current = true;
      addToast("ตั้งจุดเริ่มต้นสำเร็จ! (ใช้ค่าคงที่)", "success");
      setShowStartModal(false);
    } catch (e: any) {
      addToast("เซฟไม่สำเร็จ: " + e.message, "error");
    } finally {
      setIsDetecting(false);
    }
  };

  const detectCurrentLocation = (forEdit = false) => {
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        // ใช้ร่วมกันทั้งสอง modal
        setDetectedStartLat(lat);
        setDetectedStartLng(lng);
        setCoordInput(`${lat.toFixed(6)},${lng.toFixed(6)}`);

        // ถ้ากำลังอยู่ใน modal แก้ไขบ้าน ให้อัปเดต currentHouse ด้วย
        if (forEdit && currentHouse) {
          setCurrentHouse({
            ...currentHouse,
            lat,
            lng,
          });
        }

        addToast("ตรวจจับพิกัดสำเร็จ!", "success");
        setIsDetecting(false);
      },
      () => {
        addToast("ไม่สามารถตรวจจับตำแหน่งได้", "error");
        setIsDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const verifyOnMaps = (lat: number, lng: number) => {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      "_blank",
    );
  };

  const displayed = useMemo(() => {
    let list = optimizedHouses;
    if (filterCoord === "has") list = list.filter((h) => h.lat && h.lng);
    else if (filterCoord === "none")
      list = list.filter((h) => !h.lat || !h.lng);
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((h) => {
      const fullText = [
        h.full_name || "",
        h.phone || "",
        h.address || "",
        h.note || "",
        h.quantity?.toString() || "",
        h.lat ? h.lat.toFixed(6) : "",
        h.lng ? h.lng.toFixed(6) : "",
        h.lat && h.lng ? `${h.lat.toFixed(6)},${h.lng.toFixed(6)}` : "",
        h.address.match(/[\d\/\\-]+/)?.[0] || "",
        h.address.match(/ม\.\s*(\d+)/i)?.[1] || "",
        h.address.match(/ต\.\s*([\u0E00-\u0E7F]+)/)?.[1] || "",
      ]
        .join(" ")
        .toLowerCase();
      return fullText.includes(q);
    });
  }, [optimizedHouses, searchQuery, filterCoord]);

  const displayedDelivered = useMemo(() => {
    if (!searchQuery.trim()) return deliveredHouses;
    const q = searchQuery.toLowerCase().trim();
    return deliveredHouses.filter((h: any) => {
      const time = formatDeliveredDateTime(h.delivered_at);
      const fullText = [
        h.full_name || "",
        h.phone || "",
        h.address || "",
        h.delivered_note || "",
        h.note || "",
        h.quantity?.toString() || "",
        time,
        time.split("||")[1]?.trim() || "",
        time.split("/")[0],
        time.split("/")[1],
        h.address.match(/[\d\/\\-]+/)?.[0] || "",
        h.address.match(/ม\.\s*(\d+)/i)?.[1] || "",
      ]
        .join(" ")
        .toLowerCase();
      return fullText.includes(q);
    });
  }, [deliveredHouses, searchQuery]);

  if (loading) {
    return (
      <div className="space-y-4 px-4 py-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-16 mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8 text-gray-800">
        <div className="sticky top-0 bg-white border-b z-40 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold">
                  {viewMode === "today"
                    ? ""
                    : viewMode === "delivered"
                      ? ""
                      : ""}
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
                    วันนี้ ({optimizedHouses.length})
                  </button>
                  <button
                    onClick={() => setViewMode("delivered")}
                    className={`px-5 py-2 rounded-lg font-bold transition-all ${
                      viewMode === "delivered"
                        ? "bg-green-600 text-white shadow-md"
                        : "text-gray-600"
                    }`}
                  >
                    ส่งแล้ว ({deliveredHouses.length})
                  </button>
                  <button
                    onClick={() => setViewMode("reported")}
                    className={`px-5 py-2 rounded-lg font-bold transition-all ${
                      viewMode === "reported"
                        ? "bg-orange-600 text-white shadow-md"
                        : "text-gray-600"
                    }`}
                  >
                    รายงาน ({reportedHouses.length})
                  </button>
                </div>
              </div>

              {viewMode === "today" && (
                <div className="hidden lg:flex gap-3">
                  <button
                    onClick={() => setShowStartModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-bold shadow"
                  >
                    <Flag className="w-5 h-5" />
                    {startPosition ? "แก้จุดเริ่ม" : "ตั้งจุดเริ่ม"}
                  </button>
                  <button
                    onClick={async () => {
                      addToast("กำลังเรียงลำดับใหม่ตามระยะทาง...", "success");
                      shouldResort.current = true;
                      // force re-run optimization
                      const origin = effectiveStartPosition;
                      const withCoords = houses.filter((h) => h.lat && h.lng);
                      const optimized = await getOptimizedRouteOrder(
                        origin,
                        withCoords,
                      );
                      const final = [
                        ...optimized,
                        ...houses.filter((h) => !h.lat || !h.lng),
                      ];
                      setOptimizedHouses(final);
                      // อัปเดต order_index ทีละอัน
                      for (let i = 0; i < final.length; i++) {
                        await supabase
                          .from("today_houses")
                          .update({ order_index: i + 1 })
                          .eq("id", final[i].id);
                      }
                      addToast("เรียงลำดับใหม่เสร็จแล้ว!", "success");
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow"
                  >
                    <RefreshCw className="w-5 h-5" />
                    เรียงใหม่
                  </button>
                  <button
                    onClick={openFullRoute}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-bold shadow"
                  >
                    <MapIcon className="w-5 h-5" />
                    เส้นทางทั้งหมด
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                {(viewMode === "today"
                  ? optimizedHouses.length
                  : viewMode === "delivered"
                    ? deliveredHouses.length
                    : reportedHouses.length) > 0 && (
                  <button
                    onClick={async () => {
                      const isToday = viewMode === "today";
                      const count = isToday
                        ? optimizedHouses.length
                        : viewMode === "delivered"
                          ? deliveredHouses.length
                          : reportedHouses.length;
                      if (
                        !confirm(
                          `ลบ${isToday ? "รายการวันนี้" : viewMode === "delivered" ? "รายการส่งแล้ว" : "รายการรายงาน"}ทั้งหมด ${count} รายการจริงหรือ?`,
                        )
                      )
                        return;
                      try {
                        if (isToday) {
                          await supabase
                            .from("today_houses")
                            .delete()
                            .neq("id", "00000000-0000-0000-0000-000000000000");
                          setHouses([]);
                          setOptimizedHouses([]);
                          addToast("ลบรายการวันนี้ทั้งหมดแล้ว", "success");
                        } else if (viewMode === "delivered") {
                          await supabase
                            .from("delivered_today")
                            .delete()
                            .in(
                              "id",
                              deliveredHouses.map((h) => h.id),
                            );
                          setDeliveredHouses([]);
                          addToast("ลบรายการส่งแล้วทั้งหมดแล้ว", "success");
                        } else {
                          await supabase
                            .from("reported_houses")
                            .delete()
                            .in(
                              "id",
                              reportedHouses.map((h) => h.id),
                            );
                          setReportedHouses([]);
                          addToast("ลบรายการรายงานทั้งหมดแล้ว", "success");
                        }
                      } catch (err: any) {
                        addToast("ลบไม่สำเร็จ: " + err.message, "error");
                      }
                    }}
                    className="flex items-center gap-2 px-2 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                {viewMode === "today" && optimizedHouses.length > 0 && (
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    {(() => {
                      const withCoord = optimizedHouses.filter(
                        (h) => h.lat && h.lng,
                      ).length;
                      const withoutCoord = optimizedHouses.length - withCoord;
                      return (
                        <>
                          <button
                            onClick={() => setFilterCoord("all")}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${filterCoord === "all" ? "bg-blue-600 text-white shadow" : "text-gray-600"}`}
                          >
                            All ({optimizedHouses.length})
                          </button>
                          <button
                            onClick={() => setFilterCoord("has")}
                            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1 transition-all ${filterCoord === "has" ? "bg-green-600 text-white shadow" : "text-gray-600"}`}
                          >
                            <MapPin className="w-4 h-4" /> มีพิกัด ({withCoord})
                          </button>
                          <button
                            onClick={() => setFilterCoord("none")}
                            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1 transition-all ${filterCoord === "none" ? "bg-orange-600 text-white shadow" : "text-gray-600"}`}
                          >
                            <AlertTriangle className="w-4 h-4" /> ไม่มีพิกัด (
                            {withoutCoord})
                          </button>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* ช่องค้นหา + ปุ่มล็อค */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder={
                    viewMode === "today"
                      ? "ค้นหาทุกอย่าง: ชื่อ, เบอร์, ที่อยู่, พิกัด, หมายเหตุ..."
                      : "ค้นหา: ชื่อ, เบอร์, เวลา, หมายเหตุ..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 border rounded-xl focus:border-blue-500 outline-none font-medium transition shadow-sm"
                  id="navigate-search-input"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setTimeout(
                        () =>
                          document
                            .getElementById("navigate-search-input")
                            ?.focus(),
                        0,
                      );
                    }}
                    className="absolute right-12 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-200 transition z-10"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                )}
                {viewMode === "today" && searchQuery.trim() && (
                  <button
                    onClick={() => {
                      setIsSearchLocked(!isSearchLocked);
                      addToast(
                        isSearchLocked
                          ? "ปลดล็อคการค้นหาแล้ว"
                          : "ล็อคการค้นหาแล้ว – เส้นทางทั้งหมดใช้เฉพาะผลค้นหา",
                        "success",
                      );
                    }}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
                      isSearchLocked
                        ? "bg-blue-600 text-white shadow-lg"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                    title={
                      isSearchLocked
                        ? "กำลังล็อค – คลิกปลดล็อค"
                        : "คลิกล็อคผลค้นหา"
                    }
                  >
                    {isSearchLocked ? (
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5 9V7a5 5 0 0110 0v2h3a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1v-7a1 1 0 011-1h3zm4-5a3 3 0 016 0v2H5V4a3 3 0 013-3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 11V7a4 4 0 118 0m-1 9v-4m-6 4h12"
                        />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {viewMode === "today" ? (
            displayed.length === 0 ? (
              <p className="text-center py-20 text-gray-500 text-lg">
                {searchQuery ? "ไม่พบรายการที่ค้นหา" : "ยังไม่มีงานวันนี้"}
              </p>
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
                        <div className="flex gap-2">
                          <button
                            onClick={() => callPhone(house.phone)}
                            className="p-2 bg-green-100 rounded-lg hover:bg-green-200 transition"
                          >
                            <Phone className="w-5 h-5 text-green-600" />
                          </button>
                          <button
                            onClick={() => {
                              setCurrentHouse(house);
                              setShowEditModal(true);
                            }}
                            className="p-2 bg-blue-100 rounded-lg hover:bg-blue-200 transition"
                          >
                            <Edit3 className="w-5 h-5 text-blue-600" />
                          </button>
                          <button
                            onClick={() => {
                              setHouseToReport(house);
                              setReportReason("");
                              setShowReportModal(true);
                            }}
                            className="p-2 bg-orange-100 rounded-lg hover:bg-orange-200 transition"
                            title="รายงานปัญหา / ฝากไว้ก่อน"
                          >
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                          </button>
                          <button
                            onClick={() =>
                              deleteFromToday(house.id, house.id_home)
                            }
                            className="p-2 bg-red-100 rounded-lg hover:bg-red-200 transition"
                          >
                            <Trash2 className="w-5 h-5 text-red-600" />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-lg font-bold">{house.full_name}</h3>
                      <p className="text-sm text-gray-600">{house.phone}</p>
                      {house.quantity && house.quantity > 1 && (
                        <p className="text-sm font-bold text-purple-600 mt-1">
                          จำนวน: {house.quantity} ชิ้น
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                        {house.address}
                      </p>
                      {house.note && (
                        <p className="text-xs italic text-amber-700 mt-2">
                          หมายเหตุ: {house.note}
                        </p>
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
                          onClick={() =>
                            window.open(
                              `https://www.google.com/maps/dir/?api=1&origin=${(startPosition || currentPosition)?.lat || 16.8833},${(startPosition || currentPosition)?.lng || 99.125}&destination=${house.lat},${house.lng}&travelmode=driving`,
                              "_blank",
                            )
                          }
                          className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg"
                        >
                          <Navigation className="w-5 h-5" /> นำทาง
                        </button>
                      ) : (
                        <div className="flex-1 py-3 text-center bg-gray-100 rounded-xl text-gray-500">
                          ไม่มีพิกัด
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setHouseToDeliver(house);
                          setDeliverNote("");
                          setShowDeliverModal(true);
                        }}
                        className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg"
                      >
                        <CheckCircle className="w-5 h-5 inline mr-1" /> ส่งแล้ว
                      </button>
                    </div>
                  </div>
                );
              })
            )
          ) : viewMode === "delivered" ? (
            displayedDelivered.map((h, idx) => (
              <div
                key={h.id}
                className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-5 shadow-md mb-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-2xl font-bold text-green-700">
                    #{displayedDelivered.length - idx}
                  </span>
                  <button
                    onClick={() => deleteDelivered(h.id)}
                    className="p-2 bg-red-100 rounded-lg hover:bg-red-200"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                </div>
                <h3 className="text-lg font-bold">{h.full_name}</h3>
                <p className="text-sm text-gray-600">{h.phone}</p>
                {h.quantity && h.quantity > 1 && (
                  <p className="text-sm font-bold text-purple-600">
                    จำนวน: {h.quantity} ชิ้น
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">{h.address}</p>
                <p className="text-sm font-bold text-blue-600 mt-3 break-words">
                  {h.delivered_note || "ส่งแล้ว (ไม่ระบุหมายเหตุ)"}
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  {formatDeliveredDateTime(h.delivered_at)}
                </p>

                {/* เพิ่มปุ่มดูพิกัด/นำทาง ถ้ามีพิกัด */}
                {h.lat && h.lng && (
                  <div className="mt-4">
                    <button
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}`,
                          "_blank",
                        )
                      }
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition"
                    >
                      <MapPin className="w-5 h-5" />
                      ดูตำแหน่งบนแผนที่
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : reportedHouses.length === 0 ? (
            <p className="text-center py-20 text-gray-500 text-lg">
              ยังไม่มีรายการที่รายงาน
            </p>
          ) : (
            reportedHouses.map((h, idx) => (
              <div
                key={h.id}
                className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl p-5 shadow-md mb-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-2xl font-bold text-orange-700">
                    #{reportedHouses.length - idx}
                  </span>
                  <button
                    onClick={async () => {
                      if (!confirm("ลบรายงานนี้?")) return;
                      await supabase
                        .from("reported_houses")
                        .delete()
                        .eq("id", h.id);
                      setReportedHouses((p) => p.filter((x) => x.id !== h.id));
                      addToast("ลบรายงานแล้ว", "success");
                    }}
                    className="p-2 bg-red-100 rounded-lg hover:bg-red-200"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                </div>
                <h3 className="text-lg font-bold">{h.full_name}</h3>
                <p className="text-sm text-gray-600">{h.phone}</p>
                {h.quantity && h.quantity > 1 && (
                  <p className="text-sm font-bold text-purple-600">
                    จำนวน: {h.quantity} ชิ้น
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">{h.address}</p>
                <p className="text-sm font-bold text-orange-700 mt-3 break-words">
                  รายงาน: {h.report_reason}
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  {formatDeliveredDateTime(h.reported_at).replace("||", "เวลา")}
                </p>

                {/* เพิ่มปุ่มดูพิกัด/นำทาง ถ้ามีพิกัด */}
                {h.lat && h.lng && (
                  <div className="mt-4">
                    <button
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}`,
                          "_blank",
                        )
                      }
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition"
                    >
                      <MapPin className="w-5 h-5" />
                      ดูตำแหน่งบนแผนที่
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Bottom Bar */}
        {viewMode === "today" && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl lg:hidden z-50">
            <div className="flex justify-around py-3">
              <button
                onClick={() => setShowStartModal(true)}
                className="flex flex-col items-center gap-1 text-purple-600"
              >
                <Flag className="w-8 h-8" />
                <span className="text-xs font-bold">จุดเริ่ม</span>
              </button>
              <button
                onClick={forceRefreshLocation}
                className="flex flex-col items-center gap-1 text-yellow-600"
              >
                <RefreshCw className="w-9 h-9" />
                <span className="text-xs font-bold">รีเฟรช</span>
              </button>
              <button
                onClick={openFullRoute}
                className="flex flex-col items-center gap-1 text-red-600"
              >
                <MapIcon className="w-9 h-9" />
                <span className="text-xs font-bold">ทั้งหมด</span>
              </button>
            </div>
          </div>
        )}

        {/* Toast - มุมขวาบน */}
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`
                px-6 py-4 rounded-2xl text-white font-bold shadow-2xl
                min-w-[280px] max-w-sm
                animate-in slide-in-from-top fade-in duration-300
                pointer-events-auto
                ${
                  t.type === "success"
                    ? "bg-gradient-to-r from-green-500 to-emerald-600"
                    : "bg-gradient-to-r from-red-500 to-rose-600"
                }
              `}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {t.type === "success" ? (
                    <CheckCircle className="w-6 h-6 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                  )}
                  <span className="text-sm sm:text-base">{t.msg}</span>
                </div>
                {/* ปุ่มปิดด้วยมือ (optional แต่ดีมาก) */}
                <button
                  onClick={() =>
                    setToasts((prev) =>
                      prev.filter((toast) => toast.id !== t.id),
                    )
                  }
                  className="text-white/70 hover:text-white transition opacity-0 group-hover:opacity-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal ยืนยันส่งแล้ว */}
        {showDeliverModal && houseToDeliver && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <h2 className="text-xl font-bold text-green-600 mb-4">
                ยืนยันส่งแล้ว
              </h2>

              {/* ข้อมูลบ้าน */}
              <div className="bg-gray-50 p-4 rounded-xl mb-4">
                <p className="font-bold">{houseToDeliver.full_name}</p>
                <p className="text-sm text-gray-600">{houseToDeliver.phone}</p>
                <p className="text-xs text-gray-500 line-clamp-2">
                  {houseToDeliver.address}
                </p>
                {houseToDeliver.quantity && houseToDeliver.quantity > 1 && (
                  <p className="text-sm font-bold text-purple-600 mt-2">
                    จำนวน: {houseToDeliver.quantity} ชิ้น
                  </p>
                )}
              </div>

              {/* เลือกการชำระเงิน */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  การชำระเงิน
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    "โอนเข้าบริษัท",
                    "จ่ายด้วยเงินสด",
                    "โอนเข้าบัญชีฉัน",
                    "ไม่มียอด",
                    "อื่นๆ",
                  ].map((option) => (
                    <button
                      key={option}
                      onClick={() => setDeliverNote(option)}
                      className={`py-3 px-4 rounded-xl font-medium transition-all border-2 ${
                        deliverNote === option
                          ? "bg-green-600 text-white border-green-600 shadow-md"
                          : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                {/* ช่องกรอกเอง เฉพาะเมื่อเลือก "อื่นๆ" */}
                {deliverNote === "อื่นๆ" && (
                  <textarea
                    placeholder="กรอกรายละเอียดการชำระเงิน..."
                    value={deliverNoteCustom}
                    onChange={(e) => setDeliverNoteCustom(e.target.value)}
                    rows={3}
                    autoFocus
                    className="w-full mt-4 px-4 py-3 border-2 border-green-200 rounded-xl focus:border-green-500 outline-none resize-none transition-all"
                  />
                )}

                {/* Preview หมายเหตุ */}
                <div className="mt-4 p-3 bg-green-50 rounded-xl">
                  <p className="text-sm text-green-800 font-medium">
                    หมายเหตุ:{" "}
                    {deliverNote === "อื่นๆ"
                      ? deliverNoteCustom.trim() || "กำลังกรอกรายละเอียด..."
                      : deliverNote}
                  </p>
                </div>
              </div>

              {/* ปุ่มด้านล่าง */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeliverModal(false);
                    setDeliverNote("โอนเข้าบริษัท"); // รีเซ็ตค่าเริ่มต้น
                    setDeliverNoteCustom("");
                  }}
                  className="flex-1 py-3 bg-gray-200 rounded-xl font-medium"
                >
                  ยกเลิก
                </button>

                <button
                  onClick={confirmDeliver}
                  disabled={
                    !deliverNote ||
                    (deliverNote === "อื่นๆ" && !deliverNoteCustom.trim())
                  }
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ส่งแล้ว
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal รายงานปัญหา */}
        {showReportModal && houseToReport && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <h2 className="text-xl font-bold text-orange-600 mb-4">
                รายงานปัญหา / ฝากไว้ก่อน
              </h2>
              <div className="bg-gray-50 p-4 rounded-xl mb-4">
                <p className="font-bold">{houseToReport.full_name}</p>
                <p className="text-sm text-gray-600">{houseToReport.phone}</p>
                <p className="text-xs text-gray-500">{houseToReport.address}</p>
                {houseToReport.quantity && houseToReport.quantity > 1 && (
                  <p className="text-sm font-bold text-purple-600 mt-2">
                    จำนวน: {houseToReport.quantity} ชิ้น
                  </p>
                )}
              </div>
              <textarea
                placeholder="กรอกเหตุผล เช่น ฝากหน้าบ้าน, ลูกค้าไม่อยู่..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 outline-none resize-none"
                autoFocus
              />
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setHouseToReport(null);
                    setReportReason("");
                  }}
                  className="flex-1 py-3 bg-gray-200 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmReport}
                  disabled={!reportReason.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50"
                >
                  รายงานแล้ว
                </button>
              </div>
            </div>
          </div>
        )}

        {showStartModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-purple-600">
                  ตั้งจุดเริ่มต้นทาง
                </h2>
                <button onClick={() => setShowStartModal(false)}>
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              {/* สถานะปัจจุบัน */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm">
                <p className="font-medium mb-2">สถานะปัจจุบัน:</p>
                <p
                  className={
                    isRealTimeMode
                      ? "text-green-600 font-bold"
                      : "text-purple-600 font-bold"
                  }
                >
                  {isRealTimeMode
                    ? "🟢 เรียลไทม์ (ตามตำแหน่งปัจจุบันตลอด)"
                    : "🟣 ค่าคงที่ (จากที่ตั้งไว้)"}
                </p>
                {startPosition && !isRealTimeMode && (
                  <p className="text-xs text-gray-600 mt-1">
                    พิกัด: {startPosition.lat.toFixed(6)},{" "}
                    {startPosition.lng.toFixed(6)}
                  </p>
                )}
              </div>

              {/* ปุ่มตรวจจับตำแหน่งใหม่ */}
              <button
                onClick={() => detectCurrentLocation(false)}
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

              {/* กรอกพิกัดด้วยมือ */}
              <input
                type="text"
                placeholder="พิกัด (lat,lng) เช่น 16.883300,99.125000"
                value={coordInput}
                onChange={(e) => {
                  const value = e.target.value.trim();
                  setCoordInput(value);
                  const [latStr, lngStr] = value.split(",");
                  const lat = parseFloat(latStr?.trim());
                  const lng = parseFloat(lngStr?.trim());
                  if (!isNaN(lat) && !isNaN(lng)) {
                    setDetectedStartLat(lat);
                    setDetectedStartLng(lng);
                  } else if (value === "") {
                    setDetectedStartLat(null);
                    setDetectedStartLng(null);
                  }
                }}
                className="w-full px-4 py-3 border rounded-xl text-center font-mono text-sm mb-3 focus:border-blue-500 outline-none"
              />

              {/* ตรวจสอบบน Maps */}
              {(detectedStartLat || startPosition) && (
                <div className="text-center mb-5">
                  <button
                    onClick={() =>
                      verifyOnMaps(
                        detectedStartLat || startPosition?.lat || 0,
                        detectedStartLng || startPosition?.lng || 0,
                      )
                    }
                    className="text-blue-600 text-sm underline flex items-center gap-1 mx-auto hover:gap-2 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    ตรวจสอบตำแหน่งบน Google Maps
                  </button>
                </div>
              )}

              {/* ปุ่มด้านล่าง */}
              <div className="grid grid-cols-2 gap-3">
                {/* ปุ่มสลับโหมดเรียลไทม์ */}
                <button
                  onClick={() => {
                    setIsRealTimeMode(!isRealTimeMode);
                    if (!isRealTimeMode) {
                      addToast(
                        "เปิดโหมดเรียลไทม์แล้ว (ตาม GPS ตลอด)",
                        "success",
                      );
                      localStorage.removeItem("todayStartPosition");
                      setStartPosition(null);
                    } else {
                      addToast("ปิดโหมดเรียลไทม์ – ใช้ค่าคงที่", "success");
                    }
                    setShowStartModal(false);
                  }}
                  className={`py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                    isRealTimeMode
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : "bg-green-500 text-white hover:bg-green-600"
                  }`}
                >
                  {isRealTimeMode ? <>ปิดเรียลไทม์</> : <>เปิดเรียลไทม์</>}
                </button>

                {/* ปุ่มบันทึกค่าคงที่ */}
                <button
                  onClick={handleSetStartPosition}
                  disabled={
                    isDetecting ||
                    (detectedStartLat === null && detectedStartLng === null)
                  }
                  className="py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50"
                >
                  ตั้งค่าคงที่
                </button>
              </div>

              <p className="text-xs text-center text-gray-500 mt-4">
                {isRealTimeMode
                  ? "ตำแหน่งจะอัปเดตอัตโนมัติตามการเคลื่อนที่"
                  : "ใช้จุดเริ่มต้นคงที่จนกว่าจะเปลี่ยน"}
              </p>
            </div>
          </div>
        )}

        {/* Modal: แก้ไขบ้าน (เวอร์ชันเต็มเหมือนหน้า houses) */}
        {showEditModal && currentHouse && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold">แก้ไขบ้าน</h2>
                <button onClick={() => setShowEditModal(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* ชื่อ-นามสกุล */}
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
                className="w-full px-4 py-3 border rounded-xl mb-3 focus:border-blue-500 outline-none"
              />

              {/* เบอร์โทร */}
              <input
                type="text"
                placeholder="เบอร์โทร"
                value={currentHouse.phone}
                onChange={(e) =>
                  setCurrentHouse({ ...currentHouse, phone: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-xl mb-3 focus:border-blue-500 outline-none"
              />

              {/* ที่อยู่ */}
              <textarea
                placeholder="ที่อยู่"
                value={currentHouse.address}
                onChange={(e) =>
                  setCurrentHouse({ ...currentHouse, address: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-3 border rounded-xl mb-3 resize-none focus:border-blue-500 outline-none"
              />

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  จำนวนชิ้น
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1"
                  value={currentHouse.quantity ?? ""} // สำคัญ: ใช้ ?? "" เพื่อให้ลบได้หมด
                  onChange={(e) => {
                    const value = e.target.value;
                    const num = value === "" ? null : parseInt(value, 10);

                    // อนุญาตให้เป็น null ชั่วคราว (ตอนพิมพ์) และห้ามติดลบ
                    if (num === null || (num >= 1 && !isNaN(num))) {
                      setCurrentHouse({
                        ...currentHouse,
                        quantity: num === null ? undefined : num,
                      });
                    }
                  }}
                  onBlur={() => {
                    // เมื่อเสียโฟกัส ถ้ายังว่างหรือน้อยกว่า 1 → ตั้งเป็น 1 อัตโนมัติ
                    if (!currentHouse.quantity || currentHouse.quantity < 1) {
                      setCurrentHouse({
                        ...currentHouse,
                        quantity: 1,
                      });
                    }
                  }}
                  className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl text-center font-bold text-purple-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              {/* หมายเหตุ */}
              <textarea
                placeholder="หมายเหตุ"
                value={currentHouse.note || ""}
                onChange={(e) =>
                  setCurrentHouse({ ...currentHouse, note: e.target.value })
                }
                rows={2}
                className="w-full px-4 py-3 border rounded-xl mb-4 resize-none focus:border-blue-500 outline-none"
              />

              {/* ปุ่มตรวจจับตำแหน่ง GPS */}
              <button
                onClick={() => detectCurrentLocation(false)}
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

              {/* กรอกพิกัดด้วยมือ */}
              <input
                type="text"
                placeholder="พิกัด (lat,lng) เช่น 16.123456,99.123456"
                value={coordInput}
                onChange={(e) => {
                  setCoordInput(e.target.value);
                  const [latStr, lngStr] = e.target.value.split(",");
                  const lat = parseFloat(latStr?.trim());
                  const lng = parseFloat(lngStr?.trim());
                  if (!isNaN(lat) && !isNaN(lng)) {
                    setCurrentHouse({
                      ...currentHouse,
                      lat,
                      lng,
                    });
                  } else {
                    setCurrentHouse({
                      ...currentHouse,
                      lat: null,
                      lng: null,
                    });
                  }
                }}
                className="w-full px-4 py-3 border rounded-xl text-center font-mono text-sm mb-3"
              />

              {/* แสดงปุ่มตรวจสอบบน Google Maps */}
              {currentHouse.lat && currentHouse.lng && (
                <div className="text-center -mt-1 mb-4">
                  <button
                    onClick={() =>
                      verifyOnMaps(currentHouse.lat!, currentHouse.lng!)
                    }
                    className="text-blue-600 text-xs underline flex items-center gap-1 mx-auto"
                  >
                    <ExternalLink className="w-3 h-3" /> ตรวจสอบบน Google Maps
                  </button>
                </div>
              )}

              {/* ปุ่มบันทึก / ยกเลิก */}
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
      </div>
    </>
  );
}
