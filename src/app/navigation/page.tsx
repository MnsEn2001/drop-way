// C:\DropWay\New_Version\dropway-final\src\app\navigation\page.tsx
"use client";
import { supabase } from "@/lib/supabase";
import { NavigationHouse } from "@/types/navigation";
import { House } from "@/types/house";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  MapPin,
  Navigation,
  Search,
  Edit3,
  Trash2,
  ExternalLink,
  Loader2,
  Filter,
  X as XIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Trash,
  Map,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Copy,
  Calculator,
  MessageSquare,
  Phone,
  PanelLeft,
  PanelRight,
  QrCode,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useVisualViewportHeightVar } from "@/lib/viewport";
const ITEMS_PER_PAGE = 20;
// ตำแหน่งแถบปุ่มการทำงานที่ผู้ใช้เลือก (มือซ้าย / มือขวา)
const HAND_MODE_KEY = "navigationActionRailSide";
type HandMode = "left" | "right";
// ฟังก์ชันคำนวณระยะทาง Haversine (km)
function getDistanceFromLatLon(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371; // รัศมีโลก (km)
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}
// สร้าง type ใหม่เพื่อรองรับ distance ที่เพิ่มเข้าไปตอน sort
interface NavigationHouseWithDistance extends NavigationHouse {
  distance: number;
}
export default function NavigationPage() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [list, setList] = useState<NavigationHouse[]>([]);
  const [sortedList, setSortedList] = useState<NavigationHouseWithDistance[]>(
    [],
  );
  const [filteredList, setFilteredList] = useState<
    NavigationHouseWithDistance[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showNoCoords, setShowNoCoords] = useState(false);
  const [showWithCoords, setShowWithCoords] = useState(false);
  const [sortByRoad, setSortByRoad] = useState(true);
  // โหมดมือ: ค่าเริ่มต้น = มือขวา (แถบปุ่มด้านขวา)
  const [handMode, setHandMode] = useState<HandMode>("right");
  // ปุ่มที่กดเปิด Dialog ไว้ เพื่อคืนโฟกัสหลังปิด (ไม่เปิดคีย์บอร์ดซ้ำ)
  const dialogTriggerRef = useRef<HTMLElement | null>(null);

  // ให้ Dialog คำนวณความสูงจากพื้นที่ที่มองเห็นจริง (คีย์บอร์ดเปิดอยู่ก็ไม่ล้น)
  useVisualViewportHeightVar();

  // Modal คอมเมนต์
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [houseToComment, setHouseToComment] = useState<NavigationHouse | null>(
    null,
  );
  const [commentText, setCommentText] = useState("");
  const [codInput, setCodInput] = useState("");
  // ตัวกรองเพิ่มเติม
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [houseNumberFilter, setHouseNumberFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [villageFilter, setVillageFilter] = useState("");
  const [subdistrictFilter, setSubdistrictFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [hasShownVillageSuggestions, setHasShownVillageSuggestions] =
    useState(false);
  // เพิ่มตรงนี้ (ใกล้กับ searchTerm)
  const [searchInName, setSearchInName] = useState(true);
  const [searchInAddress, setSearchInAddress] = useState(true);
  const [searchInPhone, setSearchInPhone] = useState(false);
  const [searchInNote, setSearchInNote] = useState(true); // เปิดหมายเหตุเป็น default
  const [searchInDriverNote, setSearchInDriverNote] = useState(true); // default เปิด

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [showPageInput, setShowPageInput] = useState(false);
  const [pageInputValue, setPageInputValue] = useState("");

  // เพิ่ม state เหล่านี้
  const [targetCodPercent, setTargetCodPercent] = useState<number>(80); // % COD ที่ต้องการ
  const [targetPiecePercent, setTargetPiecePercent] = useState<number>(95); // % ชิ้นที่ต้องการส่ง

  // ข้อมูลจริงของวันนี้ (จะดึงอัตโนมัติจาก list)
  const [todayTotalPieces, setTodayTotalPieces] = useState(0); // จำนวนชิ้นทั้งหมดวันนี้
  const [todayCodAmount, setTodayCodAmount] = useState(0); // ยอด COD ทั้งหมด (บาท)

  // เพิ่มตรงนี้ (ใกล้กับ [deliverNote, setDeliverNote])
  const [localCash, setLocalCash] = useState<string>("");
  const [localTransfer, setLocalTransfer] = useState<string>("");

  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [calculatorInput, setCalculatorInput] = useState("");
  const [calculatorResult, setCalculatorResult] = useState<string | null>(null);

  // Modal แก้ไข
  const [editingHouse, setEditingHouse] = useState<NavigationHouse | null>(
    null,
  );
  const [formData, setFormData] = useState<Partial<House>>({});
  const [isDetecting, setIsDetecting] = useState(false);
  // จุดเริ่มต้นทาง
  const [showStartModal, setShowStartModal] = useState(false);
  const [isRealTimeMode, setIsRealTimeMode] = useState(true);
  const [startPosition, setStartPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [currentPosition, setCurrentPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [coordInput, setCoordInput] = useState("");
  const [detectedStartLat, setDetectedStartLat] = useState<number | null>(null);
  const [detectedStartLng, setDetectedStartLng] = useState<number | null>(null);
  const [addressInput, setAddressInput] = useState<string>("");
  const [addressSuggestions, setAddressSuggestions] = useState<
    { label: string; value: string }[]
  >([]);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] =
    useState<number>(-1);
  // ข้อมูลคงที่ (เหมือนหน้า houses)
  const villages = Array.from({ length: 25 }, (_, i) => (i + 1).toString()); // "1" ถึง "25"
  const villageBySubdistrict: Record<string, string[]> = {
    นาโบสถ์: [
      "...",
      "วังทอง",
      "วังตำลึง",
      "ลาดยาว",
      "นาโบสถ์",
      "ตะเคียนด้วน",
      "วังน้ำเย็น",
      "นาแพะ",
      "ท่าทองแดง",
      "เพชรชมภู",
      "ใหม่พรสวรรค์",
    ],
    เชียงทอง: [
      "...",
      "วังเจ้า",
      "เด่นวัว",
      "เด่นคา",
      "หนองปลาไหล",
      "ครองราชย์",
      "เด่นวัวน้ำทิพย์",
      "ชุมนุมกลาง",
      "สบยม",
      "ดงซ่อม",
      "ใหม่เสรีธรรม",
      "ใหม่ชัยมงคล",
      "สบยมใต้",
      "ผาผึ้ง",
      "ศรีคีรีรักษ์",
    ],
    ประดาง: ["...", "ทุ่งกง", "คลองเชียงทอง", "ประดาง", "โตงเตง", "ท่าตะคร้อ"],
  };
  const subdistricts = ["นาโบสถ์", "เชียงทอง", "ประดาง"];
  const subdistrictInfo: Record<
    string,
    { district: string; province: string }
  > = {
    นาโบสถ์: { district: "วังเจ้า", province: "ตาก" },
    เชียงทอง: { district: "วังเจ้า", province: "ตาก" },
    ประดาง: { district: "วังเจ้า", province: "ตาก" },
  };
  // FAB Menu
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [isDeliverSubmitting, setIsDeliverSubmitting] = useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  // View Mode: today | delivered | reported
  const [viewMode, setViewMode] = useState<
    "today" | "delivered" | "reported" | "qr_pending" | "calculator"
  >("today");

  // Modal ส่งงาน
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [houseToDeliver, setHouseToDeliver] = useState<NavigationHouse | null>(
    null,
  );
  const [deliverNote, setDeliverNote] = useState<string>("โอนเข้าบริษัท");
  const [deliverNoteCustom, setDeliverNoteCustom] = useState("");

  // Modal รายงาน
  const [showReportModal, setShowReportModal] = useState(false);
  const [houseToReport, setHouseToReport] = useState<NavigationHouse | null>(
    null,
  );
  const [reportReason, setReportReason] = useState("โทรไม่รับ");
  const [reportReasonCustom, setReportReasonCustom] = useState("");
  const watchIdRef = useRef<number | null>(null);
  const router = useRouter();

  function nearestNeighborTSP(
    startLat: number,
    startLng: number,
    houses: NavigationHouse[],
  ): NavigationHouse[] {
    const validHouses = houses
      .filter(
        (h): h is NavigationHouse & { lat: number; lng: number } =>
          !!h.lat && !!h.lng,
      )
      .map((h) => ({ ...h }));

    if (validHouses.length <= 1) {
      return [...validHouses, ...houses.filter((h) => !h.lat || !h.lng)];
    }

    // หาบ้านที่ใกล้จุดเริ่มมากที่สุดเป็นตัวแรก
    let bestStartIndex = 0;
    let bestStartDist = Infinity;
    validHouses.forEach((house, i) => {
      const dist = getDistanceFromLatLon(
        startLat,
        startLng,
        house.lat,
        house.lng,
      );
      if (dist < bestStartDist) {
        bestStartDist = dist;
        bestStartIndex = i;
      }
    });

    [validHouses[0], validHouses[bestStartIndex]] = [
      validHouses[bestStartIndex],
      validHouses[0],
    ];

    const ordered: typeof validHouses = [validHouses[0]];
    const unvisited = new Set(validHouses.slice(1).map((_, i) => i + 1));
    let current = validHouses[0];

    while (unvisited.size > 0) {
      let nearestDist = Infinity;
      let nearestIdx = -1;

      unvisited.forEach((idx) => {
        const house = validHouses[idx];
        const dist = getDistanceFromLatLon(
          current.lat,
          current.lng,
          house.lat,
          house.lng,
        );
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = idx;
        }
      });

      if (nearestIdx === -1) break;

      const nextHouse = validHouses[nearestIdx];
      ordered.push(nextHouse);
      unvisited.delete(nearestIdx);
      current = nextHouse;
    }

    const noCoordsHouses = houses.filter((h) => !h.lat || !h.lng);
    return [...ordered, ...noCoordsHouses];
  }

  useEffect(() => {
    if (list.length === 0) return;

    // รายการที่ยังไม่ปิดยอด / ยังเกี่ยวข้องกับเราในวันนี้
    const relevantItems = list.filter((h) => {
      // ยัง pending หรือ reported → นับเป็นของวันนี้แน่นอน
      if (
        !h.delivery_status ||
        h.delivery_status === "pending" ||
        h.delivery_status === "reported"
      ) {
        return true;
      }

      // ส่งแล้ว แต่ยัง "รอปิดยอด QR" → ยังนับเป็นยอดที่ต้องจัดการ
      if (
        h.delivery_status === "delivered" &&
        h.delivery_note?.includes("รอปิดยอด QR")
      ) {
        return true;
      }

      // ส่งแล้วและปิดยอดแล้ว (ไม่มี "รอปิดยอด QR") → ไม่นับ
      return false;
    });

    setTodayTotalPieces(relevantItems.length);

    let codSum = 0;
    relevantItems.forEach((h) => {
      if (h.delivery_status === "delivered" && h.delivery_note) {
        codSum += extractAmountFromNote(h.delivery_note);
      }
    });

    setTodayCodAmount(codSum);
  }, [list]);

  // โหลดค่าเงินเดิมเมื่อ modal เปิด หรือ houseToDeliver เปลี่ยน
  useEffect(() => {
    if (showDeliverModal && houseToDeliver) {
      const note = houseToDeliver.delivery_note || "";

      // เงินสด / จ่ายรวมเงินสด
      const cashMatch = note.match(
        /(เงินสด|จ่ายรวมเงินสด)จำนวน\s*([\d,]+\.?\d*)\s*บาท/,
      );
      setLocalCash(cashMatch ? cashMatch[2].replace(/,/g, "") : "");

      // โอนเข้าบัญชีฉัน
      const transferMatch = note.match(
        /โอนเข้าบัญชีฉัน.*?([\d,]+\.?\d*)\s*บาท/,
      );
      setLocalTransfer(transferMatch ? transferMatch[1].replace(/,/g, "") : "");
    }
  }, [showDeliverModal, houseToDeliver]); // ขึ้นกับทั้งสองตัวนี้

  useEffect(() => {
    if (!showDeliverModal) {
      setLocalCash("");
      setLocalTransfer("");
    }
  }, [showDeliverModal]);

  useEffect(() => {
    const position = isRealTimeMode ? currentPosition : startPosition;
    if (!position || list.length === 0) {
      setSortedList(list.map((h) => ({ ...h, distance: Infinity })));
      return;
    }

    let processed: NavigationHouseWithDistance[];

    if (sortByRoad) {
      // โหมดเรียงตามถนน (Nearest Neighbor TSP)
      const ordered = nearestNeighborTSP(position.lat, position.lng, list);
      processed = ordered.map((h) => ({
        ...h,
        distance:
          h.lat && h.lng
            ? getDistanceFromLatLon(position.lat, position.lng, h.lat, h.lng)
            : Infinity,
      }));
    } else {
      // โหมดเรียงตามระยะทางเส้นตรง (sort by distance)
      processed = list
        .map((h) => ({
          ...h,
          distance:
            h.lat && h.lng
              ? getDistanceFromLatLon(position.lat, position.lng, h.lat, h.lng)
              : Infinity,
        }))
        .sort((a, b) => a.distance - b.distance); // เรียงจากใกล้ไปไกล
    }

    setSortedList(processed);
  }, [list, currentPosition, startPosition, isRealTimeMode, sortByRoad]); // ← เพิ่ม sortByRoad เข้า dependency

  // Ref เพื่อเก็บค่าตัวกรองก่อนหน้า — ใช้ป้องกันการรีเซ็ตหน้าโดยไม่จำเป็น
  const prevFiltersRef = useRef<{
    viewMode: "today" | "delivered" | "reported" | "qr_pending" | "calculator";
    searchTerm: string;
    showNoCoords: boolean;
    showWithCoords: boolean;
    houseNumberFilter: string;
    phoneFilter: string;
    villageFilter: string;
    subdistrictFilter: string;
    districtFilter: string;
    provinceFilter: string;
    searchInName: boolean;
    searchInAddress: boolean;
    searchInPhone: boolean;
    searchInNote: boolean;
  }>({
    viewMode: "today" as const,
    searchTerm: "",
    showNoCoords: false,
    showWithCoords: false,
    houseNumberFilter: "",
    phoneFilter: "",
    villageFilter: "",
    subdistrictFilter: "",
    districtFilter: "",
    provinceFilter: "",
    searchInName: true,
    searchInAddress: true,
    searchInPhone: false,
    searchInNote: true,
  });

  // โหลดค่าจุดคงที่จาก localStorage (ป้องกัน corrupt JSON ไม่ให้พังหน้า)
  useEffect(() => {
    let startPos: { lat: number; lng: number } | null = null;
    let realTimeMode = true;

    try {
      const saved = localStorage.getItem("navigationStartPosition");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          typeof parsed.lat === "number" &&
          typeof parsed.lng === "number" &&
          isFinite(parsed.lat) &&
          isFinite(parsed.lng)
        ) {
          startPos = parsed;
        }
      }
    } catch {
      // localStorage เสียหรือ JSON ไม่ถูกต้อง → ใช้ค่า default
    }

    try {
      const savedMode = localStorage.getItem("navigationRealTimeMode");
      if (savedMode === "false") {
        realTimeMode = false;
      }
    } catch {
      // ไม่ทำอะไร
    }

    try {
      const savedHand = localStorage.getItem(HAND_MODE_KEY);
      if (savedHand === "left" || savedHand === "right") {
        setHandMode(savedHand);
      }
    } catch {
      // localStorage ใช้ไม่ได้ → ใช้ค่าเริ่มต้น (มือขวา)
    }

    if (startPos) {
      setStartPosition(startPos);
    }
    setIsRealTimeMode(realTimeMode);
  }, []);

  const changeHandMode = (next: HandMode) => {
    setHandMode(next);
    try {
      localStorage.setItem(HAND_MODE_KEY, next);
      toast.success(
        next === "left" ? "ย้ายแถบปุ่มไปด้านซ้ายแล้ว" : "ย้ายแถบปุ่มไปด้านขวาแล้ว",
      );
    } catch {
      toast.error("บันทึกค่าไม่สำเร็จ แต่ย้ายแถบปุ่มให้แล้วในหน้านี้");
    }
  };

  // Dialog ที่เปิดอยู่ตอนนี้ (ใช้คุมการคืนโฟกัสหลังปิด)
  const anyDialogOpen =
    showFilterModal ||
    showStartModal ||
    showCalculatorModal ||
    showPageInput ||
    !!editingHouse ||
    (showDeliverModal && !!houseToDeliver) ||
    (showCommentModal && !!houseToComment) ||
    (showReportModal && !!houseToReport);

  // เมื่อปิด Dialog แล้วคืนโฟกัสให้ปุ่มที่กดเปิด — ปุ่มไม่ทำให้คีย์บอร์ดเด้ง
  useEffect(() => {
    if (anyDialogOpen) return;
    const trigger = dialogTriggerRef.current;
    dialogTriggerRef.current = null;
    if (trigger && document.contains(trigger)) {
      trigger.focus({ preventScroll: true });
    }
  }, [anyDialogOpen]);

  const rememberDialogTrigger = (element: HTMLElement | null) => {
    dialogTriggerRef.current = element;
  };

  // เช็ก session
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      } else {
        setLoading(false);
      }
    };
    checkSession();
  }, [router]);

  // โหลดข้อมูลการนำทาง
  useEffect(() => {
    const fetchNavigation = async () => {
      setLoading(true);
      let allHouses: NavigationHouse[] = [];
      let start = 0;
      const pageSize = 1000; // ปลอดภัยสุดสำหรับแผน Free

      while (true) {
        const { data, error } = await supabase
          .from("navigation_view")
          .select("*")
          .order("nav_priority", { ascending: true })
          .range(start, start + pageSize - 1);

        if (error) {
          console.error("Error fetching navigation:", error);
          toast.error("โหลดรายการนำทางไม่สำเร็จ");
          break;
        }

        if (!data || data.length === 0) {
          break;
        }

        allHouses = [...allHouses, ...data];
        start += pageSize;

        if (data.length < pageSize) {
          break;
        }

        // เพิ่ม delay เพื่อไม่ให้โดน rate limit
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      setList(allHouses);
      setLoading(false);
    };

    fetchNavigation();
  }, []);

  // เริ่ม/หยุด watchPosition ตามโหมด
  useEffect(() => {
    if (!navigator.geolocation) {
      toast.error("เบราว์เซอร์ไม่รองรับการตรวจจับตำแหน่ง");
      return;
    }

    if (isRealTimeMode) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCurrentPosition({ lat, lng });
        },
        (err) => {
          let message = "ไม่สามารถติดตามตำแหน่งได้";
          if (err) {
            switch (err.code) {
              case err.PERMISSION_DENIED:
                message = "ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง โปรดเปิดใช้งานในตั้งค่าเบราว์เซอร์";
                break;
              case err.POSITION_UNAVAILABLE:
                message = "ไม่สามารถรับตำแหน่งในปัจจุบันได้";
                break;
              case err.TIMEOUT:
                message = "หมดเวลาดึงตำแหน่ง โปรดลองอีกครั้ง";
                break;
              default:
                message = `ไม่สามารถติดตามตำแหน่งได้: ${err.message ?? "ข้อผิดพลาดไม่ทราบสาเหตุ"}`;
            }
          }
          toast.error(message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
      );
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isRealTimeMode]);

  // กรองข้อมูล (ใช้ sortedList เป็นฐาน)
  useEffect(() => {
    let filtered: NavigationHouseWithDistance[] = sortedList;
    // กรองตาม viewMode
    if (viewMode === "delivered") {
      filtered = filtered.filter((h) => h.delivery_status === "delivered");
    } else if (viewMode === "qr_pending") {
      filtered = filtered.filter(
        (h) =>
          h.delivery_status === "delivered" &&
          h.delivery_note?.includes("รอปิดยอด QR"),
      );
    } else if (viewMode === "reported") {
      filtered = filtered.filter((h) => h.delivery_status === "reported");
    } else {
      // "today"
      filtered = filtered.filter(
        (h) => !h.delivery_status || h.delivery_status === "pending",
      );
    }
    // ⭐ เปลี่ยนการค้นหา searchTerm ใหม่ (รองรับตัวเลือกฟิลด์)
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter((h) => {
        let matches = false;

        if (searchInName && h.full_name?.toLowerCase().includes(lower)) {
          matches = true;
        }
        if (searchInAddress && h.address?.toLowerCase().includes(lower)) {
          matches = true;
        }
        if (searchInPhone && h.phone?.includes(searchTerm)) {
          // ยังคงใช้ searchTerm ไม่ lower เพราะเบอร์
          matches = true;
        }
        if (searchInNote && h.note?.toLowerCase().includes(lower)) {
          matches = true;
        }
        // ────────────── เพิ่มตรงนี้ ──────────────
        if (
          searchInDriverNote &&
          h.driver_note?.toLowerCase().includes(lower)
        ) {
          matches = true;
        }
        // ────────────────────────────────────────

        // ค้น delivery_note อยู่แล้ว (hard-code)
        if (h.delivery_note?.toLowerCase().includes(lower)) {
          matches = true;
        }

        return matches;
      });
    }
    // ส่วนที่เหลือเหมือนเดิม
    if (showWithCoords && !showNoCoords) {
      filtered = filtered.filter((h) => h.lat && h.lng);
    } else if (showNoCoords && !showWithCoords) {
      filtered = filtered.filter((h) => !h.lat || !h.lng);
    }
    if (houseNumberFilter)
      filtered = filtered.filter((h) => h.address?.includes(houseNumberFilter));
    if (phoneFilter)
      filtered = filtered.filter((h) => h.phone?.includes(phoneFilter));
    if (villageFilter)
      filtered = filtered.filter(
        (h) =>
          h.address?.includes(`หมู่ ${villageFilter}`) ||
          h.address?.includes(`ม.${villageFilter}`),
      );
    if (subdistrictFilter)
      filtered = filtered.filter((h) =>
        h.address?.toLowerCase().includes(subdistrictFilter.toLowerCase()),
      );
    if (districtFilter)
      filtered = filtered.filter((h) =>
        h.address?.toLowerCase().includes(districtFilter.toLowerCase()),
      );
    if (provinceFilter)
      filtered = filtered.filter((h) =>
        h.address?.toLowerCase().includes(provinceFilter.toLowerCase()),
      );
    setFilteredList(filtered);
    // รีเซ็ตหน้า 1 เมื่อตัวกรองเปลี่ยน
    const prev = prevFiltersRef.current;
    const currentFilters = {
      viewMode,
      searchTerm: searchTerm.trim(),
      showNoCoords,
      showWithCoords,
      houseNumberFilter,
      phoneFilter,
      villageFilter,
      subdistrictFilter,
      districtFilter,
      provinceFilter,
      // เพิ่มตัวเลือกค้นหาด้วย (เพื่อให้รีเซ็ตหน้าเมื่อเปลี่ยน)
      searchInName,
      searchInAddress,
      searchInPhone,
      searchInNote,
    };
    const hasChanged =
      prev.viewMode !== currentFilters.viewMode ||
      prev.searchTerm !== currentFilters.searchTerm ||
      prev.showNoCoords !== currentFilters.showNoCoords ||
      prev.showWithCoords !== currentFilters.showWithCoords ||
      prev.houseNumberFilter !== currentFilters.houseNumberFilter ||
      prev.phoneFilter !== currentFilters.phoneFilter ||
      prev.villageFilter !== currentFilters.villageFilter ||
      prev.subdistrictFilter !== currentFilters.subdistrictFilter ||
      prev.districtFilter !== currentFilters.districtFilter ||
      prev.provinceFilter !== currentFilters.provinceFilter ||
      prev.searchInName !== currentFilters.searchInName ||
      prev.searchInAddress !== currentFilters.searchInAddress ||
      prev.searchInPhone !== currentFilters.searchInPhone ||
      prev.searchInNote !== currentFilters.searchInNote;
    if (hasChanged) {
      setCurrentPage(1);
    }
    prevFiltersRef.current = currentFilters;
  }, [
    sortedList,
    searchTerm,
    showNoCoords,
    showWithCoords,
    houseNumberFilter,
    phoneFilter,
    villageFilter,
    subdistrictFilter,
    districtFilter,
    provinceFilter,
    viewMode,
    searchInName,
    searchInAddress,
    searchInPhone,
    searchInNote,
    searchInDriverNote, // ← เพิ่มบรรทัดนี้
  ]);
  const clearSearch = () => setSearchTerm("");
  const clearFilters = () => {
    setHouseNumberFilter("");
    setPhoneFilter("");
    setVillageFilter("");
    setSubdistrictFilter("");
    setDistrictFilter("");
    setProvinceFilter("");
    setSearchInDriverNote(true);
  };

  const openCommentModal = (house: NavigationHouse) => {
    setHouseToComment(house);
    setCommentText(house.driver_note || ""); // โหลดคอมเมนต์เดิมถ้ามี
    setShowCommentModal(true);
  };

  const confirmComment = async () => {
    if (!houseToComment) return;
    if (isCommentSubmitting) return;
    setIsCommentSubmitting(true);

    try {
      const trimmed = commentText.trim();
      const { error } = await supabase
        .from("user_navigation_houses")
        .update({
          driver_note: trimmed || null, // ถ้าว่างให้เป็น null
        })
        .eq("id", houseToComment.nav_id);

      if (error) {
        toast.error("บันทึกคอมเมนต์ไม่สำเร็จ: " + error.message);
        return;
      }

      toast.success("บันทึกคอมเมนต์เรียบร้อย");
      // รีโหลดข้อมูล
      await reloadNavigation();
      setShowCommentModal(false);
      setHouseToComment(null);
      setCommentText("");
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  // ⭐ แก้ไขฟังก์ชัน extractAmountFromNote รองรับ 1,250.50
  function extractAmountFromNote(note: string | null | undefined): number {
    if (!note) return 0;
    // รองรับ , และ . (ไทย + อังกฤษ) เช่น "1,250.50 บาท", "1250.50 บาท"
    const match = note.match(/([\d,]+\.?\d*)\s*บาท/);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ""));
    }
    return 0;
  }

  // ⭐ แก้ไข getCountText() เป็นเวอร์ชันใหม่ – กระชับและจัดการทุกกรณี
  const getCountText = () => {
    const displayedCount = filteredList.length;
    const totalInList = list.length;

    if (viewMode === "calculator") {
      // คำนวณยอดจากรายการ "วันนี้" (เหมือนที่เคยคำนวณ todayCodAmount)
      let totalAmount = 0;
      let cashAmount = 0;
      let transferAmount = 0;

      // ใช้ todayItems เหมือนใน useEffect ที่คำนวณ todayCodAmount
      const todayItems = list.filter((h) => {
        if (h.delivered_at) {
          const deliveredDate = new Date(h.delivered_at);
          const today = new Date();
          return deliveredDate.toDateString() === today.toDateString();
        }
        return !h.delivery_status || h.delivery_status === "pending";
      });

      todayItems.forEach((h) => {
        if (h.delivery_status === "delivered" && h.delivery_note) {
          const note = h.delivery_note;

          // ดึงยอดรวมทั้งหมด (เหมือนเดิม)
          const amount = extractAmountFromNote(note);
          totalAmount += amount;

          // แยกเงินสด
          const cashMatch = note.match(
            /(เงินสด|จ่ายรวมเงินสด)จำนวน\s*([\d,]+\.?\d*)\s*บาท/,
          );
          if (cashMatch) {
            cashAmount += parseFloat(cashMatch[2].replace(/,/g, ""));
          }

          // แยกโอนเข้าบัญชีฉัน
          const transferMatch = note.match(
            /โอนเข้าบัญชีฉัน.*?([\d,]+\.?\d*)\s*บาท/,
          );
          if (transferMatch) {
            transferAmount += parseFloat(transferMatch[1].replace(/,/g, ""));
          }
        }
      });

      // แสดงผลแบบที่ต้องการ
      return `รวม: ${totalAmount.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} | เงินสด: ${cashAmount.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} | เงินโอน: ${transferAmount.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} |`;
    }

    // ส่วนอื่น ๆ เหมือนเดิม (today, delivered, qr_pending, reported)
    const modeNames: Record<Exclude<typeof viewMode, "calculator">, string> = {
      today: "วันนี้ (ที่ต้องส่ง)",
      delivered: "ส่งแล้ว",
      qr_pending: "QR",
      reported: "รายงาน",
    };
    const modeText = modeNames[viewMode];

    const hasFilter =
      searchTerm.trim() ||
      showNoCoords ||
      showWithCoords ||
      houseNumberFilter ||
      phoneFilter ||
      villageFilter ||
      subdistrictFilter ||
      districtFilter ||
      provinceFilter;

    let totalAmount = 0;
    if (viewMode === "delivered" || viewMode === "qr_pending") {
      totalAmount = filteredList.reduce(
        (sum, h) => sum + extractAmountFromNote(h.delivery_note),
        0,
      );
    }
    const amountText =
      totalAmount > 0
        ? ` รวมยอด ${totalAmount.toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} บาท`
        : "";

    let mainText = `${modeText} • พบ ${displayedCount} บ้าน |`;
    if (amountText) mainText += amountText;

    if (hasFilter) {
      mainText += ` | กรอง ${totalInList} บ้าน |`;
    } else if (totalInList !== displayedCount) {
      mainText += ` | ${totalInList} บ้าน |`;
    }

    const position = isRealTimeMode ? currentPosition : startPosition;
    if (viewMode === "today" && position) {
      mainText = `ที่ต้องส่งวันนี้ • พบ ${displayedCount} บ้าน`;
      if (!hasFilter && totalInList !== displayedCount) {
        mainText += ` | ${totalInList} บ้าน |`;
      }
    }

    return mainText;
  };

  // แสดงหมายเหตุแบบสั้น (ใช้ในแท็บ ส่งแล้ว และ QR)
  function formatShortDeliveryNote(note: string | null | undefined): string {
    if (!note) return "ไม่มีหมายเหตุ";

    // กรณีเงินสดหรือจ่ายรวม
    if (note.includes("เงินสดจำนวน") || note.includes("จ่ายรวมเงินสดจำนวน")) {
      const match = note.match(
        /(เงินสด|จ่ายรวมเงินสด)จำนวน\s*([\d,]+\.?\d*)\s*บาท/,
      );
      if (match) {
        const type = match[1] === "เงินสด" ? "เงินสด" : "จ่ายรวมเงินสด";
        const amount = match[2];
        return `${type} ${amount} บาท`;
      }
    }

    // กรณีโอนเข้าบัญชีฉัน
    if (note.includes("โอนเข้าบัญชีฉัน")) {
      const match = note.match(/โอนเข้าบัญชีฉัน.*?([\d,]+\.?\d*)\s*บาท/);
      if (match) {
        return `โอนเข้าบัญชีฉัน ${match[1]} บาท`;
      }
    }

    // กรณีอื่น ๆ (เช่น โอนเข้าบริษัท, ไม่มียอด)
    return note.replace(" รอปิดยอด QR", "").trim();
  }

  useEffect(() => {
    if (todayCodAmount > 0) {
      setCodInput(todayCodAmount.toFixed(2).replace(/\.?0+$/, "")); // ลบ .00 ทิ้งถ้าเป็น整數
    }
  }, [todayCodAmount]);

  useEffect(() => {
    if (editingHouse && formData.address !== undefined) {
      setAddressInput(formData.address || "");
    }
  }, [editingHouse, formData.address]);
  const handleAddressChange = (value: string) => {
    setAddressInput(value);
    setFormData((prev) => ({ ...prev, address: value }));
    generateAddressSuggestions(value);
    setHighlightedSuggestionIndex(-1);
  };
  const generateAddressSuggestions = (input: string) => {
    const trimmed = input.trimEnd();
    // 1. ยังไม่มี ม. หรือ ต. → แนะนำ ม.1-25
    if (
      /\s$/.test(input) &&
      !trimmed.includes("ม.") &&
      !trimmed.includes("ต.")
    ) {
      setAddressSuggestions(
        villages.map((v) => ({
          label: `ม.${v}`,
          value: `ม.${v} `,
        })),
      );
      setHasShownVillageSuggestions(false);
      return;
    }
    // 2. มี ม.เลข แล้วกด space
    if (trimmed.match(/ม\.\d+$/) && /\s$/.test(input)) {
      // ถ้าเคยแสดงรายการหมู่บ้านแล้ว → ไปแสดง ต. ทันที
      if (hasShownVillageSuggestions) {
        setAddressSuggestions(
          subdistricts.map((sd) => ({
            label: `ต.${sd}`,
            value: `ต.${sd}`,
          })),
        );
        return;
      }
      // ครั้งแรก → แสดงรายการหมู่บ้าน + ข้าม
      const allVillages = Array.from(
        new Set(Object.values(villageBySubdistrict).flat()),
      );
      const suggestions = ["...", ...allVillages.filter((v) => v !== "...")];
      setAddressSuggestions(
        suggestions.map((v) => ({
          label: v === "..." ? "➜ ข้ามการระบุหมู่บ้าน" : `บ.${v}`,
          value: v === "..." ? "" : `บ.${v} `,
        })),
      );
      setHasShownVillageSuggestions(true);
      return;
    }
    // 3. มี "บ." แล้วกด space → แสดง ต.
    if (trimmed.match(/บ\.[^ ]+$/) && /\s$/.test(input)) {
      setAddressSuggestions(
        subdistricts.map((sd) => ({
          label: `ต.${sd}`,
          value: `ต.${sd}`,
        })),
      );
      return;
    }
    // 4. พิมพ์ "ต." แล้วกำลังพิมพ์ตำบล
    const tambonMatch = trimmed.match(/ต\.([^ ]*)$/);
    if (tambonMatch) {
      const partial = tambonMatch[1];
      const matches = subdistricts.filter((sd) => sd.includes(partial));
      setAddressSuggestions(
        matches.map((sd) => ({
          label: `ต.${sd}`,
          value: `ต.${sd}`,
        })),
      );
      return;
    }
    setAddressSuggestions([]);
  };
  const selectAddressSuggestion = (suggestion: {
    label: string;
    value: string;
  }) => {
    let newAddress = addressInput.replace(/[^\s]*$/, "") + suggestion.value;
    // ถ้าเลือกตำบล → เติม อำเภอ + จังหวัด
    const tambonMatch = suggestion.value.match(/ต\.(.+)/);
    if (tambonMatch) {
      const tambon = tambonMatch[1];
      const info = subdistrictInfo[tambon];
      if (info) {
        newAddress =
          newAddress.trim() + ` อ.${info.district} จ.${info.province}`;
      }
    }
    setAddressInput(newAddress);
    setFormData((prev) => ({ ...prev, address: newAddress }));
    setAddressSuggestions([]);
    setHighlightedSuggestionIndex(-1);
    // เปิด suggestion ถัดไปทันที
    setTimeout(() => {
      generateAddressSuggestions(newAddress + " ");
    }, 0);
  };
  const handleAddressKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (addressSuggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedSuggestionIndex((prev) =>
        prev < addressSuggestions.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedSuggestionIndex((prev) =>
        prev > 0 ? prev - 1 : addressSuggestions.length - 1,
      );
    } else if (e.key === "Enter" && highlightedSuggestionIndex >= 0) {
      e.preventDefault();
      selectAddressSuggestion(addressSuggestions[highlightedSuggestionIndex]);
    } else if (e.key === "Escape") {
      setAddressSuggestions([]);
      setHighlightedSuggestionIndex(-1);
    }
  };
  // Pagination
  const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentHouses = filteredList.slice(startIndex, endIndex);
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const handlePageInputSubmit = () => {
    const page = parseInt(pageInputValue);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      goToPage(page);
    } else {
      toast.error(`กรุณากรอกเลขหน้าที่ถูกต้อง (1-${totalPages})`);
    }
    setShowPageInput(false);
    setPageInputValue("");
  };
  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <button
            key={i}
            onClick={() => goToPage(i)}
            className={`w-10 h-10 rounded-lg font-medium transition-colors ${
              i === currentPage
                ? "bg-teal-600 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {i}
          </button>,
        );
      }
      return pages;
    }
    const startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
      endPage = Math.min(totalPages, startPage + maxVisible - 1);
    }
    // หน้าแรก
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => goToPage(1)}
          className="w-10 h-10 rounded-lg font-medium bg-gray-200 hover:bg-gray-300 transition-colors"
        >
          1
        </button>,
      );
      if (startPage > 2) {
        pages.push(
          <button
            key="start-ellipsis"
            onClick={() => setShowPageInput(true)}
            className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 font-medium transition-colors relative z-10" // เพิ่ม z-10
          >
            ...
          </button>,
        );
      }
    }
    // หน้าตรงกลาง
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => goToPage(i)}
          className={`w-10 h-10 rounded-lg font-medium transition-colors ${
            i === currentPage
              ? "bg-teal-600 text-white"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          {i}
        </button>,
      );
    }
    // หน้าสุดท้าย
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <button
            key="end-ellipsis"
            onClick={() => setShowPageInput(true)}
            className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 font-medium transition-colors relative z-10" // เพิ่ม z-10
          >
            ...
          </button>,
        );
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => goToPage(totalPages)}
          className="w-10 h-10 rounded-lg font-medium bg-gray-200 hover:bg-gray-300 transition-colors"
        >
          {totalPages}
        </button>,
      );
    }
    return pages;
  };
  const removeFromNavigation = async (navId: string) => {
    if (!confirm("ยืนยันการลบบ้านนี้ออกจากการนำทาง?")) return;
    const { error } = await supabase
      .from("user_navigation_houses")
      .delete()
      .eq("id", navId);
    if (error) {
      toast.error("ลบไม่สำเร็จ: " + error.message);
      return;
    }
    toast.success("ลบออกจากการนำทางเรียบร้อย");
    setList((prev) => prev.filter((h) => h.nav_id !== navId));
  };
  const clearAllNavigation = async () => {
    if (list.length === 0) {
      toast("ไม่มีบ้านในการนำทางอยู่แล้ว");
      return;
    }
    if (
      !confirm("ยืนยันลบทุกบ้านออกจากการนำทาง? การกระทำนี้ไม่สามารถย้อนกลับได้")
    )
      return;
    const navIds = list.map((h) => h.nav_id);
    const { error } = await supabase
      .from("user_navigation_houses")
      .delete()
      .in("id", navIds);
    if (error) {
      toast.error("ลบทั้งหมดไม่สำเร็จ: " + error.message);
      return;
    }
    toast.success(`ลบทั้งหมด ${list.length} บ้านออกจากการนำทางเรียบร้อย`);
    setList([]);
    setIsFabOpen(false);
  };

  const openFullRoute = () => {
    const position = isRealTimeMode ? currentPosition : startPosition;
    if (!position) {
      toast.error("กรุณาตั้งจุดเริ่มต้นทางก่อน");
      return;
    }

    const validHouses = filteredList.filter(
      (h): h is NavigationHouseWithDistance & { lat: number; lng: number } =>
        !!h.lat && !!h.lng,
    );

    if (validHouses.length === 0) {
      toast.error("ไม่มีบ้านที่มีพิกัดในรายการปัจจุบัน");
      return;
    }

    const maxPoints = 20; // Google Maps จำกัดจำนวน waypoints
    const housesToUse = validHouses.slice(0, maxPoints);

    // Offset พิกัดที่ซ้ำกัน
    const offsetCoords = offsetDuplicateCoordinates(housesToUse);

    const coords = [
      `${position.lat},${position.lng}`, // จุดเริ่มต้น
      ...offsetCoords.map((c) => `${c.lat.toFixed(6)},${c.lng.toFixed(6)}`),
    ].join("/");

    const url = `https://www.google.com/maps/dir/${coords}`;
    window.open(url, "_blank");

    const total = validHouses.length;
    const used = housesToUse.length;
    const msg =
      used < total
        ? `เปิดเส้นทาง ${used} จุดแรก (จากทั้งหมด ${total} จุด)`
        : `เปิดเส้นทางทั้งหมด ${used} จุด (ปรับตำแหน่งบ้านที่ซ้ำกันแล้ว)`;

    toast.success(msg);
    setIsFabOpen(false);
  };

  // ฟังก์ชันช่วย offset พิกัดเมื่อซ้ำกัน (หน่วย ≈ เมตร)
  function offsetDuplicateCoordinates(
    houses: (NavigationHouseWithDistance & { lat: number; lng: number })[],
    radiusMeters: number = 25, // รัศมีเริ่มต้น (ปรับได้)
    angleStepDegrees: number = 60, // มุมหมุนแต่ละจุด (60° = 6 จุดรอบวงกลม)
  ): Array<{ lat: number; lng: number }> {
    const coordMap = new globalThis.Map<string, number>();
    const offsetHouses: Array<{ lat: number; lng: number }> = [];

    houses.forEach((house) => {
      const key = `${house.lat.toFixed(6)},${house.lng.toFixed(6)}`;
      const count = (coordMap.get(key) || 0) + 1;
      coordMap.set(key, count);

      if (count === 1) {
        // จุดแรก ไม่ต้อง offset
        offsetHouses.push({ lat: house.lat, lng: house.lng });
      } else {
        // offset จุดที่ซ้ำ
        const angle = (count - 1) * angleStepDegrees * (Math.PI / 180);
        const offsetLat = house.lat + (radiusMeters / 111320) * Math.cos(angle);
        const offsetLng =
          house.lng +
          (radiusMeters / (111320 * Math.cos(house.lat * (Math.PI / 180)))) *
            Math.sin(angle);

        offsetHouses.push({ lat: offsetLat, lng: offsetLng });
      }
    });

    return offsetHouses;
  }

  const openEditModal = (house: NavigationHouse) => {
    setEditingHouse(house);
    setFormData({
      full_name: house.full_name || "",
      phone: house.phone || "",
      address: house.address || "",
      note: house.note || "",
      lat: house.lat || undefined,
      lng: house.lng || undefined,
    });
    setAddressInput(house.address || "");
    setHasShownVillageSuggestions(false); // เพิ่มบรรทัดนี้
  };
  const closeModal = () => {
    setEditingHouse(null);
    setFormData({});
    setIsDetecting(false);
  };
  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("เบราว์เซอร์ไม่รองรับการตรวจจับตำแหน่ง");
      return;
    }
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setFormData((prev) => ({
          ...prev,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
        }));
        setIsDetecting(false);
        toast.success(`ดึงพิกัดสำเร็จ: ${lat},${lng}`);
      },
      (error) => {
        toast.error("ไม่สามารถดึงตำแหน่งได้: " + error.message);
        setIsDetecting(false);
      },
      { timeout: 10000 },
    );
  };
  const verifyOnMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, "_blank");
  };

  const saveHouse = async () => {
    if (!editingHouse) return;
    if (!editingHouse.house_id || editingHouse.house_id === "undefined") {
      toast.error("ไม่พบ ID ของบ้าน กรุณารีเฟรชหน้าหรือลองใหม่อีกครั้ง");
      return;
    }

    // สร้างข้อมูลสุดท้าย แปลง undefined เป็น null ชัดเจน
    const finalData = {
      ...formData,
      lat: formData.lat ?? null, // ถ้า undefined → null
      lng: formData.lng ?? null,
    };

    const { error } = await supabase
      .from("houses")
      .update(finalData)
      .eq("id", editingHouse.house_id);

    if (error) {
      toast.error("บันทึกไม่สำเร็จ: " + error.message);
    } else {
      toast.success("บันทึกสำเร็จ");
      // รีโหลดข้อมูลล่าสุดจาก navigation_view
      await reloadNavigation(); // ใช้ฟังก์ชันที่มีอยู่แล้ว
      closeModal();
    }
  };

  // ฟังก์ชันแยกเพื่ออัปเดตเงินทอนทันทีที่พิมพ์
  const updateChangeResult = (input: string) => {
    const paid = parseFloat(input.replace(/[^\d.]/g, ""));
    const due = deliverNote.includes("เงินสด")
      ? parseFloat(localCash || "0")
      : parseFloat(localTransfer || "0");

    if (!isNaN(paid) && !isNaN(due) && due > 0) {
      const change = paid - due;
      if (change >= 0) {
        setCalculatorResult(
          `เงินทอน: ${change.toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} บาท`,
        );
      } else {
        setCalculatorResult(
          `ขาด: ${Math.abs(change).toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} บาท`,
        );
      }
    } else {
      setCalculatorResult(null);
    }
  };

  const openNavigation = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.location.href = url;
  };
  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("เบราว์เซอร์ไม่รองรับการตรวจจับตำแหน่ง");
      return;
    }
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDetectedStartLat(lat);
        setDetectedStartLng(lng);
        setCoordInput(`${lat.toFixed(6)},${lng.toFixed(6)}`);
        setIsDetecting(false);
        toast.success("ตรวจจับตำแหน่งสำเร็จ!");
      },
      (err) => {
        toast.error("ไม่สามารถตรวจจับได้: " + err.message);
        setIsDetecting(false);
      },
    );
  };
  const handleSetStartPosition = () => {
    if (detectedStartLat === null || detectedStartLng === null) return;
    const pos = { lat: detectedStartLat, lng: detectedStartLng };

    let saved: string;
    try {
      saved = JSON.stringify(pos);
    } catch {
      toast.error("เกิดข้อผิดพลาดในการบันทึกตำแหน่ง");
      return;
    }

    try {
      localStorage.setItem("navigationStartPosition", saved);
      localStorage.setItem("navigationRealTimeMode", "false");
    } catch {
      toast.error("ไม่สามารถบันทึกตำแหน่งได้");
      return;
    }

    setStartPosition(pos);
    setIsRealTimeMode(false);
    toast.success("ตั้งจุดเริ่มต้นคงที่เรียบร้อย");
    setShowStartModal(false);
    setIsFabOpen(false);
  };
  // ⭐ เพิ่มฟังก์ชัน reloadNavigation ใหม่
  const reloadNavigation = async () => {
    const { data } = await supabase
      .from("navigation_view")
      .select("*")
      .order("nav_priority", { ascending: true });
    if (data) {
      setList(data);
    }
  };

  // ⭐ แก้ confirmDeliver ทั้งหมด (รองรับจุดทศนิยม + ป้องกันกดซ้ำ)
  const confirmDeliver = async (
    cash: string, // รับจาก localCash
    transfer: string, // รับจาก localTransfer
  ) => {
    if (!houseToDeliver) return;
    if (isDeliverSubmitting) return;
    setIsDeliverSubmitting(true);

    try {
      let note = deliverNote;

      if (deliverNote === "จ่ายด้วยเงินสด" || deliverNote === "จ่ายรวมเงินสด") {
        if (!cash.trim() || isNaN(Number(cash))) {
          toast.error("กรุณากรอกจำนวนเงินสดให้ถูกต้อง");
          return;
        }
        const amount = Number(cash).toLocaleString("th-TH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        note = `${deliverNote}จำนวน ${amount} บาท รอปิดยอด QR`;
      } else if (deliverNote === "โอนเข้าบัญชีฉัน") {
        if (!transfer.trim() || isNaN(Number(transfer))) {
          toast.error("กรุณากรอกจำนวนเงินที่โอนให้ถูกต้อง");
          return;
        }
        const amount = Number(transfer).toLocaleString("th-TH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        note = `โอนเข้าบัญชีฉัน จำนวน ${amount} บาท รอปิดยอด QR`;
      } else if (deliverNote === "อื่นๆ") {
        note = deliverNoteCustom.trim() || "ไม่มีหมายเหตุ";
      } else {
        note = deliverNote;
      }

      const { error } = await supabase
        .from("user_navigation_houses")
        .update({
          delivery_status: "delivered",
          delivery_note: note,
          delivered_at: new Date().toISOString(),
        })
        .eq("id", houseToDeliver.nav_id);

      if (error) {
        toast.error("บันทึกการส่งไม่สำเร็จ: " + error.message);
        return;
      }

      toast.success("✅ บันทึกการส่งงานเรียบร้อยแล้ว");
      await reloadNavigation();
      setShowDeliverModal(false);
    } finally {
      setIsDeliverSubmitting(false);
    }
  };

  // ⭐ แก้ confirmReport ทั้งหมด
  const confirmReport = async () => {
    if (!houseToReport) return;
    if (isReportSubmitting) return;

    const finalReason =
      reportReason === "อื่นๆ" ? reportReasonCustom.trim() : reportReason;
    if (!finalReason) {
      toast.error("กรุณาเลือกหรือกรอกเหตุผล");
      return;
    }

    setIsReportSubmitting(true);
    try {
      const { error } = await supabase
        .from("user_navigation_houses")
        .update({
          delivery_status: "reported",
          report_reason: finalReason,
          reported_at: new Date().toISOString(),
        })
        .eq("id", houseToReport.nav_id);

      if (error) {
        toast.error("บันทึกรายงานไม่สำเร็จ: " + error.message);
        return;
      }

      toast.success("⚠️ บันทึกรายงานเรียบร้อยแล้ว");
      await reloadNavigation();
      setShowReportModal(false);
      setReportReason("โทรไม่รับ"); // รีเซ็ตค่าเริ่มต้น
      setReportReasonCustom("");
    } finally {
      setIsReportSubmitting(false);
    }
  };
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 px-4">
        <Loader2
          className="h-5 w-5 animate-spin text-teal-700"
          aria-hidden="true"
        />
        <div className="text-base text-gray-600">กำลังโหลดการนำทาง...</div>
      </div>
    );
  }

  return (
    <div className="page-shell relative mx-auto max-w-7xl px-4 py-6 pb-32 sm:py-8 md:pb-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="page-title">
          <Home className="h-7 w-7 text-teal-700" aria-hidden="true" />
          การนำทางของฉัน
        </h1>
        {(() => {
          const total = list.length;
          const withCoords = list.filter((h) => h.lat && h.lng).length;
          const noCoords = total - withCoords;
          return (
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-medium text-gray-600">
              <span className="flex items-center gap-2">
                <span className="text-gray-800 font-bold">
                  ทั้งหมด {total} บ้าน
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full">
                  มีพิกัด {withCoords}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold text-orange-700 bg-orange-100 rounded-full">
                  ไม่มีพิกัด {noCoords}
                </span>
              </span>
            </div>
          );
        })()}
        <p className="mt-2 text-sm font-medium text-gray-600">
          {getCountText()}
        </p>
        {/* สถานะ GPS + ทางลัดไปหน้าตั้งจุดเริ่มต้น/ลองใหม่ */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`badge ${isRealTimeMode ? "badge-teal" : "badge-slate"}`}
          >
            {isRealTimeMode ? "GPS เรียลไทม์" : "ใช้จุดเริ่มต้นคงที่"}
          </span>
          <button
            type="button"
            onClick={() => setShowStartModal(true)}
            className="btn btn-secondary btn-sm"
          >
            <MapPin className="h-4 w-4" aria-hidden="true" />
            ตั้งจุดเริ่มต้น / ลองใหม่
          </button>
        </div>

        {/* โหมดมือ: ย้ายแถบปุ่มการทำงานไปด้านซ้ายหรือขวา */}
        <div
          role="group"
          aria-label="ตำแหน่งแถบปุ่มการทำงาน"
          className="mt-3 inline-flex rounded-full border border-gray-200 bg-white p-0.5"
        >
          <button
            type="button"
            onClick={() => changeHandMode("right")}
            aria-pressed={handMode === "right"}
            className={`flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors ${
              handMode === "right"
                ? "bg-teal-600 text-white"
                : "text-gray-600 hover:text-teal-700"
            }`}
          >
            <PanelRight className="h-4 w-4" aria-hidden="true" />
            มือขวา
          </button>
          <button
            type="button"
            onClick={() => changeHandMode("left")}
            aria-pressed={handMode === "left"}
            className={`flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors ${
              handMode === "left"
                ? "bg-teal-600 text-white"
                : "text-gray-600 hover:text-teal-700"
            }`}
          >
            <PanelLeft className="h-4 w-4" aria-hidden="true" />
            มือซ้าย
          </button>
        </div>
      </div>

      {/* Tab หลัก - เพิ่ม Tab "รอปิดยอด QR" */}
      <div className="mb-6">
        <div className="flex bg-gray-100 p-1 rounded-xl max-w-2xl overflow-x-auto">
          <button
            onClick={() => setViewMode("today")}
            className={`flex min-w-fit items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-bold transition-all ${
              viewMode === "today"
                ? "bg-teal-600 text-white shadow-sm"
                : "text-gray-600"
            }`}
          >
            วันนี้
            <span className="text-sm font-normal">
              (
              {
                list.filter(
                  (h) => !h.delivery_status || h.delivery_status === "pending",
                ).length
              }
              )
            </span>
          </button>

          <button
            onClick={() => setViewMode("delivered")}
            className={`flex min-w-fit items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-bold transition-all ${
              viewMode === "delivered"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-gray-600"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            ส่งแล้ว
            <span className="text-sm font-normal">
              ({list.filter((h) => h.delivery_status === "delivered").length})
            </span>
          </button>

          <button
            onClick={() => setViewMode("qr_pending")}
            className={`flex min-w-fit items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-bold transition-all ${
              viewMode === "qr_pending"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-gray-600"
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            QR
            <span className="text-sm font-normal">
              (
              {
                list.filter(
                  (h) =>
                    h.delivery_status === "delivered" &&
                    h.delivery_note?.includes("รอปิดยอด QR"),
                ).length
              }
              )
            </span>
          </button>

          <button
            onClick={() => setViewMode("reported")}
            className={`flex min-w-fit items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-bold transition-all ${
              viewMode === "reported"
                ? "bg-orange-600 text-white shadow-sm"
                : "text-gray-600"
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            รายงาน
            <span className="text-sm font-normal">
              ({list.filter((h) => h.delivery_status === "reported").length})
            </span>
          </button>

          <button
            onClick={() => setViewMode("calculator")}
            className={`px-5 py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 min-w-fit ${
              viewMode === "calculator"
                ? "bg-amber-600 text-white shadow-md"
                : "text-gray-600"
            }`}
          >
            <Calculator className="w-5 h-5" />
            คำนวณเป้า
          </button>
        </div>
      </div>

      {/* ช่องค้นหา + ปุ่มกรอง */}
      <div className="mb-6 relative">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="ค้นหาด้วยชื่อหรือที่อยู่..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clearSearch();
                searchInputRef.current?.focus();
              }}
              onMouseDown={(e) => e.preventDefault()}
              className="absolute right-12 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 z-10"
            >
              <XIcon className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setShowFilterModal(true)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            <Filter className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      </div>

      {/* ตัวกรองพิกัด + เรียงตามถนน – แถวเดียวแนวนอน */}
      <div className="mb-8 overflow-x-auto">
        <div className="flex items-center gap-6 md:gap-8 bg-gray-50 px-5 py-4 rounded-xl border border-gray-200 min-w-max">
          {(() => {
            const noCoordsCount = list.filter((h) => !h.lat || !h.lng).length;
            const withCoordsCount = list.filter((h) => h.lat && h.lng).length;

            return (
              <>
                {/* มีพิกัด */}
                <label className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={showWithCoords}
                    onChange={(e) => setShowWithCoords(e.target.checked)}
                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="flex items-center gap-2">
                    มีพิกัด
                    <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full min-w-[2rem]">
                      {withCoordsCount}
                    </span>
                  </span>
                </label>

                {/* ไม่มีพิกัด */}
                <label className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={showNoCoords}
                    onChange={(e) => setShowNoCoords(e.target.checked)}
                    className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <span className="flex items-center gap-2">
                    ไม่มีพิกัด
                    <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold text-orange-700 bg-orange-100 rounded-full min-w-[2rem]">
                      {noCoordsCount}
                    </span>
                  </span>
                </label>

                {/* เรียงตามถนน */}
                <label className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={sortByRoad}
                    onChange={(e) => setSortByRoad(e.target.checked)}
                    className="h-5 w-5 accent-teal-700"
                  />
                  <span className="flex items-center gap-2">
                    เรียงตามถนน
                    <span
                      className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-full min-w-[2rem] transition-colors ${
                        sortByRoad
                          ? "text-teal-700 bg-teal-50"
                          : "text-gray-600 bg-gray-200"
                      }`}
                    >
                      {sortByRoad ? "เปิด" : "ปิด"}
                    </span>
                  </span>
                </label>
              </>
            );
          })()}
        </div>
      </div>

      {viewMode === "calculator" ? (
        <div className="bg-white rounded-xl shadow p-4 max-w-md mx-auto border border-amber-100">
          <h2 className="text-base font-bold text-amber-800 mb-4 text-center flex items-center justify-center gap-2">
            <Calculator className="w-5 h-5 text-amber-600" />
            เป้าหมายวันนี้
          </h2>

          {/* ข้อมูลจริง - ด้านบน กระชับ */}
          <div className="bg-gray-50 rounded-lg p-4 mb-5 border border-gray-200 space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">
                รายชิ้นวันนี้
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={todayTotalPieces || ""}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  setTodayTotalPieces(raw ? Number(raw) : 0);
                }}
                className="w-full px-3 py-2 text-lg font-bold text-center border border-indigo-300 rounded-lg focus:border-indigo-500 focus:ring-1 outline-none"
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">
                ยอด COD วันนี้
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={codInput}
                onChange={(e) => {
                  const cleaned = e.target.value
                    .replace(/[^0-9.]/g, "")
                    .replace(/(\..*)\./g, "$1");

                  const limited =
                    cleaned.split(".")[1]?.length > 2
                      ? cleaned.slice(0, cleaned.lastIndexOf(".") + 3)
                      : cleaned;

                  setCodInput(limited);
                  setTodayCodAmount(limited ? Number(limited) : 0);
                }}
                className="w-full px-3 py-2 text-lg font-bold text-center border border-green-300 rounded-lg focus:border-green-500 focus:ring-1 outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* เป้า - กระชับมาก + แสดงทศนิยมครบ */}
          <div className="space-y-4">
            {/* เป้า COD - ทำเหมือนเป้าส่งชิ้น */}
            <div className="card-muted p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-amber-800">
                  เป้า COD วันนี้
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={targetCodPercent || ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      const num = raw ? Math.min(100, Number(raw)) : 0;
                      setTargetCodPercent(num);
                    }}
                    className="w-14 px-2 py-1.5 text-base font-bold text-center border border-amber-400 rounded-md focus:border-amber-600 focus:ring-1 outline-none bg-white"
                    placeholder="80"
                  />
                  <span className="text-base font-bold text-amber-700">%</span>
                </div>
              </div>

              {(() => {
                const total = todayCodAmount * (targetCodPercent / 100);
                const cash = total; // เงินสด = ยอดเป้าทั้งหมด (ตาม % ที่กรอก)
                const remaining = todayCodAmount - total; // ส่วนที่เหลือ (ยังไม่ถึงเป้า)

                return (
                  <div className="grid grid-cols-2 gap-3 text-center text-sm">
                    {/* ฝั่งสำเร็จ (เงินสด) */}
                    <div className="bg-white p-2 rounded-lg border border-amber-100">
                      <p className="text-xs text-gray-600">ปิด QR</p>
                      <p className="font-bold text-amber-700">
                        {cash.toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        ฿
                      </p>
                    </div>

                    {/* ฝั่งยังไม่ถึง (โอน/อื่น ๆ หรือขาด) */}
                    <div className="bg-white p-2 rounded-lg border border-amber-100 relative">
                      <p className="text-xs text-gray-600">ปิด เงินสด</p>
                      <p className="font-bold text-red-600">
                        {remaining.toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        ฿
                      </p>
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                        ≈
                        {todayCodAmount > 0
                          ? Math.round((remaining / todayCodAmount) * 100)
                          : 0}
                        %
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* เป้าส่งชิ้น */}
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-emerald-800">
                  เป้าส่งสำเร็จ
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={targetPiecePercent || ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      const num = raw ? Math.min(100, Number(raw)) : 0;
                      setTargetPiecePercent(num);
                    }}
                    className="w-14 px-2 py-1.5 text-base font-bold text-center border border-emerald-400 rounded-md focus:border-emerald-600 focus:ring-1 outline-none bg-white"
                    placeholder="95"
                  />
                  <span className="text-base font-bold text-emerald-700">
                    %
                  </span>
                </div>
              </div>
              {(() => {
                const success = Math.ceil(
                  todayTotalPieces * (targetPiecePercent / 100),
                );
                const fail = todayTotalPieces - success;
                return (
                  <div className="grid grid-cols-2 gap-3 text-center text-sm">
                    <div className="bg-white p-2 rounded-lg border border-emerald-100">
                      <p className="text-xs text-gray-600">ต้องส่งได้</p>
                      <p className="text-xl font-extrabold text-emerald-700">
                        {success}
                      </p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-emerald-100 relative">
                      <p className="text-xs text-gray-600">ส่งไม่ได้</p>
                      <p className="text-xl font-extrabold text-red-600">
                        {fail}
                      </p>
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                        ≈
                        {todayTotalPieces > 0
                          ? Math.round((fail / todayTotalPieces) * 100)
                          : 0}
                        %
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <p className="mt-4 text-xs text-gray-500 text-center italic">
            แก้ไขได้ตามต้องการ
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentHouses.map(
              (h: NavigationHouseWithDistance, index: number) => {
                // ลำดับที่ในรายการปัจจุบัน (รวม pagination)
                const displayOrder = startIndex + index + 1;
                return (
                  <div
                    key={h.nav_id}
                    className={`card relative flex overflow-hidden ${
                      handMode === "left" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 flex-col">

                    {/* === แสดงวันที่-เวลา มุมซ้ายบน (ไม่มีกรอบ) === */}
                    {(h.delivery_status === "delivered" ||
                      h.delivery_status === "reported") && (
                      <div
                        className="border-b border-gray-100 px-4 py-1.5 text-xs font-mono text-gray-500"
                        title={
                          h.delivery_status === "delivered"
                            ? h.delivered_at
                              ? new Date(h.delivered_at).toLocaleString(
                                  "th-TH",
                                  {
                                    dateStyle: "medium",
                                    timeStyle: "medium",
                                  },
                                )
                              : ""
                            : h.reported_at
                              ? new Date(h.reported_at).toLocaleString(
                                  "th-TH",
                                  {
                                    dateStyle: "medium",
                                    timeStyle: "medium",
                                  },
                                )
                              : ""
                        }
                      >
                        {(() => {
                          const isoString =
                            h.delivery_status === "delivered"
                              ? h.delivered_at
                              : h.reported_at;
                          if (!isoString) return null;
                          const date = new Date(isoString);
                          if (isNaN(date.getTime())) return "—";
                          const d = String(date.getDate()).padStart(2, "0");
                          const m = String(date.getMonth() + 1).padStart(
                            2,
                            "0",
                          );
                          const y = date.getFullYear() + 543;
                          const hh = String(date.getHours()).padStart(2, "0");
                          const mm = String(date.getMinutes()).padStart(2, "0");
                          const ss = String(date.getSeconds()).padStart(2, "0");
                          return `${d}/${m}/${y} || ${hh}:${mm}:${ss} น.`;
                        })()}
                      </div>
                    )}

                    <div className="relative flex flex-1 flex-col p-4 sm:p-5">
                      {/* ลำดับที่ + ชื่อ + สถานะพิกัด */}
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-lg font-extrabold text-teal-700">
                          #{displayOrder}
                        </span>
                        <h3 className="text-wrap-safe line-clamp-2 text-lg font-bold text-orange-700">
                          {h.full_name || "ไม่มีชื่อ"}
                        </h3>
                        {!h.lat && !h.lng && (
                          <span className="badge badge-amber">ไม่มีพิกัด</span>
                        )}
                      </div>
                      {h.phone && (
                        <div className="flex items-center gap-2 mt-2 group">
                          <p className="text-sm text-blue-700 select-none">
                            {h.phone}
                          </p>

                          {/* ปุ่ม Copy */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(h.phone!);
                              toast.success("คัดลอกเบอร์เรียบร้อยแล้ว!");
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                            title="คัดลอกเบอร์โทร"
                            aria-label="คัดลอกเบอร์โทร"
                          >
                            <Copy className="h-4 w-4" aria-hidden="true" />
                          </button>

                          {/* ปุ่ม โทร ออกทันที */}
                          <a
                            href={`tel:${h.phone}`}
                            onClick={(e) => e.stopPropagation()} // ป้องกัน bubble ไป card
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                            title="โทรหาลูกค้า"
                            aria-label="โทรหาลูกค้า"
                          >
                            <Phone className="h-4 w-4" aria-hidden="true" />
                          </a>
                        </div>
                      )}
                      <div className="flex items-start gap-2 mt-3 text-teal-800 text-sm">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-teal-600" />
                        <span className="text-wrap-safe line-clamp-3">
                          {h.address}
                        </span>
                      </div>

                      {/* ระยะทางโดยประมาณ */}
                      {h.distance !== undefined && h.distance < Infinity && (
                        <p className="text-xs text-gray-500 mt-3">
                          ระยะทางโดยประมาณ ~{" "}
                          <span className="font-bold text-teal-700">
                            {h.distance.toFixed(1)} กม.
                          </span>
                        </p>
                      )}

                      {/* หมายเหตุทั่วไปของบ้าน */}
                      {h.note && (
                        <div className="mt-3 text-xs">
                          <div className="flex">
                            <span className="shrink-0 font-semibold text-amber-700">
                              หมายเหตุ:{" "}
                            </span>
                            <div className="text-wrap-safe whitespace-pre-line text-amber-900">
                              {h.note}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* คนขับบันทึก (driver_note) */}
                      {h.driver_note && (
                        <div className="mt-2 text-xs">
                          <div className="flex">
                            <span className="font-semibold text-purple-700 shrink-0">
                              คนขับบันทึก:{" "}
                            </span>
                            <div className="text-wrap-safe whitespace-pre-line text-purple-900">
                              {h.driver_note}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* สถานะการส่ง - แสดงแบบสั้นทั้งในแท็บส่งแล้วและ QR */}
                      {h.delivery_status === "delivered" && (
                        <div className="mt-3">
                          <div
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-sm ${
                              h.delivery_note?.includes("จ่ายรวมเงินสด")
                                ? "bg-lime-600"
                                : h.delivery_note?.includes("เงินสด")
                                  ? "bg-amber-600"
                                  : h.delivery_note?.includes("โอนเข้าบัญชีฉัน")
                                    ? "bg-blue-600"
                                    : "bg-green-600"
                            }`}
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span className="line-clamp-1">
                              {formatShortDeliveryNote(h.delivery_note)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* สถานะรายงาน - แสดงแบบข้อความเต็ม ไม่มีไอคอน + รองรับหลายบรรทัด */}
                      {h.delivery_status === "reported" && h.report_reason && (
                        <div className="mt-3 text-xs">
                          <div
                            className={`flex items-start gap-1.5 px-3 py-1.5 rounded-full font-bold text-white shadow-sm ${
                              h.report_reason?.includes("โทรไม่รับ")
                                ? "bg-pink-600"
                                : h.report_reason?.includes("เลื่อน")
                                  ? "bg-orange-600"
                                  : h.report_reason?.includes("ตีกลับ")
                                    ? "bg-red-600"
                                    : "bg-gray-600"
                            }`}
                          >
                            <span className="font-semibold shrink-0 whitespace-nowrap">
                              รายงาน:{" "}
                            </span>
                            <span className="whitespace-pre-line">
                              {h.report_reason}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    </div>

                    {/* แถบปุ่มการทำงานแนวตั้ง - ไอคอนเท่านั้น */}
                    <div
                      role="group"
                      aria-label={`การทำงานของ ${h.full_name || "รายการนี้"}`}
                      className={`action-rail ${
                        handMode === "left" ? "border-r" : "border-l"
                      }`}
                    >
                      {/* นำทาง */}
                      {h.lat && h.lng && (
                        <button
                          type="button"
                          onClick={() => openNavigation(h.lat!, h.lng!)}
                          className="icon-btn icon-btn-teal"
                          title="นำทางด้วย Google Maps"
                          aria-label="นำทางด้วย Google Maps"
                        >
                          <Navigation className="h-5 w-5" aria-hidden="true" />
                        </button>
                      )}

                      {/* ส่งงาน / แก้ไขข้อมูลการส่ง */}
                      {h.delivery_status === "delivered" ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            rememberDialogTrigger(e.currentTarget);
                            setHouseToDeliver(h);
                            const note = h.delivery_note || "";
                            if (note.includes("จ่ายรวมเงินสด")) {
                              setDeliverNote("จ่ายรวมเงินสด");
                            } else if (note.includes("เงินสด")) {
                              setDeliverNote("จ่ายด้วยเงินสด");
                            } else if (note.includes("โอนเข้าบัญชีฉัน")) {
                              setDeliverNote("โอนเข้าบัญชีฉัน");
                            } else if (
                              note.includes("โอนเข้าบริษัท") ||
                              note === "โอนเข้าบริษัท"
                            ) {
                              setDeliverNote("โอนเข้าบริษัท");
                            } else if (note === "ไม่มียอด") {
                              setDeliverNote("ไม่มียอด");
                            } else {
                              setDeliverNote("อื่นๆ");
                              setDeliverNoteCustom(note.trim());
                            }
                            setShowDeliverModal(true);
                          }}
                          className="icon-btn icon-btn-warn"
                          title="แก้ไขข้อมูลการส่ง"
                          aria-label="แก้ไขข้อมูลการส่งของบ้านหลังนี้"
                        >
                          <Edit3 className="h-5 w-5" aria-hidden="true" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            rememberDialogTrigger(e.currentTarget);
                            setHouseToDeliver(h);
                            setShowDeliverModal(true);
                          }}
                          className="icon-btn icon-btn-primary"
                          title={
                            h.delivery_status === "reported"
                              ? "เปลี่ยนเป็นส่งแล้ว"
                              : "ส่งงาน"
                          }
                          aria-label={
                            h.delivery_status === "reported"
                              ? "เปลี่ยนสถานะเป็นส่งแล้ว"
                              : "บันทึกว่าส่งงานแล้ว"
                          }
                        >
                          <CheckCircle className="h-5 w-5" aria-hidden="true" />
                        </button>
                      )}

                      {/* คอมเมนต์ / ฝากข้อความ */}
                      <button
                        type="button"
                        onClick={(e) => {
                          rememberDialogTrigger(e.currentTarget);
                          openCommentModal(h);
                        }}
                        className="icon-btn"
                        title="บันทึกคอมเมนต์ / ฝากข้อความ"
                        aria-label="บันทึกคอมเมนต์ / ฝากข้อความ"
                      >
                        <MessageSquare className="h-5 w-5" aria-hidden="true" />
                      </button>

                      {/* รายงานปัญหา / แก้ไขหมายเหตุรายงาน */}
                      {(!h.delivery_status ||
                        h.delivery_status === "pending" ||
                        h.delivery_status === "reported") && (
                        <button
                          type="button"
                          onClick={(e) => {
                            rememberDialogTrigger(e.currentTarget);
                            setHouseToReport(h);
                            const existingReason = h.report_reason || "โทรไม่รับ";
                            if (
                              ["โทรไม่รับ", "เลื่อน", "ตีกลับ"].includes(
                                existingReason,
                              )
                            ) {
                              setReportReason(existingReason);
                              setReportReasonCustom("");
                            } else {
                              setReportReason("อื่นๆ");
                              setReportReasonCustom(existingReason);
                            }
                            setShowReportModal(true);
                          }}
                          className="icon-btn icon-btn-warn"
                          title={
                            h.delivery_status === "reported"
                              ? "แก้ไขหมายเหตุรายงาน"
                              : "รายงานปัญหา"
                          }
                          aria-label={
                            h.delivery_status === "reported"
                              ? "แก้ไขหมายเหตุรายงาน"
                              : "รายงานปัญหา"
                          }
                        >
                          <AlertCircle className="h-5 w-5" aria-hidden="true" />
                        </button>
                      )}

                      {/* แก้ไขข้อมูลบ้าน */}
                      <button
                        type="button"
                        onClick={(e) => {
                          rememberDialogTrigger(e.currentTarget);
                          openEditModal(h);
                        }}
                        className="icon-btn"
                        title="แก้ไขข้อมูลบ้าน"
                        aria-label="แก้ไขข้อมูลบ้าน"
                      >
                        <Edit3 className="h-5 w-5" aria-hidden="true" />
                      </button>

                      {/* ปิดยอด QR */}
                      {viewMode === "qr_pending" &&
                        h.delivery_status === "delivered" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              rememberDialogTrigger(e.currentTarget);
                              setHouseToDeliver(h);
                              setDeliverNote("โอนเข้าบริษัท");
                              setLocalCash("");
                              setLocalTransfer("");
                              setDeliverNoteCustom("");
                              setShowDeliverModal(true);
                            }}
                            className="icon-btn"
                            title="ปิดยอด QR แล้ว"
                            aria-label="ปิดยอด QR แล้ว"
                          >
                            <QrCode className="h-5 w-5" aria-hidden="true" />
                          </button>
                        )}

                      <div className="mt-auto w-full pt-2" aria-hidden="true">
                        <span className="mx-auto block h-px w-6 bg-gray-200" />
                      </div>

                      {/* ลบออกจากการนำทาง (แยกไว้ท้ายสุด กันกดพลาด) */}
                      <button
                        type="button"
                        onClick={() => removeFromNavigation(h.nav_id)}
                        className="icon-btn icon-btn-danger"
                        title="ลบออกจากการนำทาง"
                        aria-label="ลบออกจากการนำทาง"
                      >
                        <Trash2 className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              },
            )}
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 mb-20 flex flex-col items-center gap-4">
              {" "}
              {/* เพิ่ม mb-20 เพื่อไม่ให้ FAB ทับ */}
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={currentPage === 1}
                  className="w-10 h-10 rounded-lg bg-gray-200 disabled:opacity-50 hover:bg-gray-300 flex items-center justify-center transition active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  {renderPageNumbers()}
                </div>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={currentPage === totalPages}
                  className="w-10 h-10 rounded-lg bg-gray-200 disabled:opacity-50 hover:bg-gray-300 flex items-center justify-center transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 font-medium">
                หน้า {currentPage} จาก {totalPages} • แสดง {filteredList.length}{" "}
                รายการ
              </p>
            </div>
          )}
          {/* Input ไปหน้าตรง */}
          {showPageInput && (
            <div className="modal-overlay flex items-center justify-center p-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="nav-page-input-title"
                className="modal-sheet w-full max-w-xs p-5 sm:rounded-2xl sm:p-6"
              >
                <h3
                  id="nav-page-input-title"
                  className="mb-4 text-center text-lg font-semibold text-gray-900"
                >
                  ไปที่หน้า
                </h3>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={pageInputValue}
                  onChange={(e) => setPageInputValue(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handlePageInputSubmit()
                  }
                  className="input text-center text-lg"
                  placeholder={`1 - ${totalPages}`}
                />
                <div className="modal-foot flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPageInput(false);
                      setPageInputValue("");
                    }}
                    className="btn btn-secondary flex-1"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handlePageInputSubmit}
                    className="btn btn-primary flex-1"
                  >
                    ไป
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {/* FAB Menu ทั้งหมด - เมื่อปิดจะหายไปสนิท ไม่บังอะไรเลย */}
      {isFabOpen ? (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setIsFabOpen(false)}
          />
          {/* กลุ่มปุ่มย่อย + ปุ่มหลัก - แสดงเฉพาะตอนเปิด */}
          <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end">
            <div className="flex flex-col items-end gap-4 mb-4">
              <button
                type="button"
                onClick={clearAllNavigation}
                onMouseDown={(e) => e.preventDefault()}
                className="flex items-center gap-3 px-6 py-3.5 bg-red-600 text-white rounded-2xl shadow-lg hover:bg-red-700 transition-all hover:shadow-xl min-w-44 active:scale-95"
              >
                <Trash className="w-5 h-5" />
                <span className="text-base font-medium">ลบทั้งหมด</span>
              </button>

              <button
                type="button"
                onClick={openFullRoute}
                onMouseDown={(e) => e.preventDefault()}
                className="flex min-w-44 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-6 py-3.5 text-gray-900 shadow-lg transition-all hover:bg-gray-50 active:scale-95"
              >
                <Map className="w-5 h-5" />
                <span className="text-base font-medium">เส้นทางทั้งหมด</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowStartModal(true);
                  setIsFabOpen(false);
                }}
                onMouseDown={(e) => e.preventDefault()}
                className="flex min-w-44 items-center gap-3 rounded-2xl bg-teal-600 px-6 py-3.5 text-white shadow-lg transition-all hover:bg-teal-700 active:scale-95"
              >
                <MapPin className="w-5 h-5" />
                <span className="text-base font-medium">ตั้งจุดเริ่มต้น</span>
              </button>
            </div>
            {/* ปุ่มหลัก - แสดงตอนเปิด (หมุนลูกศร) */}
            <button
              type="button"
              onClick={() => setIsFabOpen(false)}
              aria-label="ปิดเมนูเครื่องมือ"
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-teal-700 active:scale-95"
            >
              <ChevronUp
                className="h-6 w-6 rotate-180 transition-transform duration-300"
                aria-hidden="true"
              />
            </button>
          </div>
        </>
      ) : (
        /* เมื่อปิด FAB - แสดงเฉพาะปุ่มหลักตัวเดียว (ไม่หมุนลูกศร) */
        <div className="fixed bottom-20 right-4 z-50">
          <button
            type="button"
            onClick={() => setIsFabOpen(true)}
            aria-label="เปิดเมนูเครื่องมือ"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-teal-700 active:scale-95"
          >
            <ChevronUp
              className="h-6 w-6 transition-transform duration-300"
              aria-hidden="true"
            />
          </button>
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="modal-overlay flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="nav-filter-title"
            className="modal-sheet w-full max-w-md p-5 sm:rounded-2xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="nav-filter-title" className="text-lg font-bold">
                ตัวกรองบ้าน
              </h2>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                aria-label="ปิดตัวกรอง"
                className="icon-btn h-10 w-10 shrink-0"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {/* เลือกค้นหาจากฟิลด์ไหน */}
            <div className="card-muted mb-5 p-4">
              <p className="section-label mb-3">ช่องค้นหาหลักจะค้นหาจาก</p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchInName}
                    onChange={(e) => setSearchInName(e.target.checked)}
                    className="h-5 w-5 accent-teal-700"
                  />
                  <span className="text-sm font-medium">ชื่อ-นามสกุล</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchInAddress}
                    onChange={(e) => setSearchInAddress(e.target.checked)}
                    className="h-5 w-5 accent-teal-700"
                  />
                  <span className="text-sm font-medium">ที่อยู่</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchInPhone}
                    onChange={(e) => setSearchInPhone(e.target.checked)}
                    className="h-5 w-5 accent-teal-700"
                  />
                  <span className="text-sm font-medium">เบอร์โทรศัพท์</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchInNote}
                    onChange={(e) => setSearchInNote(e.target.checked)}
                    className="h-5 w-5 accent-teal-700"
                  />
                  <span className="text-sm font-medium">หมายเหตุ</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchInDriverNote}
                    onChange={(e) => setSearchInDriverNote(e.target.checked)}
                    className="h-5 w-5 accent-teal-700"
                  />
                  <span className="text-sm font-medium">คนขับบันทึก</span>
                </label>
              </div>
            </div>
            {/* ส่วนเดิม: ตัวกรองอื่น ๆ */}
            <div className="space-y-4">
              <input
                type="text"
                placeholder="บ้านเลขที่"
                value={houseNumberFilter}
                onChange={(e) => setHouseNumberFilter(e.target.value)}
                aria-label="บ้านเลขที่"
                className="input"
              />
              <input
                type="text"
                placeholder="เบอร์โทร"
                value={phoneFilter}
                onChange={(e) =>
                  setPhoneFilter(e.target.value.replace(/\D/g, ""))
                }
                aria-label="เบอร์โทร"
                className="input"
              />
              <input
                type="text"
                placeholder="หมู่ที่ (แค่เลข)"
                value={villageFilter}
                onChange={(e) =>
                  setVillageFilter(e.target.value.replace(/[^\d]/g, ""))
                }
                aria-label="หมู่ที่"
                className="input"
              />
              <input
                type="text"
                placeholder="ตำบล"
                value={subdistrictFilter}
                onChange={(e) => setSubdistrictFilter(e.target.value)}
                className="input"
              />
              <input
                type="text"
                placeholder="อำเภอ"
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="input"
              />
              <input
                type="text"
                placeholder="จังหวัด"
                value={provinceFilter}
                onChange={(e) => setProvinceFilter(e.target.value)}
                className="input"
              />
            </div>
            <div className="modal-foot flex gap-3">
              <button
                type="button"
                onClick={() => {
                  clearFilters();
                  // รีเซ็ตค่าค้นหาด้วย (ตามค่าที่หน้านี้ใช้จริง)
                  setSearchInName(true);
                  setSearchInAddress(true);
                  setSearchInPhone(false);
                  setSearchInNote(true);
                  setShowFilterModal(false);
                }}
                className="btn btn-secondary flex-1"
              >
                ล้างทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="btn btn-primary flex-1"
              >
                ใช้ตัวกรอง
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal แก้ไขบ้าน */}
      {editingHouse && (
        <div className="modal-overlay flex items-center justify-center p-4">
          <div role="dialog"
          aria-modal="true"
          className="modal-sheet w-full max-w-sm p-5 sm:rounded-2xl sm:p-6">
            <h2 className="text-xl font-bold mb-5">แก้ไขบ้าน</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="ชื่อ-นามสกุล"
                value={formData.full_name || ""}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, full_name: e.target.value }))
                }
                className="input"
              />
              <input
                type="text"
                placeholder="เบอร์โทรศัพท์"
                value={formData.phone || ""}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, phone: e.target.value }))
                }
                className="input"
              />
              <div className="relative">
                <input
                  type="text"
                  placeholder="ที่อยู่เต็ม (พิมพ์บ้านเลขที่ → space → เลือกหมู่ที่ → space → เลือกหมู่บ้าน → space → เลือกตำบล)"
                  value={addressInput}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  onKeyDown={handleAddressKeyDown}
                  className="input"
                />
                {/* Dropdown แนะนำที่อยู่ */}
                {addressSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                    {addressSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()} // ป้องกันเสีย focus
                        onClick={() => selectAddressSuggestion(suggestion)}
                        className={`w-full text-left px-4 py-3 text-sm transition hover:bg-teal-50 ${
                          index === highlightedSuggestionIndex
                            ? "bg-teal-100"
                            : ""
                        }`}
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <textarea
                placeholder="หมายเหตุ (เช่น ข้างศูนย์เด็กเล็ก, หลังอบต.)"
                rows={2}
                value={formData.note || ""}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, note: e.target.value }))
                }
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
              />
              <button
                onClick={detectLocation}
                disabled={isDetecting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
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
                placeholder="พิกัด (lat,lng) เช่น 16.123456,99.123456"
                value={
                  formData.lat && formData.lng
                    ? `${formData.lat.toFixed(6)},${formData.lng.toFixed(6)}`
                    : ""
                }
                onChange={(e) => {
                  const value = e.target.value.trim();

                  // ถ้าช่องว่าง → ถือว่าต้องการลบพิกัด
                  if (value === "") {
                    setFormData((prev) => ({ ...prev, lat: null, lng: null }));
                    return;
                  }

                  const parts = value.split(",");
                  if (parts.length !== 2) {
                    // รูปแบบไม่ครบ → ถือว่าไม่ต้องการพิกัด (หรือจะปล่อยไว้ก็ได้ แต่ที่นี่ให้ลบ)
                    setFormData((prev) => ({ ...prev, lat: null, lng: null }));
                    return;
                  }

                  const latStr = parts[0].trim();
                  const lngStr = parts[1].trim();

                  const lat = parseFloat(latStr);
                  const lng = parseFloat(lngStr);

                  if (
                    !isNaN(lat) &&
                    !isNaN(lng) &&
                    latStr !== "" &&
                    lngStr !== ""
                  ) {
                    setFormData((prev) => ({ ...prev, lat, lng }));
                  } else {
                    // รูปแบบผิด → ลบพิกัด
                    setFormData((prev) => ({ ...prev, lat: null, lng: null }));
                  }
                }}
                className="input"
              />

              {formData.lat == null && formData.lng == null && (
                <p className="text-xs text-gray-500 mt-1">
                  ไม่มีพิกัด (บ้านนี้จะไม่แสดงบนแผนที่/การนำทาง)
                </p>
              )}
              {formData.lat && formData.lng && (
                <div className="text-center -mt-2 mb-2">
                  <button
                    onClick={() => verifyOnMaps(formData.lat!, formData.lng!)}
                    className="text-blue-600 text-xs underline flex items-center gap-1 mx-auto"
                  >
                    <ExternalLink className="w-3 h-3" />
                    ตรวจสอบบน Google Maps
                  </button>
                </div>
              )}
              <div className="modal-foot flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-secondary flex-1 py-2.5"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={saveHouse}
                  className="btn btn-primary flex-1"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal ตั้งจุดเริ่มต้นทาง */}
      {showStartModal && (
        <div className="modal-overlay flex items-center justify-center p-4">
          <div role="dialog"
          aria-modal="true"
          className="modal-sheet w-full max-w-sm p-5 sm:rounded-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">
                ตั้งจุดเริ่มต้นทาง
              </h2>
              <button onClick={() => setShowStartModal(false)}>
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>
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
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  const newMode = !isRealTimeMode;
                  setIsRealTimeMode(newMode);
                  let storageOk = true;
                  try {
                    localStorage.setItem(
                      "navigationRealTimeMode",
                      newMode.toString(),
                    );
                    if (newMode) {
                      localStorage.removeItem("navigationStartPosition");
                    }
                  } catch {
                    // พื้นที่จัดเก็บถูกปิด/เต็ม — ยังสลับโหมดได้ในหน้านี้
                    storageOk = false;
                  }
                  if (newMode) {
                    setStartPosition(null);
                  }
                  if (storageOk) {
                    toast.success(
                      newMode
                        ? "เปิดโหมดเรียลไทม์แล้ว"
                        : "ปิดโหมดเรียลไทม์ – ใช้ค่าคงที่",
                    );
                  } else {
                    toast.error(
                      "บันทึกโหมดลงเครื่องไม่สำเร็จ แต่ยังใช้โหมดนี้ในหน้านี้ได้",
                    );
                  }
                  setShowStartModal(false);
                }}
                className={`py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  isRealTimeMode
                    ? "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
                    : "bg-teal-600 text-white hover:bg-teal-700"
                }`}
              >
                {isRealTimeMode ? <>ปิดเรียลไทม์</> : <>เปิดเรียลไทม์</>}
              </button>
              <button
                onClick={handleSetStartPosition}
                disabled={
                  isDetecting ||
                  (detectedStartLat === null && detectedStartLng === null)
                }
                className="btn btn-primary py-3"
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

      {/* Modal ยืนยันส่งแล้ว */}
      {showDeliverModal && houseToDeliver && (
        <div className="modal-overlay flex items-center justify-center p-4">
          <div role="dialog"
          aria-modal="true"
          className="modal-sheet w-full max-w-sm p-5 sm:rounded-2xl sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-teal-700">ยืนยันส่งแล้ว</h2>

            <div className="bg-gray-50 p-4 rounded-xl mb-4">
              <p className="font-bold">{houseToDeliver.full_name}</p>
              <p className="text-sm text-gray-600">{houseToDeliver.phone}</p>
              <p className="text-xs text-gray-500 line-clamp-2">
                {houseToDeliver.address}
              </p>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                การชำระเงิน
              </label>

              <div className="grid grid-cols-2 gap-3 mb-3">
                {[
                  "โอนเข้าบริษัท",
                  "จ่ายด้วยเงินสด",
                  "จ่ายรวมเงินสด",
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

              {/* จำนวนเงินสด */}
              {(deliverNote === "จ่ายด้วยเงินสด" ||
                deliverNote === "จ่ายรวมเงินสด") && (
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="จำนวนเงิน (บาท) เช่น 1250.50"
                      value={localCash}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d*\.?\d{0,2}$/.test(value) || value === "") {
                          setLocalCash(value);
                        }
                      }}
                      className="input text-center text-lg font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCalculatorInput("");
                        setCalculatorResult(null);
                        setShowCalculatorModal(true);
                      }}
                      className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition shadow-md"
                      title="เปิดเครื่องคิดเลขคำนวณเงินทอน"
                    >
                      <Calculator className="w-6 h-6" />
                    </button>
                  </div>
                  {localCash && parseFloat(localCash) > 0 && (
                    <p className="text-xs text-green-700 text-center mt-2">
                      ยอดที่ต้องชำระ:{" "}
                      {parseFloat(localCash).toLocaleString("th-TH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      บาท
                    </p>
                  )}
                </div>
              )}

              {/* จำนวนเงินโอน */}
              {deliverNote === "โอนเข้าบัญชีฉัน" && (
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="จำนวนเงิน (บาท) เช่น 1250.50"
                      value={localTransfer}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d*\.?\d{0,2}$/.test(value) || value === "") {
                          setLocalTransfer(value);
                        }
                      }}
                      className="input text-center text-lg font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCalculatorInput("");
                        setCalculatorResult(null);
                        setShowCalculatorModal(true);
                        // ปิด keyboard ทันที
                        if (document.activeElement instanceof HTMLElement) {
                          document.activeElement.blur();
                        }
                      }}
                      className="p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 active:scale-95 transition shadow-md"
                      title="เครื่องคิดเลขเงินทอน"
                    >
                      <Calculator className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              )}
              {/* อื่นๆ */}
              {deliverNote === "อื่นๆ" && (
                <textarea
                  placeholder="กรอกรายละเอียดการชำระเงิน..."
                  value={deliverNoteCustom}
                  onChange={(e) => setDeliverNoteCustom(e.target.value)}
                  rows={3}
                  className="input mt-4 resize-none"
                />
              )}

              {/* Preview */}
              <div className="mt-4 p-3 bg-green-50 rounded-xl">
                <p className="text-sm text-green-800 font-medium">
                  หมายเหตุที่จะบันทึก:
                  <span className="block font-bold mt-1">
                    {deliverNote === "จ่ายด้วยเงินสด" ||
                    deliverNote === "จ่ายรวมเงินสด"
                      ? localCash
                        ? `${deliverNote} ${Number(localCash).toLocaleString(
                            "th-TH",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )} บาท`
                        : "กรอกจำนวนเงิน"
                      : deliverNote === "โอนเข้าบัญชีฉัน"
                        ? localTransfer
                          ? `โอนเข้าบัญชีฉัน ${Number(
                              localTransfer,
                            ).toLocaleString("th-TH", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })} บาท`
                          : "กรอกจำนวนเงิน"
                        : deliverNote === "อื่นๆ"
                          ? deliverNoteCustom.trim() || "กำลังกรอกรายละเอียด..."
                          : deliverNote}
                  </span>
                </p>
              </div>
            </div>

            <div className="modal-foot flex gap-3">
              <button
                onClick={() => {
                  setShowDeliverModal(false);
                  setDeliverNote("โอนเข้าบริษัท");
                  setDeliverNoteCustom("");
                  // ไม่ต้อง reset localCash / localTransfer เพราะ useEffect จะจัดการตอนเปิด modal ใหม่
                }}
                className="btn btn-secondary flex-1 py-3"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={() => confirmDeliver(localCash, localTransfer)}
                disabled={
                  isDeliverSubmitting ||
                  ((deliverNote === "จ่ายด้วยเงินสด" ||
                    deliverNote === "จ่ายรวมเงินสด") &&
                    !localCash.trim()) ||
                  (deliverNote === "โอนเข้าบัญชีฉัน" &&
                    !localTransfer.trim()) ||
                  (deliverNote === "อื่นๆ" && !deliverNoteCustom.trim())
                }
                className="btn btn-primary flex-1 py-3"
              >
                {isDeliverSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    กำลังบันทึก...
                  </>
                ) : (
                  "ส่งแล้ว"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal บันทึกคอมเมนต์ */}
      {showCommentModal && houseToComment && (
        <div className="modal-overlay flex items-center justify-center p-4">
          <div role="dialog"
          aria-modal="true"
          className="modal-sheet w-full max-w-sm p-5 sm:rounded-2xl sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              บันทึกคอมเมนต์ / ฝากข้อความ
            </h2>

            {/* ข้อมูลบ้าน */}
            <div className="bg-gray-50 p-4 rounded-xl mb-5">
              <p className="font-bold">{houseToComment.full_name}</p>
              <p className="text-sm text-gray-600">{houseToComment.phone}</p>
              <p className="text-xs text-gray-500 line-clamp-2">
                {houseToComment.address}
              </p>
            </div>

            {/* ช่องกรอกคอมเมนต์ */}
            <textarea
              placeholder="เช่น: เจ้านี้ให้ส่งของไปที่หน้าบ้าน / ฝากเงินกับแม่บ้าน / ต้องโทรก่อนถึง..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={5}
              className="input resize-none"
            />

            {/* Preview */}
            <div className="card-muted p-3">
              <p className="text-sm font-medium text-gray-700">
                คอมเมนต์ที่จะบันทึก:
                <span className="block font-bold mt-1">
                  {commentText.trim() || "ยังไม่ได้กรอก..."}
                </span>
              </p>
            </div>

            {/* ปุ่ม */}
            <div className="modal-foot flex gap-3">
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setCommentText("");
                }}
                className="btn btn-secondary flex-1 py-3"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmComment}
                disabled={isCommentSubmitting}
                className="btn btn-primary flex-1 py-3"
              >
                {isCommentSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  "บันทึกคอมเมนต์"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal เครื่องคิดเลข - เวอร์ชันปรับปรุงสำหรับใช้งานตอนขับรถ (ไม่มีปุ่มใช้ยอดนี้) */}
      {showCalculatorModal && (
        <div className="modal-overlay flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="เครื่องคิดเลขเงินทอน"
            className="modal-sheet w-full max-w-md p-0 sm:max-w-lg"
          >
            {/* Header */}
            <div className="bg-teal-700 text-white p-4 text-center rounded-t-[1rem]">
              <h3 className="text-lg font-bold">เครื่องคิดเลขเงินทอน</h3>
            </div>

            {/* ยอดที่ต้องชำระ */}
            <div className="p-4 bg-gray-50 text-center border-b">
              <p className="text-xs text-gray-600">ยอดที่ต้องชำระ</p>
              <p className="text-2xl font-bold text-indigo-700 mt-1">
                {(() => {
                  const amount = deliverNote.includes("เงินสด")
                    ? localCash
                    : localTransfer;
                  return amount && parseFloat(amount) > 0
                    ? parseFloat(amount).toLocaleString("th-TH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }) + " บาท"
                    : "—";
                })()}
              </p>
            </div>

            {/* ช่องแสดงเงินที่จ่าย + ผลลัพธ์เงินทอน (แสดงตลอด) */}
            <div className="p-5 bg-gray-100">
              {/* เงินที่จ่าย */}
              <div className="bg-white rounded-xl px-4 py-6 text-center shadow-inner mb-4">
                <p className="text-4xl font-bold text-gray-800">
                  {calculatorInput || "0"}
                </p>
                <p className="text-sm text-gray-500 mt-1">บาทที่ได้รับ</p>
              </div>

              {/* ผลลัพธ์เงินทอน/ขาด - แสดงตลอด */}
              <div
                className={`py-4 px-5 rounded-xl text-center text-xl font-bold transition-all ${
                  calculatorResult?.includes("เงินทอน")
                    ? "bg-green-100 text-green-800 border-2 border-green-300"
                    : calculatorResult?.includes("ขาด")
                      ? "bg-red-100 text-red-800 border-2 border-red-300"
                      : "bg-gray-100 text-gray-600 border border-gray-300"
                }`}
              >
                {calculatorResult || "รอกรอกจำนวนเงินที่จ่าย"}
              </div>
            </div>

            {/* แป้นตัวเลข */}
            <div className="grid grid-cols-4 gap-2 p-4 bg-gray-50">
              {["1", "2", "3", "C"].map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    if (key === "C") {
                      setCalculatorInput("");
                      setCalculatorResult(null);
                    } else {
                      setCalculatorInput((prev) => {
                        const newVal = prev + key;
                        updateChangeResult(newVal);
                        return newVal;
                      });
                    }
                  }}
                  className="h-16 text-2xl font-bold bg-white rounded-xl shadow-md hover:bg-gray-100 active:scale-95 transition-transform"
                >
                  {key}
                </button>
              ))}

              {["4", "5", "6", "00"].map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    setCalculatorInput((prev) => {
                      const newVal = prev + key;
                      updateChangeResult(newVal);
                      return newVal;
                    });
                  }}
                  className="h-16 text-2xl font-bold bg-white rounded-xl shadow-md hover:bg-gray-100 active:scale-95 transition-transform"
                >
                  {key}
                </button>
              ))}

              {["7", "8", "9", ""].map((key, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (index === 3) {
                      // Backspace
                      setCalculatorInput((prev) => {
                        const newVal = prev.slice(0, -1);
                        updateChangeResult(newVal);
                        return newVal;
                      });
                    } else {
                      setCalculatorInput((prev) => {
                        const newVal = prev + key;
                        updateChangeResult(newVal);
                        return newVal;
                      });
                    }
                  }}
                  className={`h-16 text-2xl font-bold rounded-xl shadow-md active:scale-95 transition-transform ${
                    index === 3
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : "bg-white hover:bg-gray-100"
                  }`}
                >
                  {index === 3 ? "←" : key}
                </button>
              ))}

              <button
                onClick={() => {
                  setCalculatorInput((prev) => {
                    const newVal = prev + "0";
                    updateChangeResult(newVal);
                    return newVal;
                  });
                }}
                className="h-16 text-2xl font-bold bg-white rounded-xl shadow-md hover:bg-gray-100 active:scale-95 transition-transform"
              >
                0
              </button>
            </div>

            {/* ปุ่มปิด - เต็มความกว้าง */}
            <div className="px-4 pb-5">
              <button
                onClick={() => setShowCalculatorModal(false)}
                className="w-full py-4 bg-gray-200 rounded-xl font-medium hover:bg-gray-300 active:scale-95 transition text-lg"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal รายงานปัญหา */}
      {showReportModal && houseToReport && (
        <div className="modal-overlay flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="modal-sheet w-full max-w-sm p-5 sm:rounded-2xl sm:p-6"
          >
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              รายงานปัญหา / ฝากไว้ก่อน
            </h2>
            {/* ข้อมูลบ้าน */}
            <div className="bg-gray-50 p-4 rounded-xl mb-4">
              <p className="font-bold">{houseToReport.full_name}</p>
              <p className="text-sm text-gray-600">{houseToReport.phone}</p>
              <p className="text-xs text-gray-500 line-clamp-2">
                {houseToReport.address}
              </p>
            </div>
            {/* เลือกเหตุผล */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                เหตุผลการรายงาน
              </label>
              <div className="grid grid-cols-2 gap-3">
                {["โทรไม่รับ", "เลื่อน", "ตีกลับ", "อื่นๆ"].map((option) => (
                  <button
                    key={option}
                    onClick={() => setReportReason(option)}
                    className={`py-3 px-4 rounded-xl font-medium transition-all border-2 ${
                      reportReason === option
                        ? "bg-orange-600 text-white border-orange-600 shadow-md"
                        : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {/* ถ้าเลือก "อื่นๆ" ให้กรอกรายละเอียดเพิ่ม */}
              {reportReason === "อื่นๆ" && (
                <textarea
                  placeholder="กรอกรายละเอียดเหตุผลเพิ่มเติม..."
                  value={reportReasonCustom || ""}
                  onChange={(e) => setReportReasonCustom(e.target.value)}
                  rows={3}
                  className="input mt-4 resize-none"
                />
              )}
              {/* Preview เหตุผลที่เลือก */}
              <div className="mt-4 p-3 bg-orange-50 rounded-xl">
                <p className="text-sm text-orange-800 font-medium">
                  เหตุผลที่จะบันทึก:{" "}
                  <span className="font-bold">
                    {reportReason === "อื่นๆ"
                      ? reportReasonCustom?.trim() || "กำลังกรอกรายละเอียด..."
                      : reportReason}
                  </span>
                </p>
              </div>
            </div>
            {/* ปุ่มยืนยัน / ยกเลิก */}
            <div className="modal-foot flex gap-3">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setHouseToReport(null);
                  setReportReason("โทรไม่รับ"); // รีเซ็ตกลับค่าเริ่มต้น
                  setReportReasonCustom("");
                }}
                className="btn btn-secondary flex-1 py-3"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmReport}
                disabled={
                  isReportSubmitting ||
                  !reportReason ||
                  (reportReason === "อื่นๆ" && !reportReasonCustom?.trim())
                }
                className="btn btn-primary flex-1 py-3"
              >
                {isReportSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    กำลังบันทึก...
                  </>
                ) : (
                  "รายงานแล้ว"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
