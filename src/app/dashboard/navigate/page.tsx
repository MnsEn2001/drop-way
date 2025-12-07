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
  Filter,
  AlertTriangle,
  CheckCircle,
  MapIcon,
  Trash2,
  Clock,
} from "lucide-react";

interface House {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address: string;
  lat: number | null;
  lng: number | null;
  note: string | null;
  order_index: number;
  created_at: string;
  updated_at: string | null;
}

const DEFAULT_POSITION = { lat: 16.8833, lng: 99.125 };

function vincentyDistance(
  φ1: number,
  λ1: number,
  φ2: number,
  λ2: number,
): number {
  const a = 6378137,
    b = 6356752.3142,
    f = 1 / 298.257223563;
  const L = ((λ2 - λ1) * Math.PI) / 180;
  const tanU1 = (1 - f) * Math.tan((φ1 * Math.PI) / 180),
    cosU1 = 1 / Math.sqrt(1 + tanU1 * tanU1),
    sinU1 = tanU1 * cosU1;
  const tanU2 = (1 - f) * Math.tan((φ2 * Math.PI) / 180),
    cosU2 = 1 / Math.sqrt(1 + tanU2 * tanU2),
    sinU2 = tanU2 * cosU2;
  let λ = L,
    λʹ;
  let sinλ, cosλ, sinσ, cosσ, σ, sinα, cosSqα, cos2σₘ, C;
  do {
    sinλ = Math.sin(λ);
    cosλ = Math.cos(λ);
    const sinSqσ =
      (cosU2 * sinλ) ** 2 + (cosU1 * sinU2 - sinU1 * cosU2 * cosλ) ** 2;
    if (sinSqσ === 0) return 0;
    sinσ = Math.sqrt(sinSqσ);
    cosσ = sinU1 * sinU2 + cosU1 * cosU2 * cosλ;
    σ = Math.atan2(sinσ, cosσ);
    sinα = (cosU1 * cosU2 * sinλ) / sinσ;
    cosSqα = 1 - sinα * sinα;
    cos2σₘ = cosσ - (2 * sinU1 * sinU2) / cosSqα;
    C = (f / 16) * cosSqα * (4 + f * (4 - 3 * cosSqα));
    λʹ = λ;
    λ =
      L +
      (1 - C) *
        f *
        sinα *
        (σ + C * sinσ * (cos2σₘ + C * cosσ * (-1 + 2 * cos2σₘ * cos2σₘ)));
  } while (Math.abs(λ - λʹ) > 1e-12);
  const uSq = (cosSqα * (a * a - b * b)) / (b * b);
  const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const Δσ =
    B *
    sinσ *
    (cos2σₘ +
      (B / 4) *
        (cosσ * (-1 + 2 * cos2σₘ * cos2σₘ) -
          (B / 6) *
            cos2σₘ *
            (-3 + 4 * sinσ * sinσ) *
            (-3 + 4 * cos2σₘ * cos2σₘ)));
  return (b * A * (σ - Δσ)) / 1000;
}

function formatThaiShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${d.getFullYear() + 543}`;
}

const extractHouseNumber = (address: string): string => {
  const m = address.match(
    /(?:บ้านเลขที่|เลขที่|ที่\s*)?\s*([\d\/\\-]+)\s*(?:\/\s*\d+)?/i,
  );
  return m ? m[1].trim() : "";
};

export default function NavigatePage() {
  // ──────────────────────── State ────────────────────────
  const [houses, setHouses] = useState<House[]>([]);
  const [reportedHouses, setReportedHouses] = useState<any[]>([]);
  const [pendingDates, setPendingDates] = useState<
    { original_date: string; count: number }[]
  >([]);
  const [currentPosition, setCurrentPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [useManualCurrent, setUseManualCurrent] = useState(false);

  // แยกจุดเริ่มต้นตามแถบ
  const [todayStartPosition, setTodayStartPosition] = useState<{
    lat: number;
    lng: number;
    name?: string;
  } | null>(null);
  const [reportedStartPosition, setReportedStartPosition] = useState<{
    lat: number;
    lng: number;
    name?: string;
  } | null>(null);

  const [sorting, setSorting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"today" | "reported">("today");

  // Modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // รายงาน
  const [reportingHouse, setReportingHouse] = useState<House | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  // กรอง
  const [reportReasonFilter, setReportReasonFilter] = useState<string>("");
  const reportReasons = [
    "โทรไม่รับ",
    "ไม่อยู่บ้าน",
    "เบอร์ติดต่อไม่ได้",
    "ที่อยู่ไม่ถูกต้อง",
    "ปฏิเสธรับสินค้า",
    "อื่นๆ",
  ];

  // Manual coord
  const [manualCoordInput, setManualCoordInput] = useState("");
  const [startCoordInput, setStartCoordInput] = useState("");
  const [startNameInput, setStartNameInput] = useState("");
  const [detectedLat, setDetectedLat] = useState<number | null>(null);
  const [detectedLng, setDetectedLng] = useState<number | null>(null);
  const [detectedStartLat, setDetectedStartLat] = useState<number | null>(null);
  const [detectedStartLng, setDetectedStartLng] = useState<number | null>(null);

  // Filters
  const [houseNumberFilter, setHouseNumberFilter] = useState("");
  const [showNoCoords, setShowNoCoords] = useState(false);
  const [showWithCoords, setShowWithCoords] = useState(false);
  const [groupByHouseNumber, setGroupByHouseNumber] = useState(false);
  const [groupNearbyHouses, setGroupNearbyHouses] = useState(false);

  // สำหรับ modal จุดเริ่มต้น (รู้ว่าเปิดจากแถบไหน)
  const [startPositionModalType, setStartPositionModalType] = useState<
    "today" | "reported" | null
  >(null);

  // Refs
  const shouldResortRef = useRef(false);
  const isSortingRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);

  // ──────────────────────── Computed ────────────────────────
  const activeStartPosition =
    activeTab === "today" ? todayStartPosition : reportedStartPosition;

  const totalPending = useMemo(
    () => pendingDates.reduce((s, i) => s + i.count, 0),
    [pendingDates],
  );

  const { filteredHouses, filterDescription } = useMemo(() => {
    let result = houses;
    if (houseNumberFilter.trim()) {
      result = result.filter((h) =>
        extractHouseNumber(h.address)
          .toLowerCase()
          .includes(houseNumberFilter.trim().toLowerCase()),
      );
    }
    if (showNoCoords && !showWithCoords)
      result = result.filter((h) => !h.lat || !h.lng);
    else if (showWithCoords && !showNoCoords)
      result = result.filter((h) => h.lat && h.lng);
    if (groupByHouseNumber) {
      result = [...result].sort((a, b) => {
        const ha = extractHouseNumber(a.address);
        const hb = extractHouseNumber(b.address);
        if (ha && hb)
          return ha === hb
            ? a.order_index - b.order_index
            : ha.localeCompare(hb, undefined, { numeric: true });
        return ha ? -1 : hb ? 1 : 0;
      });
    }
    const count = result.length;
    let desc = `ทั้งหมด ${count} บ้าน`;
    if (showNoCoords && !showWithCoords) desc = `ไม่มีพิกัด • ${count} บ้าน`;
    else if (showWithCoords && !showNoCoords) desc = `มีพิกัด • ${count} บ้าน`;
    else if (houseNumberFilter.trim())
      desc = `บ้านเลขที่ "${houseNumberFilter.trim()}" • ${count} บ้าน`;
    return { filteredHouses: result, filterDescription: desc };
  }, [
    houses,
    houseNumberFilter,
    showNoCoords,
    showWithCoords,
    groupByHouseNumber,
  ]);

  const isUsingDefault =
    !currentPosition ||
    (Math.abs(currentPosition.lat - DEFAULT_POSITION.lat) < 0.001 &&
      Math.abs(currentPosition.lng - DEFAULT_POSITION.lng) < 0.001);

  const displayedHouses = useMemo(() => {
    return filteredHouses.filter((h) =>
      searchQuery
        ? h.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (h.phone ?? "").includes(searchQuery) ||
          h.address?.toLowerCase().includes(searchQuery.toLowerCase())
        : true,
    );
  }, [filteredHouses, searchQuery]);

  const filteredReportedHouses = useMemo(() => {
    return reportedHouses.filter((h: any) => {
      const matchesSearch =
        searchQuery === "" ||
        h.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.phone ?? "").includes(searchQuery) ||
        h.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.report_reason ?? "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesFilter =
        reportReasonFilter === "" || h.report_reason === reportReasonFilter;

      return matchesSearch && matchesFilter;
    });
  }, [reportedHouses, searchQuery, reportReasonFilter]);

  // ──────────────────────── Toast ────────────────────────
  const addToast = (
    msg: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const el = document.createElement("div");
    el.className = `flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium animate-in slide-in-from-top ${
      type === "success"
        ? "bg-green-600"
        : type === "error"
          ? "bg-red-600"
          : "bg-blue-600"
    }`;
    el.innerHTML = `<span class="font-bold">${
      type === "success" ? "สำเร็จ" : type === "error" ? "ผิดพลาด" : "แจ้ง"
    }</span> ${msg}`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  };

  // ──────────────────────── Core Functions ────────────────────────
  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      addToast("คัดลอกเบอร์แล้ว", "success");
    } catch {
      addToast("คัดลอกไม่สำเร็จ", "error");
    }
  };

  const detectLocation = async (forStart = false) => {
    if (!navigator.geolocation) {
      addToast("เบราว์เซอร์ไม่รองรับ GPS", "error");
      return;
    }

    addToast("กำลังหาตำแหน่งของคุณ...", "info");

    // วนลูปจนกว่าจะได้ตำแหน่ง หรือผู้ใช้ยกเลิก
    let attempts = 0;
    const maxAttempts = 5; // ลองสูงสุด 5 ครั้ง

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const pos = await new Promise<{ lat: number; lng: number }>(
          (resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error("timeout"));
            }, 12000); // รอสูงสุด 12 วินาทีต่อครั้ง

            navigator.geolocation.getCurrentPosition(
              (position) => {
                clearTimeout(timeoutId);
                resolve({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                });
              },
              (err) => {
                clearTimeout(timeoutId);
                reject(err);
              },
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000, // ใช้ตำแหน่งเก่าได้ถ้าอายุไม่เกิน 1 นาที
              },
            );
          },
        );

        // สำเร็จแล้ว!
        if (forStart) {
          setDetectedStartLat(pos.lat);
          setDetectedStartLng(pos.lng);
          setStartCoordInput(`${pos.lat.toFixed(6)},${pos.lng.toFixed(6)}`);
        } else {
          setDetectedLat(pos.lat);
          setDetectedLng(pos.lng);
          setManualCoordInput(`${pos.lat.toFixed(6)},${pos.lng.toFixed(6)}`);
        }

        addToast(`ตรวจจับตำแหน่งสำเร็จ! (ครั้งที่ ${attempts})`, "success");
        return;
      } catch (err: any) {
        // ถ้ายังไม่ถึงครั้งสุดท้าย → รอ 2 วินาทีแล้วลองใหม่
        if (attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 2000));
          addToast(`กำลังลองครั้งที่ ${attempts + 1}...`, "info");
        } else {
          // ครั้งสุดท้ายแล้วยังไม่ได้
          addToast(
            "ไม่สามารถหาตำแหน่งได้ กรุณาเปิด GPS แล้วลองอีกครั้ง",
            "error",
          );
        }
      }
    }
  };

  const validateCoords = (lat: number, lng: number) =>
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

  const setManualPosition = () => {
    if (
      !detectedLat ||
      !detectedLng ||
      !validateCoords(detectedLat, detectedLng)
    )
      return addToast("พิกัดไม่ถูกต้อง", "error");
    setCurrentPosition({ lat: detectedLat, lng: detectedLng });
    setUseManualCurrent(true);
    setShowManualModal(false);
    addToast("ใช้พิกัด manual แล้ว", "success");
    shouldResortRef.current = true;
  };

  const handleSetStartPosition = async () => {
    if (
      !detectedStartLat ||
      !detectedStartLng ||
      !validateCoords(detectedStartLat, detectedStartLng)
    )
      return addToast("พิกัดไม่ถูกต้อง", "error");

    const name = startNameInput || "จุดเริ่มต้น";
    const newPos = { lat: detectedStartLat, lng: detectedStartLng, name };

    try {
      if (startPositionModalType === "today") {
        await supabase.rpc("save_start_position", {
          p_lat: detectedStartLat,
          p_lng: detectedStartLng,
          p_name: startNameInput || undefined,
        });
        setTodayStartPosition(newPos);
        localStorage.setItem("todayStartPosition", JSON.stringify(newPos));
      } else {
        setReportedStartPosition(newPos);
        localStorage.setItem("reportedStartPosition", JSON.stringify(newPos));
      }

      addToast(
        `ตั้งจุดเริ่มต้น${startPositionModalType === "today" ? "วันนี้" : "รายงานแล้ว"}แล้ว`,
        "success",
      );
      setShowStartModal(false);
      setStartNameInput("");
      shouldResortRef.current = true;
    } catch (e: any) {
      addToast(`บันทึกไม่สำเร็จ: ${e.message}`, "error");
    }
  };

  const clearStartPosition = async () => {
    if (startPositionModalType === "today") {
      await supabase.rpc("clear_start_position");
      localStorage.removeItem("todayStartPosition");
      setTodayStartPosition(null);
    } else {
      localStorage.removeItem("reportedStartPosition");
      setReportedStartPosition(null);
    }
    addToast("ล้างจุดเริ่มต้นแล้ว", "success");
    shouldResortRef.current = true;
  };

  const loadStartPosition = useCallback(async () => {
    try {
      const { data } = await supabase.rpc("get_start_position");
      const sp = data?.[0] || null;
      if (sp) {
        setTodayStartPosition({
          lat: sp.lat,
          lng: sp.lng,
          name: sp.name || undefined,
        });
      } else {
        const saved = localStorage.getItem("todayStartPosition");
        if (saved) setTodayStartPosition(JSON.parse(saved));
      }

      const savedReported = localStorage.getItem("reportedStartPosition");
      if (savedReported) setReportedStartPosition(JSON.parse(savedReported));

      shouldResortRef.current = true;
    } catch {}
  }, []);

  const distanceCache = useMemo(() => new Map<string, number>(), []);
  const calculateDistance = useCallback(
    (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const key = `${lat1.toFixed(6)},${lng1.toFixed(6)},${lat2.toFixed(6)},${lng2.toFixed(6)}`;
      if (distanceCache.has(key)) return distanceCache.get(key)!;
      const d = vincentyDistance(lat1, lng1, lat2, lng2);
      distanceCache.set(key, d);
      return d;
    },
    [distanceCache],
  );

  const refreshData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data } = await supabase.rpc("refresh_and_merge_today_houses");
      setHouses(
        (data || []).map((h: any) => ({
          id: h.id,
          user_id: h.user_id,
          full_name: h.full_name || "",
          phone: h.phone || "", // ← บังคับเป็น string ว่างถ้า null
          address: h.address || "",
          lat: h.lat ? Number(h.lat) : null,
          lng: h.lng ? Number(h.lng) : null,
          note: h.note ?? null,
          order_index: Number(h.order_index),
          created_at: h.created_at,
          updated_at: h.updated_at,
        })),
      );
    } catch {}

    try {
      const { data: pending } = await supabase
        .from("pending_houses")
        .select("original_date")
        .eq("user_id", user.id);
      const map = new Map<string, number>();
      pending?.forEach((r: any) =>
        map.set(r.original_date, (map.get(r.original_date) || 0) + 1),
      );
      setPendingDates(
        Array.from(map.entries())
          .map(([d, c]) => ({ original_date: d, count: c }))
          .sort(
            (a, b) =>
              new Date(a.original_date).getTime() -
              new Date(b.original_date).getTime(),
          ),
      );
    } catch {}

    await loadReportedHouses();
    shouldResortRef.current = true;
  }, []);

  const loadReportedHouses = async () => {
    try {
      const { data } = await supabase
        .from("reported_houses")
        .select("*")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .order("reported_at", { ascending: false });
      setReportedHouses(
        (data || []).map((h: any) => ({
          ...h,
          full_name: h.full_name || "",
          phone: h.phone || "",
          address: h.address || "",
          report_reason: h.report_reason || "",
        })),
      );
    } catch (err) {
      console.error("Error loading reported houses:", err);
    }
  };

  const reportHouse = async () => {
    if (!reportingHouse) return;
    if (!reportReason && !customReason)
      return addToast("กรุณาเลือกหรือกรอกเหตุผล", "error");

    const reason =
      reportReason === "อื่นๆ" ? customReason.trim() : reportReason;
    if (reportReason === "อื่นๆ" && !reason)
      return addToast("กรุณากรอกเหตุผลเมื่อเลือก 'อื่นๆ'", "error");

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("ไม่พบผู้ใช้");

      await supabase.from("reported_houses").insert({
        user_id: user.id,
        full_name: reportingHouse.full_name,
        phone: reportingHouse.phone,
        address: reportingHouse.address,
        lat: reportingHouse.lat,
        lng: reportingHouse.lng,
        note: reportingHouse.note,
        report_reason: reason,
      });

      await supabase.from("today_houses").delete().eq("id", reportingHouse.id);

      addToast("รายงานสำเร็จ", "success");

      // ดึงข้อมูลใหม่ทั้งหมด + เรียงลำดับใหม่ทันที
      await refreshData();

      if (activeTab === "reported") {
        await loadReportedHouses();
      }

      shouldResortRef.current = true; // ตัวนี้จะทำงานทันที
    } catch (err) {
      console.error(err);
      addToast("รายงานไม่สำเร็จ", "error");
    } finally {
      setShowReportModal(false);
      setReportingHouse(null);
      setReportReason("");
      setCustomReason("");
    }
  };

  const reSortHouses = useCallback(async () => {
    const housesToSort = activeTab === "today" ? houses : reportedHouses;
    if (housesToSort.length === 0 || isSortingRef.current) return;

    const origin = activeStartPosition || currentPosition || DEFAULT_POSITION;
    isSortingRef.current = true;

    const withCoords = housesToSort.filter((h: any) => h.lat && h.lng);
    const without = housesToSort.filter((h: any) => !h.lat || !h.lng);

    let sorted = withCoords
      .map((h: any) => ({
        ...h,
        dist: calculateDistance(origin.lat, origin.lng, h.lat, h.lng),
      }))
      .sort((a: any, b: any) => a.dist - b.dist);

    if (groupNearbyHouses && sorted.length > 1) {
      const clusters: (typeof sorted)[] = [];
      const used = new Set<number>();
      const threshold = 0.5;
      for (let i = 0; i < sorted.length; i++) {
        if (used.has(i)) continue;
        const cluster = [sorted[i]];
        used.add(i);
        for (let j = i + 1; j < sorted.length; j++) {
          if (used.has(j)) continue;
          const d = calculateDistance(
            sorted[i].lat,
            sorted[i].lng,
            sorted[j].lat,
            sorted[j].lng,
          );
          if (d <= threshold) {
            cluster.push(sorted[j]);
            used.add(j);
          }
        }
        clusters.push(cluster);
      }
      clusters.sort((a, b) => a[0].dist - b[0].dist);
      sorted = clusters.flat();
    }

    const final = [
      ...sorted,
      ...without.sort((a: any, b: any) =>
        (a.report_reason || "").localeCompare(b.report_reason || ""),
      ),
    ];

    // สำคัญ: ใช้ requestAnimationFrame เพื่อป้องกัน loop
    requestAnimationFrame(() => {
      if (activeTab === "today") {
        Promise.all(
          final.map((h, i) =>
            supabase
              .from("today_houses")
              .update({ order_index: i + 1 })
              .eq("id", h.id),
          ),
        )
          .then(() => {
            setHouses(final);
          })
          .catch(() => {
            addToast("เรียงลำดับวันนี้ไม่สำเร็จ", "error");
          });
      } else {
        setReportedHouses(final); // ปลอดภัยแล้ว เพราะอยู่ใน requestAnimationFrame
      }
      isSortingRef.current = false;
    });
  }, [
    activeTab,
    houses,
    reportedHouses,
    activeStartPosition,
    currentPosition,
    calculateDistance,
    groupNearbyHouses,
  ]);

  const openFullRouteOnMaps = useCallback(() => {
    const origin = activeStartPosition || currentPosition || DEFAULT_POSITION;
    const housesToUse = activeTab === "today" ? houses : reportedHouses;

    const valid = housesToUse
      .filter((h: any) => h.lat && h.lng)
      .map((h: any) => ({
        ...h,
        dist: calculateDistance(origin.lat, origin.lng, h.lat, h.lng),
      }))
      .sort((a: any, b: any) => a.dist - b.dist)
      .slice(0, 20);

    if (valid.length === 0) return addToast("ไม่มีบ้านที่มีพิกัด", "error");

    const points = [
      origin,
      ...valid.map((h: any) => ({ lat: h.lat, lng: h.lng })),
    ];
    const url = `https://www.google.com/maps/dir/${points.map((p) => `${p.lat},${p.lng}`).join("/")}`;
    window.open(url, "_blank");
    addToast(
      `เปิดเส้นทาง ${valid.length} จุด (${activeTab === "today" ? "วันนี้" : "รายงานแล้ว"})`,
      "success",
    );
  }, [
    activeTab,
    houses,
    reportedHouses,
    activeStartPosition,
    currentPosition,
    calculateDistance,
  ]);

  const markDelivered = async (id: string) => {
    if (!confirm("ยืนยันส่งแล้ว?")) return;

    try {
      const { error } = await supabase
        .from("today_houses")
        .delete()
        .eq("id", id);

      if (error) throw error;

      addToast("ส่งแล้ว ลบสำเร็จ", "success");

      // ดึงข้อมูลใหม่ + เรียงลำดับใหม่ทันที
      await refreshData();
      shouldResortRef.current = true; // จะถูกจับโดย useEffect ข้างบน
    } catch (err) {
      addToast("เกิดข้อผิดพลาด ไม่สามารถลบได้", "error");
    }
  };

  const openMaps = (lat: number, lng: number) => {
    const origin = activeStartPosition || currentPosition || DEFAULT_POSITION;
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${lat},${lng}&travelmode=driving`,
      "_blank",
    );
  };

  const forceRefreshLocationAndSort = async () => {
    setSorting(true);
    try {
      const pos = await new Promise<{ lat: number; lng: number }>(
        (res, rej) => {
          navigator.geolocation.getCurrentPosition(
            (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
            rej,
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0,
            },
          );
        },
      );
      setCurrentPosition(pos);
      setUseManualCurrent(false);
      addToast("รีเฟรช GPS สำเร็จ", "success");
      shouldResortRef.current = true;
    } catch {
      addToast("รีเฟรชไม่สำเร็จ", "error");
    } finally {
      setSorting(false);
    }
  };

  const deleteAllInCurrentTab = async () => {
    if (
      !confirm(
        `คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลทั้งหมดในแท็บ "${activeTab === "today" ? "วันนี้" : "รายงานแล้ว"}"?`,
      )
    )
      return;

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("ไม่พบผู้ใช้");

      if (activeTab === "today") {
        await supabase.from("today_houses").delete().eq("user_id", userId);
        addToast("ลบงานวันนี้ทั้งหมดแล้ว", "success");
      } else {
        await supabase.from("reported_houses").delete().eq("user_id", userId);
        setReportedHouses([]);
        addToast("ลบรายงานทั้งหมดแล้ว", "success");
      }
      window.location.reload();
    } catch (err: any) {
      addToast(`ลบไม่สำเร็จ: ${err.message || "กรุณาลองใหม่"}`, "error");
    }
  };

  const deleteReportedHouse = async (id: string) => {
    if (!confirm("ยืนยันลบรายการนี้?")) return;
    try {
      await supabase.from("reported_houses").delete().eq("id", id);
      setReportedHouses((prev) => prev.filter((h) => h.id !== id));
      addToast("ลบรายการสำเร็จ", "success");
    } catch {
      addToast("ลบไม่สำเร็จ", "error");
    }
  };

  // ──────────────────────── Effects ────────────────────────
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      await refreshData();
      await loadStartPosition();
      try {
        const pos = await new Promise<{ lat: number; lng: number }>(
          (res, rej) => {
            navigator.geolocation.getCurrentPosition(
              (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
              rej,
              {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 10000,
              },
            );
          },
        );
        if (mounted) setCurrentPosition(pos);
      } catch {
        if (mounted) setCurrentPosition(DEFAULT_POSITION);
      }
      if (mounted) setLoading(false);
      shouldResortRef.current = true;
    };
    init();

    if ("geolocation" in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (!useManualCurrent) {
            setCurrentPosition({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
            shouldResortRef.current = true;
          }
        },
        () => {},
        { enableHighAccuracy: true },
      );
    }

    return () => {
      mounted = false;
      if (watchIdRef.current)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [refreshData, loadStartPosition]);

  useEffect(() => {
    if (activeTab === "reported") loadReportedHouses();
  }, [activeTab]);

  // ตัวนี้เก็บไว้ตัวเดียวก็พอ (ดีเลย์ 150ms ให้ state อัปเดตก่อน)
  useEffect(() => {
    if (shouldResortRef.current && !loading && !isSortingRef.current) {
      shouldResortRef.current = false;
      const timer = setTimeout(() => {
        reSortHouses();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [
    shouldResortRef.current,
    loading,
    isSortingRef.current,
    houses,
    reportedHouses,
    currentPosition,
    activeStartPosition,
    reSortHouses,
  ]);

  // ──────────────────────── Render ────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-24 py-0 lg:pb-8 text-gray-800">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-40 shadow">
          <div className="max-w-7xl mx-auto px-4 pt-3 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">นำทางวันนี้</h1>
                <p className="text-base font-semibold text-indigo-600">
                  {activeTab === "today"
                    ? filterDescription
                    : `รายงานแล้ว ${filteredReportedHouses.length} รายการ`}
                </p>
                {activeTab === "today" && totalPending > 0 && (
                  <button
                    onClick={() => setShowPendingModal(true)}
                    className="text-sm text-blue-600 underline"
                  >
                    ดึงงานค้าง {totalPending} รายการ
                  </button>
                )}
              </div>
              <div className="hidden lg:flex items-center gap-3">
                <button
                  onClick={() => {
                    setStartPositionModalType(activeTab);
                    setShowStartModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg"
                >
                  <Flag className="w-5 h-5" />{" "}
                  {activeStartPosition ? "แก้จุดเริ่ม" : "จุดเริ่ม"}
                </button>
                <button
                  onClick={forceRefreshLocationAndSort}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg font-bold"
                >
                  <RefreshCw
                    className={`w-5 h-5 ${sorting ? "animate-spin" : ""}`}
                  />{" "}
                  รีเฟรช
                </button>
                <button
                  onClick={openFullRouteOnMaps}
                  className="flex items-center gap-2 px-5 py-2 bg-linear-to-r from-orange-600 to-red-600 text-white font-bold rounded-lg"
                >
                  <MapIcon className="w-5 h-5" /> เส้นทางทั้งหมด
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={deleteAllInCurrentTab}
                className="p-2 bg-red-100 hover:bg-red-200 rounded-lg transition"
              >
                <Trash2 className="w-6 h-6 text-red-700" />
              </button>

              <div className="relative flex-1 text-gray-800">
                {/* ไอคอนค้นหา */}
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />

                <input
                  type="text"
                  placeholder={`ค้นหา ${activeTab === "today" ? "ชื่อ, เบอร์, ที่อยู่" : "ชื่อ, เบอร์, ที่อยู่, เหตุผล"}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-14 py-3 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition font-medium"
                />

                {/* ปุ่ม X ล้างข้อความ (แสดงเฉพาะตอนพิมพ์แล้ว) */}
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-12 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-200 transition-colors"
                    title="ล้างการค้นหา"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                )}

                {/* ปุ่มกรอง */}
                <button
                  onClick={() => setShowFilterModal(true)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  <Filter className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Warning GPS */}
        {activeTab === "today" && isUsingDefault && !todayStartPosition && (
          <div className="max-w-7xl mx-auto px-4 mt-4">
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex justify-between items-center">
              <span>กำลังรอ GPS...</span>
              <button
                onClick={() => setShowManualModal(true)}
                className="underline font-medium"
              >
                ตั้งตำแหน่งเอง
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("today")}
              className={`flex-1 py-2 rounded-md font-medium text-sm transition ${activeTab === "today" ? "bg-white shadow text-indigo-600" : "text-gray-600"}`}
            >
              วันนี้ ( {displayedHouses.length} )
            </button>
            <button
              onClick={() => setActiveTab("reported")}
              className={`flex-1 py-2 rounded-md font-medium text-sm transition ${activeTab === "reported" ? "bg-white shadow text-red-600" : "text-gray-600"}`}
            >
              รายงานแล้ว ( {filteredReportedHouses.length} )
            </button>
          </div>
        </div>

        {/* ==================== Content ==================== */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {activeTab === "today" ? (
            // ─────────────── แถบ วันนี้ ───────────────
            displayedHouses.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                ยังไม่มีรายการวันนี้
              </div>
            ) : (
              displayedHouses.map((house) => {
                const origin =
                  activeStartPosition || currentPosition || DEFAULT_POSITION;
                const distance =
                  house.lat && house.lng
                    ? calculateDistance(
                        origin.lat,
                        origin.lng,
                        house.lat!,
                        house.lng!,
                      )
                    : null;

                return (
                  <div
                    key={house.id}
                    className="group relative bg-white rounded-2xl shadow hover:shadow-xl border overflow-hidden transition-all duration-300 mb-4"
                  >
                    {/* ปุ่มรายงานปัญหา */}
                    <button
                      onClick={() => {
                        setReportingHouse(house);
                        setShowReportModal(true);
                      }}
                      className="absolute top-3 right-3 z-20 bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-full shadow-lg"
                    >
                      <AlertTriangle className="w-5 h-5" />
                    </button>

                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl font-bold text-indigo-600">
                          #{house.order_index}
                        </span>
                        <h3 className="font-bold text-lg truncate">
                          {house.full_name}
                        </h3>
                      </div>

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

                      {house.note?.trim() && (
                        <p className="text-xs text-amber-700 mt-1 italic">
                          หมายเหตุ: {house.note.trim()}
                        </p>
                      )}

                      {distance !== null && (
                        <p className="text-xs text-gray-500 mt-2">
                          ~ ระยะทางโดยประมาณ{" "}
                          <span className="text-blue-500 font-semibold">
                            {distance.toFixed(1)}
                          </span>{" "}
                          กม.
                        </p>
                      )}
                    </div>

                    <div className="px-5 pb-5 flex gap-3">
                      {house.lat && house.lng ? (
                        <button
                          onClick={() => openMaps(house.lat!, house.lng!)}
                          className="flex-1 py-3 bg-linear-to-r from-emerald-600 to-green-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2"
                        >
                          <Navigation className="w-5 h-5" /> นำทาง
                        </button>
                      ) : (
                        <div className="flex-1 py-3 text-center bg-gray-100 rounded-xl text-sm text-gray-500">
                          ไม่มีพิกัด
                        </div>
                      )}

                      <button
                        onClick={() => markDelivered(house.id)}
                        className="flex-1 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-sm"
                      >
                        <CheckCircle className="w-5 h-5 inline mr-1" /> ส่งแล้ว
                      </button>
                    </div>
                  </div>
                );
              })
            )
          ) : // ─────────────── แถบ รายงานแล้ว ───────────────
          filteredReportedHouses.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchQuery || reportReasonFilter
                ? "ไม่พบข้อมูลที่ตรงกับการค้นหา"
                : "ยังไม่มีรายการที่รายงาน"}
            </div>
          ) : (
            filteredReportedHouses.map((house: any) => {
              const origin =
                activeStartPosition || currentPosition || DEFAULT_POSITION;
              const distance =
                house.lat && house.lng
                  ? calculateDistance(
                      origin.lat,
                      origin.lng,
                      house.lat,
                      house.lng,
                    )
                  : null;

              const reportedDate = new Date(house.reported_at);
              const timeStr = reportedDate.toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
              const dateStr = formatThaiShortDate(house.reported_at);

              return (
                <div
                  key={house.id}
                  className="relative bg-white rounded-2xl shadow hover:shadow-xl border border-red-200 overflow-hidden mb-4 transition-all duration-300"
                >
                  {/* ปุ่มลบ */}
                  <button
                    onClick={() => deleteReportedHouse(house.id)}
                    className="absolute top-3 right-3 z-20 bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-full shadow-lg transition"
                    title="ลบรายการนี้"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>

                  <div className="p-5 pr-16">
                    <h3 className="font-bold text-lg">{house.full_name}</h3>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-600">
                        {house.phone}
                      </span>
                      <button onClick={() => copyPhone(house.phone)}>
                        <Copy className="w-4 h-4 text-gray-500 hover:text-gray-700 transition" />
                      </button>
                    </div>

                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                      {house.address}
                    </p>

                    {house.note?.trim() && (
                      <p className="text-xs text-amber-700 mt-1 italic">
                        หมายเหตุ: {house.note.trim()}
                      </p>
                    )}

                    {distance !== null && (
                      <p className="text-xs text-gray-500 mt-2">
                        ~ ระยะทางโดยประมาณ{" "}
                        <span className="text-blue-500 font-semibold">
                          {distance.toFixed(1)}
                        </span>{" "}
                        กม.
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-medium text-blue-700">
                        รายงานเมื่อ: {timeStr} น. | {dateStr}
                      </p>
                    </div>

                    <p className="mt-3 text-sm font-bold text-red-600 bg-red-50 px-4 py-2 rounded-lg inline-block">
                      {house.report_reason}
                    </p>
                  </div>

                  {house.lat && house.lng && (
                    <div className="px-5 pb-5">
                      <button
                        onClick={() => openMaps(house.lat, house.lng)}
                        className="w-full py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl text-sm flex items-center justify-center gap-2 transition"
                      >
                        <Navigation className="w-5 h-5" /> เปิดใน Google Maps
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Mobile Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t lg:hidden z-50">
          <div className="flex justify-around py-3">
            <button
              onClick={() => {
                setStartPositionModalType(activeTab);
                setShowStartModal(true);
              }}
              className="flex flex-col items-center gap-1"
            >
              <Flag
                className={`w-7 h-7 ${activeStartPosition ? "text-green-600" : "text-gray-600"}`}
              />
              <span className="text-xs">
                {activeStartPosition ? "แก้จุดเริ่ม" : "จุดเริ่ม"}
              </span>
            </button>
            <button
              onClick={forceRefreshLocationAndSort}
              className="flex flex-col items-center gap-1"
            >
              <RefreshCw
                className={`w-8 h-8 text-yellow-600 ${sorting ? "animate-spin" : ""}`}
              />
              <span className="text-xs">รีเฟรช</span>
            </button>
            <button
              onClick={openFullRouteOnMaps}
              className="flex flex-col items-center gap-1"
            >
              <MapIcon className="w-8 h-8 text-red-600" />
              <span className="text-xs">เส้นทางทั้งหมด</span>
            </button>
          </div>
        </div>

        <div
          id="toast-container"
          className="fixed top-16 left-4 right-4 z-50 space-y-2"
        />
        {/* ==================== Modal รายงานปัญหา ==================== */}
        {showReportModal && reportingHouse && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-red-600">รายงานปัญหา</h2>
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setReportingHouse(null);
                    setReportReason("");
                    setCustomReason("");
                  }}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="font-medium mb-4">
                {reportingHouse.full_name} — {reportingHouse.phone}
              </p>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl mb-3"
              >
                <option value="">เลือกเหตุผล</option>
                {reportReasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {reportReason === "อื่นๆ" && (
                <input
                  type="text"
                  placeholder="พิมพ์เหตุผล..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl mb-4"
                />
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setReportingHouse(null);
                    setReportReason("");
                    setCustomReason("");
                  }}
                  className="flex-1 py-3 bg-gray-200 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={reportHouse}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold"
                >
                  ยืนยันรายงาน
                </button>
              </div>
            </div>
          </div>
        )}
        {/* ==================== Modal กรอง (ใช้ได้ทั้ง 2 แท็บ) ==================== */}
        {showFilterModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full text-gray-800">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold">ตัวกรอง</h2>
                <button onClick={() => setShowFilterModal(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              {activeTab === "today" ? (
                <>
                  <input
                    type="text"
                    placeholder="บ้านเลขที่..."
                    value={houseNumberFilter}
                    onChange={(e) => setHouseNumberFilter(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-amber-300 rounded-xl mb-4"
                  />
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={showNoCoords}
                        onChange={(e) => {
                          setShowNoCoords(e.target.checked);
                          setShowWithCoords(false);
                        }}
                        className="w-5 h-5"
                      />
                      <span>ไม่มีพิกัด</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={showWithCoords}
                        onChange={(e) => {
                          setShowWithCoords(e.target.checked);
                          setShowNoCoords(false);
                        }}
                        className="w-5 h-5"
                      />
                      <span>มีพิกัดแล้ว</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={groupByHouseNumber}
                        onChange={(e) =>
                          setGroupByHouseNumber(e.target.checked)
                        }
                        className="w-5 h-5"
                      />
                      <span>จัดกลุ่มตามบ้านเลขที่</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={groupNearbyHouses}
                        onChange={(e) => {
                          setGroupNearbyHouses(e.target.checked);
                          shouldResortRef.current = true;
                        }}
                        className="w-5 h-5"
                      />
                      <span>จัดกลุ่มบ้านใกล้กัน (500ม.)</span>
                    </label>
                  </div>
                </>
              ) : (
                <select
                  value={reportReasonFilter}
                  onChange={(e) => setReportReasonFilter(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl"
                >
                  <option value="">ทุกเหตุผล</option>
                  {reportReasons.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    if (activeTab === "today") {
                      setHouseNumberFilter("");
                      setShowNoCoords(false);
                      setShowWithCoords(false);
                      setGroupByHouseNumber(false);
                    } else {
                      setReportReasonFilter("");
                    }
                    setShowFilterModal(false);
                  }}
                  className="flex-1 py-3 bg-gray-200 rounded-xl"
                >
                  ล้าง
                </button>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
                >
                  ใช้ตัวกรอง
                </button>
              </div>
            </div>
          </div>
        )}
        {showPendingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-96 overflow-y-auto">
              <div className="flex justify-between items-center mb-4 sticky top-0 bg-white">
                <h2 className="text-xl font-bold">งานค้าง</h2>
                <button onClick={() => setShowPendingModal(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              {pendingDates.length === 0 ? (
                <p className="text-center py-8 text-gray-500">ไม่มีงานค้าง</p>
              ) : (
                pendingDates.map((pd) => (
                  <div
                    key={pd.original_date}
                    className="flex justify-between items-center p-4 bg-gray-50 rounded-xl mb-3"
                  >
                    <div>
                      <p className="font-bold">
                        {formatThaiShortDate(pd.original_date)}
                      </p>
                      <p className="text-sm text-gray-600">{pd.count} รายการ</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() =>
                          supabase
                            .from("pending_houses")
                            .delete()
                            .eq("original_date", pd.original_date)
                        }
                        className="text-red-600 underline"
                      >
                        ล้าง
                      </button>
                      <button
                        onClick={() =>
                          supabase
                            .rpc("load_pending_to_today", {
                              p_original_date: pd.original_date,
                            })
                            .then(() => {
                              refreshData();
                              setShowPendingModal(false);
                            })
                        }
                        className="text-blue-600 underline font-medium"
                      >
                        ดึงมา
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {/* Modal ตั้งจุดเริ่มต้น (แก้แล้ว) */}
        {showStartModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-purple-600">
                  ตั้งจุดเริ่มต้น (
                  {startPositionModalType === "today" ? "วันนี้" : "รายงานแล้ว"}
                  )
                </h2>
                <button onClick={() => setShowStartModal(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <input
                type="text"
                placeholder="ชื่อจุด (ไม่บังคับ)"
                value={startNameInput}
                onChange={(e) => setStartNameInput(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl mb-3 text-sm"
              />
              <input
                type="text"
                placeholder="ละติจูด,ลองจิจูด (เช่น 16.8833,99.125)"
                value={startCoordInput}
                onChange={(e) => {
                  setStartCoordInput(e.target.value);
                  const parts = e.target.value
                    .split(",")
                    .map((p) => parseFloat(p.trim()));
                  if (
                    parts.length === 2 &&
                    !isNaN(parts[0]) &&
                    !isNaN(parts[1])
                  ) {
                    setDetectedStartLat(parts[0]);
                    setDetectedStartLng(parts[1]);
                  } else {
                    setDetectedStartLat(null);
                    setDetectedStartLng(null);
                  }
                }}
                className="w-full px-4 py-3 border rounded-xl mb-3 text-sm"
              />
              <button
                onClick={() => detectLocation(true)}
                className="w-full py-3 bg-blue-600 text-white rounded-xl mb-4 flex items-center justify-center gap-2"
              >
                <MapPin className="w-5 h-5" /> ตรวจจับตำแหน่งปัจจุบัน
              </button>
              <div className="flex gap-3">
                <button
                  onClick={clearStartPosition}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl"
                >
                  ล้างจุดเริ่มต้น
                </button>
                <button
                  onClick={handleSetStartPosition}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold"
                >
                  ตั้งค่า
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal ตั้งตำแหน่งด้วยมือ */}
        {showManualModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-amber-600">
                  ตั้งตำแหน่งด้วยมือ
                </h2>
                <button onClick={() => setShowManualModal(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <input
                type="text"
                placeholder="ละติจูด,ลองจิจูด (เช่น 16.8833,99.125)"
                value={manualCoordInput}
                onChange={(e) => {
                  setManualCoordInput(e.target.value);
                  const parts = e.target.value
                    .split(",")
                    .map((p) => parseFloat(p.trim()));
                  if (
                    parts.length === 2 &&
                    !isNaN(parts[0]) &&
                    !isNaN(parts[1])
                  ) {
                    setDetectedLat(parts[0]);
                    setDetectedLng(parts[1]);
                  } else {
                    setDetectedLat(null);
                    setDetectedLng(null);
                  }
                }}
                className="w-full px-4 py-3 border rounded-xl mb-3 text-sm"
              />
              <button
                onClick={() => detectLocation(false)}
                className="w-full py-3 bg-blue-600 text-white rounded-xl mb-4 flex items-center justify-center gap-2"
              >
                <MapPin className="w-5 h-5" /> ตรวจจับตำแหน่งปัจจุบัน
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 py-3 bg-gray-200 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={setManualPosition}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold"
                >
                  ตั้งค่า
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
