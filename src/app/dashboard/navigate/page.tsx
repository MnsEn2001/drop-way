"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  AlertTriangle,
  CheckCircle,
  Edit3,
  ExternalLink, // มาแล้ว!
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
  const [loading, setLoading] = useState(true); // ← ตัวนี้สำคัญ!
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"today" | "delivered">("today");
  const [deliveredHouses, setDeliveredHouses] = useState<any[]>([]);

  // Modal
  const [showStartModal, setShowStartModal] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentHouse, setCurrentHouse] = useState<House | null>(null);
  const [deliverNote, setDeliverNote] = useState("");
  const [houseToDeliver, setHouseToDeliver] = useState<House | null>(null);
  const [filterCoord, setFilterCoord] = useState<"all" | "has" | "none">("all");

  // Start position
  const [startInput, setStartInput] = useState("");
  const [detectedStartLat, setDetectedStartLat] = useState<number | null>(null);
  const [detectedStartLng, setDetectedStartLng] = useState<number | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [coordInput, setCoordInput] = useState("");

  // Toast
  const [toasts, setToasts] = useState<
    { id: string; msg: string; type: "success" | "error" }[]
  >([]);

  const shouldResort = useRef(true);
  const watchId = useRef<number | null>(null);

  const addToast = (msg: string, type: "success" | "error" = "success") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3000,
    );
  };

  // โทรออก
  const callPhone = (phone: string) => {
    window.location.href = `tel:${phone.replace(/[^0-9]/g, "")}`;
  };

  // ลบจาก today_houses (ใช้ id_home)
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

  /// ตัวอย่าง confirmDeliver ที่ใช้ quantity ได้เต็มที่
  const confirmDeliver = async () => {
    if (!houseToDeliver) return;
    const note = deliverNote.trim() || "ส่งแล้ว (ไม่ระบุหมายเหตุ)";
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
        quantity: houseToDeliver.quantity, // ใช้ได้จริง!
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
      setDeliverNote("");
    }
  };

  // แก้ไข → อัปเดตทั้ง houses (คลังหลัก) + today_houses (ทุกคน)
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
      // 1. อัปเดตคลังหลักก่อน (houses)
      if (currentHouse.id_home) {
        const { error: housesError } = await supabase
          .from("houses")
          .update(updates)
          .eq("id", currentHouse.id_home);

        if (housesError) throw housesError;
      }

      // 2. อัปเดต today_houses (ของเรา + ทุกคนที่ใช้บ้านนี้)
      const { error } = await supabase
        .from("today_houses")
        .update(updates)
        .or(`id.eq.${currentHouse.id},id_home.eq.${currentHouse.id_home}`);

      if (error) throw error;

      // อัปเดต UI ทันที
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

  // ดึงข้อมูลวันนี้ (ใช้ RPC)
  const loadTodayHouses = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc(
        "refresh_and_merge_today_houses",
      );
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
      shouldResort.current = true;
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

  // Init + Realtime + GPS
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadTodayHouses(), loadDelivered()]);
      setLoading(false); // ← สำคัญมาก! อย่าลืมอันนี้
    };
    init();

    // Realtime
    const channel = supabase
      .channel("navigate_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "today_houses" },
        () => {
          loadTodayHouses();
          shouldResort.current = true;
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivered_today" },
        loadDelivered,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "houses" },
        loadTodayHouses,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTodayHouses, loadDelivered]);

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
    const origin = startPosition || currentPosition || DEFAULT_POSITION;
    const validHouses = optimizedHouses.filter(
      (h): h is House & { lat: number; lng: number } => !!h.lat && !!h.lng,
    );

    if (validHouses.length === 0) {
      addToast("ไม่มีบ้านที่มีพิกัด", "error");
      return;
    }

    // ถ้าน้อยกว่า 20 จุด → ใช้เส้นทางจริง
    if (validHouses.length <= 20) {
      const coords = [
        `${origin.lat},${origin.lng}`,
        ...validHouses.map((h) => `${h.lat},${h.lng}`),
      ].join("/");
      const url = `https://www.google.com/maps/dir/${coords}`;
      window.open(url, "_blank");
      addToast(`เปิดเส้นทาง ${validHouses.length} จุด`, "success");
    } else {
      // มากกว่า 20 จุด → ใช้ data layer ปักหมุดทั้งหมด + เริ่มจากจุดเริ่มต้น
      const markers = validHouses
        .map((h) => `color:red|${h.lat},${h.lng}`)
        .join("&markers=");

      const url = `https://www.google.com/maps/dir/${origin.lat},${origin.lng}/@${origin.lat},${origin.lng},12z/data=!3m1!4b1!4m2!2m1!6e5&markers=color:blue|${origin.lat},${origin.lng}&${markers}`;

      window.open(url, "_blank");
      addToast(`ปักหมุดทั้งหมด ${validHouses.length} จุดบนแผนที่`, "success");
    }
  };

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
      shouldResort.current = true;
      addToast("ตั้งจุดเริ่มต้นสำเร็จ!", "success");
      setShowStartModal(false);
    } catch (e: any) {
      addToast("เซฟไม่สำเร็จ: " + e.message, "error");
    } finally {
      setIsDetecting(false);
    }
  };

  // ฟังก์ชันตรวจจับตำแหน่ง (เหมือนในหน้า houses)
  const detectCurrentLocation = () => {
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDetectedStartLat(lat);
        setDetectedStartLng(lng);
        setCoordInput(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
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

  // ฟังก์ชันเปิด Google Maps ตรวจสอบพิกัด
  const verifyOnMaps = (lat: number, lng: number) => {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      "_blank",
    );
  };

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

  // สำหรับหน้านำทางวันนี้
  const displayed = useMemo(() => {
    let list = optimizedHouses;

    // ตัวกรองพิกัด
    if (filterCoord === "has") list = list.filter((h) => h.lat && h.lng);
    else if (filterCoord === "none")
      list = list.filter((h) => !h.lat || !h.lng);

    // ค้นหา
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((h) => {
        const text = [
          h.full_name,
          h.phone,
          h.address,
          h.note || "",
          h.quantity?.toString() || "",
          h.lat?.toString() || "",
          h.lng?.toString() || "",
        ]
          .join(" ")
          .toLowerCase();
        return text.includes(q);
      });
    }

    return list;
  }, [optimizedHouses, searchQuery, filterCoord]);

  // สำหรับหน้าส่งแล้ววันนี้
  const displayedDelivered = useMemo(() => {
    if (!searchQuery) return deliveredHouses;

    const q = searchQuery.toLowerCase().trim();
    return deliveredHouses.filter((h: any) => {
      const text = [
        h.full_name,
        h.phone,
        h.address,
        h.delivered_note || "",
        h.note || "",
        h.quantity?.toString() || "",
        formatDeliveredDateTime(h.delivered_at),
      ]
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    });
  }, [deliveredHouses, searchQuery]);

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
        <div className="sticky top-0 bg-white border-b z-40 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4">
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
                </div>
              </div>

              {/* ปุ่มใหญ่ฝั่งขวา (เฉพาะเดสก์ท็อป + เฉพาะวันนี้) */}
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
                    onClick={forceRefreshLocation}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg font-bold shadow"
                  >
                    <RefreshCw className="w-5 h-5" />
                    รีเฟรช
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

            {/* ส่วนใหม่: ปุ่มลบทั้งหมด + ตัวกรอง (เฉพาะวันนี้) + ช่องค้นหา */}
            <div className="space-y-4">
              {/* แถวบน: ปุ่มลบทั้งหมด (ทั้ง 2 แท็บ) */}
              <div className="flex justify-between items-center">
                {(viewMode === "today"
                  ? optimizedHouses.length
                  : deliveredHouses.length) > 0 && (
                  <button
                    onClick={() => {
                      const isToday = viewMode === "today";
                      const count = isToday
                        ? optimizedHouses.length
                        : deliveredHouses.length;
                      if (
                        !confirm(
                          `ลบ${isToday ? "รายการวันนี้" : "รายการส่งแล้ว"}ทั้งหมด ${count} รายการจริงหรือ?\nไม่สามารถกู้คืนได้`,
                        )
                      )
                        return;

                      const deleteAll = async () => {
                        try {
                          if (isToday) {
                            const { error } = await supabase
                              .from("today_houses")
                              .delete()
                              .neq(
                                "id",
                                "00000000-0000-0000-0000-000000000000",
                              );
                            if (error) throw error;
                            setHouses([]);
                            setOptimizedHouses([]);
                            addToast("ลบรายการวันนี้ทั้งหมดแล้ว", "success");
                          } else {
                            const { error } = await supabase
                              .from("delivered_today")
                              .delete()
                              .in(
                                "id",
                                deliveredHouses.map((h) => h.id),
                              );
                            if (error) throw error;
                            setDeliveredHouses([]);
                            addToast("ลบรายการส่งแล้วทั้งหมดแล้ว", "success");
                          }
                        } catch (err: any) {
                          addToast("ลบไม่สำเร็จ: " + err.message, "error");
                        }
                      };
                      deleteAll();
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}

                {/* ตัวกรองพิกัด (เฉพาะวันนี้) */}
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
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                              filterCoord === "all"
                                ? "bg-blue-600 text-white shadow"
                                : "text-gray-600"
                            }`}
                          >
                            ทั้งหมด ({optimizedHouses.length})
                          </button>
                          <button
                            onClick={() => setFilterCoord("has")}
                            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1 transition-all ${
                              filterCoord === "has"
                                ? "bg-green-600 text-white shadow"
                                : "text-gray-600"
                            }`}
                          >
                            <MapPin className="w-4 h-4" />
                            มีพิกัด ({withCoord})
                          </button>
                          <button
                            onClick={() => setFilterCoord("none")}
                            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1 transition-all ${
                              filterCoord === "none"
                                ? "bg-orange-600 text-white shadow"
                                : "text-gray-600"
                            }`}
                          >
                            <AlertTriangle className="w-4 h-4" />
                            ไม่มีพิกัด ({withoutCoord})
                          </button>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* ช่องค้นหา (ใช้ร่วมกันทั้ง 2 แท็บ) */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder={
                    viewMode === "today"
                      ? "ค้นหา ชื่อ, เบอร์, ที่อยู่, หมายเหตุ, จำนวน, พิกัด..."
                      : "ค้นหา ชื่อ, เบอร์, ที่อยู่, หมายเหตุตอนส่ง, เวลา..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 border rounded-xl focus:border-blue-500 outline-none font-medium transition shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* รายการ */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {viewMode === "today" ? (
            optimizedHouses.length === 0 ? (
              <p className="text-center py-20 text-gray-500 text-lg">
                {searchQuery ? "ไม่พบรายการที่ค้นหา" : "ยังไม่มีงานวันนี้"}
              </p>
            ) : (
              optimizedHouses.map((house, idx) => {
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
          ) : (
            // ส่งแล้ววันนี้
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
              </div>
            ))
          )}
        </div>

        {/* Bottom Bar มือถือ */}
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

        {/* Toast */}
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`px-6 py-4 rounded-2xl text-white font-bold shadow-2xl animate-in slide-in-from-bottom ${
                t.type === "success"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600"
                  : "bg-gradient-to-r from-red-500 to-rose-600"
              }`}
            >
              {t.type === "success" ? (
                <CheckCircle className="w-6 h-6 inline mr-2" />
              ) : (
                <AlertTriangle className="w-6 h-6 inline mr-2" />
              )}
              {t.msg}
            </div>
          ))}
        </div>

        {/* Modal: ยืนยันส่งแล้ว */}
        {showDeliverModal && houseToDeliver && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <h2 className="text-xl font-bold text-green-600 mb-4">
                ยืนยันส่งแล้ว
              </h2>
              <div className="bg-gray-50 p-4 rounded-xl mb-4">
                <p className="font-bold">{houseToDeliver.full_name}</p>
                <p className="text-sm text-gray-600">{houseToDeliver.phone}</p>
                <p className="text-xs text-gray-500">
                  {houseToDeliver.address}
                </p>
                {houseToDeliver.quantity && houseToDeliver.quantity > 1 && (
                  <p className="text-sm font-bold text-purple-600 mt-2">
                    จำนวน: {houseToDeliver.quantity} ชิ้น
                  </p>
                )}
              </div>
              <textarea
                placeholder="หมายเหตุตอนส่ง (เช่น ฝากหน้าบ้าน, ลูกค้าไม่อยู่...)"
                value={deliverNote}
                onChange={(e) => setDeliverNote(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border-2 border-green-200 rounded-xl focus:border-green-500 outline-none resize-none"
                autoFocus
              />
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowDeliverModal(false)}
                  className="flex-1 py-3 bg-gray-200 rounded-xl"
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
            </div>
          </div>
        )}

        {/* Modal: ตั้งจุดเริ่มต้น (เวอร์ชันอัปเดตเต็มรูปแบบ) */}
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

              {/* กรอกพิกัดด้วยมือ + แสดงผลทันที */}
              <input
                type="text"
                placeholder="พิกัด (lat,lng) เช่น 16.883300,99.125000"
                value={coordInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setCoordInput(value);

                  const [latStr, lngStr] = value.split(",");
                  const lat = parseFloat(latStr?.trim());
                  const lng = parseFloat(lngStr?.trim());

                  if (!isNaN(lat) && !isNaN(lng)) {
                    setDetectedStartLat(lat);
                    setDetectedStartLng(lng);
                  } else {
                    setDetectedStartLat(null);
                    setDetectedStartLng(null);
                  }
                }}
                className="w-full px-4 py-3 border rounded-xl text-center font-mono text-sm mb-3 focus:border-blue-500 outline-none"
              />

              {/* แสดงพิกัดที่ใช้งานจริง */}
              {detectedStartLat !== null && detectedStartLng !== null && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4">
                  <p className="text-xs text-blue-600 font-medium">
                    พิกัดที่ใช้:
                  </p>
                  <p className="font-mono text-sm font-bold text-blue-800">
                    {detectedStartLat.toFixed(6)}, {detectedStartLng.toFixed(6)}
                  </p>
                </div>
              )}

              {/* ตรวจสอบบน Google Maps */}
              {detectedStartLat !== null && detectedStartLng !== null && (
                <div className="text-center mb-5">
                  <button
                    onClick={() =>
                      verifyOnMaps(detectedStartLat!, detectedStartLng!)
                    }
                    className="text-blue-600 text-sm underline flex items-center gap-1 mx-auto hover:gap-2 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    ตรวจสอบตำแหน่งบน Google Maps
                  </button>
                </div>
              )}

              {/* ปุ่มด้านล่าง */}
              <div className="flex gap-3">
                {/* ปุ่มล้าง / ยกเลิก */}
                <button
                  onClick={() => {
                    if (
                      detectedStartLat !== null ||
                      detectedStartLng !== null
                    ) {
                      // มีการตั้งค่าพิกัด → แสดง "ล้าง"
                      if (
                        confirm(
                          "ล้างพิกัดที่ตั้งไว้ และใช้ตำแหน่งปัจจุบันอัตโนมัติหรือไม่?",
                        )
                      ) {
                        setDetectedStartLat(null);
                        setDetectedStartLng(null);
                        setCoordInput("");
                        // ดึงตำแหน่งจริงทันที
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            const lat = pos.coords.latitude;
                            const lng = pos.coords.longitude;
                            setDetectedStartLat(lat);
                            setDetectedStartLng(lng);
                            setCoordInput(
                              `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                            );
                            addToast("ใช้ตำแหน่งปัจจุบันแล้ว", "success");
                          },
                          () => addToast("ดึงตำแหน่งไม่สำเร็จ", "error"),
                          { enableHighAccuracy: true },
                        );
                      }
                    } else {
                      // ไม่มีพิกัด → ปุ่มเป็น "ยกเลิก"
                      setShowStartModal(false);
                    }
                  }}
                  className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl font-medium transition"
                >
                  {detectedStartLat !== null || detectedStartLng !== null
                    ? "ล้าง"
                    : "ยกเลิก"}
                </button>

                {/* ปุ่มบันทึก */}
                <button
                  onClick={handleSetStartPosition}
                  disabled={
                    isDetecting ||
                    (detectedStartLat === null && detectedStartLng === null)
                  }
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {detectedStartLat === null
                    ? "กำลังตรวจจับ..."
                    : "ตั้งเป็นจุดเริ่มต้น"}
                </button>
              </div>

              {/* ข้อความแจ้ง */}
              {detectedStartLat === null &&
                detectedStartLng === null &&
                !isDetecting && (
                  <p className="text-xs text-center text-gray-500 mt- mt-3">
                    กรุณาตรวจจับหรือกรอกพิกัดก่อนบันทึก
                  </p>
                )}
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

              {/* จำนวนชิ้น */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  จำนวนชิ้น
                </label>
                <input
                  type="number"
                  min="1"
                  value={currentHouse.quantity || 1}
                  onChange={(e) =>
                    setCurrentHouse({
                      ...currentHouse,
                      quantity: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl text-center font-bold text-purple-700"
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
                onClick={detectCurrentLocation}
                disabled={isDetecting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-60 transition mb-3"
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
