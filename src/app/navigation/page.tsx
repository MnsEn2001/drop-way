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
} from "lucide-react";
import { toast } from "react-hot-toast";

const ITEMS_PER_PAGE = 20;

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

  // ตัวกรองเพิ่มเติม
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [houseNumberFilter, setHouseNumberFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [villageFilter, setVillageFilter] = useState("");
  const [subdistrictFilter, setSubdistrictFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [showPageInput, setShowPageInput] = useState(false);
  const [pageInputValue, setPageInputValue] = useState("");

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
    ประดาง: ["ทุ่งกง", "คลองเชียงทอง", "ประดาง", "โตงเตง", "ท่าตะคร้อ"],
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
  // View Mode: today | delivered | reported
  const [viewMode, setViewMode] = useState<"today" | "delivered" | "reported">(
    "today",
  );

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
  const [reportReason, setReportReason] = useState("");

  const watchIdRef = useRef<number | null>(null);
  const router = useRouter();

  // Ref เพื่อเก็บค่าตัวกรองก่อนหน้า — ใช้ป้องกันการรีเซ็ตหน้าโดยไม่จำเป็น
  const prevFiltersRef = useRef<{
    viewMode: "today" | "delivered" | "reported";
    searchTerm: string;
    showNoCoords: boolean;
    showWithCoords: boolean;
    houseNumberFilter: string;
    phoneFilter: string;
    villageFilter: string;
    subdistrictFilter: string;
    districtFilter: string;
    provinceFilter: string;
  }>({
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
  });

  // โหลดค่าจุดคงที่จาก localStorage
  useEffect(() => {
    const saved = localStorage.getItem("navigationStartPosition");
    const savedMode = localStorage.getItem("navigationRealTimeMode");
    if (saved) {
      const pos = JSON.parse(saved);
      setStartPosition(pos);
      setIsRealTimeMode(savedMode !== "false");
    } else {
      setIsRealTimeMode(true);
    }
  }, []);

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
    supabase
      .from("navigation_view")
      .select("*")
      .order("nav_priority", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          setList(data);
        }
        setLoading(false);
      });
  }, []);

  // เริ่ม/หยุด watchPosition ตามโหมด
  useEffect(() => {
    if (isRealTimeMode) {
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCurrentPosition({ lat, lng });
        },
        (err) => {
          toast.error("ไม่สามารถติดตามตำแหน่งได้: " + err.message);
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
      }
    };
  }, [isRealTimeMode]);

  // จัดเรียงตามระยะทางเมื่อตำแหน่งเปลี่ยน
  useEffect(() => {
    const position = isRealTimeMode ? currentPosition : startPosition;
    if (!position || list.length === 0) {
      setSortedList(list as NavigationHouseWithDistance[]);
      return;
    }
    const withDistance: NavigationHouseWithDistance[] = list.map((h) => ({
      ...h,
      distance:
        h.lat && h.lng
          ? getDistanceFromLatLon(position.lat, position.lng, h.lat, h.lng)
          : Infinity,
    }));
    const sorted = [...withDistance].sort((a, b) => a.distance - b.distance);
    setSortedList(sorted);
  }, [list, currentPosition, startPosition, isRealTimeMode]);

  // กรองข้อมูล (ใช้ sortedList เป็นฐาน)
  useEffect(() => {
    let filtered: NavigationHouseWithDistance[] = sortedList;

    // กรองตาม viewMode
    if (viewMode === "delivered") {
      filtered = filtered.filter((h) => h.delivery_status === "delivered");
    } else if (viewMode === "reported") {
      filtered = filtered.filter((h) => h.delivery_status === "reported");
    } else {
      filtered = filtered.filter(
        (h) => !h.delivery_status || h.delivery_status === "pending",
      );
    }

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (h) =>
          h.full_name?.toLowerCase().includes(lower) ||
          h.address?.toLowerCase().includes(lower),
      );
    }

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

    // ตรวจสอบว่าตัวกรองเปลี่ยนจริงหรือไม่ → ค่อยรีเซ็ตหน้า 1
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
      prev.provinceFilter !== currentFilters.provinceFilter;

    if (hasChanged) {
      setCurrentPage(1);
    }

    // อัปเดตค่าเก่าสำหรับรอบถัดไป
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
  ]);

  const clearSearch = () => setSearchTerm("");
  const clearFilters = () => {
    setHouseNumberFilter("");
    setPhoneFilter("");
    setVillageFilter("");
    setSubdistrictFilter("");
    setDistrictFilter("");
    setProvinceFilter("");
  };

  const getCountText = () => {
    const displayedCount = filteredList.length;
    const totalInList = list.length;

    let modeText = "";
    if (viewMode === "delivered") modeText = "ส่งแล้ว";
    else if (viewMode === "reported") modeText = "รายงาน";
    else modeText = "วันนี้";

    // ตรวจสอบว่ามีการกรองหรือค้นหาอะไรอยู่หรือไม่
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

    if (hasFilter) {
      return `${modeText} • กรองแล้ว • พบ ${displayedCount} บ้าน (จากทั้งหมด ${totalInList})`;
    }

    // ถ้าเป็นโหมดวันนี้ และมีตำแหน่ง (เรียงตามระยะทาง)
    const position = isRealTimeMode ? currentPosition : startPosition;
    if (viewMode === "today" && position) {
      return `${modeText} • เรียงตามระยะห่าง • พบ ${displayedCount} บ้าน`;
    }

    return `${modeText} • พบ ${displayedCount} บ้าน`;
  };

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

    // 1. พิมพ์บ้านเลขที่แล้วกด space → แนะนำ ม.1-25
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
      return;
    }

    // 2. มี ม.เลข แล้วกด space → แนะนำ บ.หมู่บ้าน (ทุกตำบลก่อน)
    if (trimmed.match(/ม\.\d+$/) && /\s$/.test(input)) {
      const allVillages = Array.from(
        new Set(Object.values(villageBySubdistrict).flat()),
      );
      setAddressSuggestions(
        allVillages.map((v) => ({
          label: `บ.${v}`,
          value: `บ.${v} `,
        })),
      );
      return;
    }

    // 3. มี บ.ชื่อหมู่บ้าน แล้วกด space → แนะนำ ต.
    if (trimmed.match(/บ\.[^ ]+$/) && /\s$/.test(input)) {
      setAddressSuggestions(
        subdistricts.map((sd) => ({
          label: `ต.${sd}`,
          value: `ต.${sd}`,
        })),
      );
      return;
    }

    // 4. พิมพ์ ต. แล้วกำลังพิมพ์ → filter ตำบล
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

    // ไม่มีอะไรตรง → ล้าง
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
                ? "bg-indigo-600 text-white"
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
              ? "bg-indigo-600 text-white"
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
    const maxPoints = 20;
    const housesToUse = validHouses.slice(0, maxPoints);
    const coords = [
      `${position.lat},${position.lng}`,
      ...housesToUse.map((h) => `${h.lat},${h.lng}`),
    ].join("/");
    const url = `https://www.google.com/maps/dir/${coords}`;
    window.open(url, "_blank");
    const total = validHouses.length;
    const used = housesToUse.length;
    const msg =
      used < total
        ? `เปิดเส้นทาง ${used} จุดแรก (จากทั้งหมด ${total} จุด)`
        : `เปิดเส้นทางทั้งหมด ${used} จุด`;
    toast.success(msg);
    setIsFabOpen(false);
  };

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
    // สำคัญ: sync addressInput
    setAddressInput(house.address || "");
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

    const { error } = await supabase
      .from("houses")
      .update(formData)
      .eq("id", editingHouse.house_id);

    if (error) {
      toast.error("บันทึกไม่สำเร็จ: " + error.message);
    } else {
      toast.success("บันทึกสำเร็จ");

      // รีโหลดข้อมูลล่าสุดจาก navigation_view
      const { data, error: loadError } = await supabase
        .from("navigation_view")
        .select("*")
        .order("nav_priority", { ascending: true });

      if (!loadError && data) {
        setList(data);
      }

      closeModal();
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
    setStartPosition(pos);
    localStorage.setItem("navigationStartPosition", JSON.stringify(pos));
    localStorage.setItem("navigationRealTimeMode", "false");
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

  // ⭐ แก้ confirmDeliver ทั้งหมด
  const confirmDeliver = async () => {
    if (!houseToDeliver) return;
    const note =
      deliverNote === "อื่นๆ" ? deliverNoteCustom.trim() : deliverNote;

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
    } else {
      toast.success("✅ บันทึกการส่งงานเรียบร้อยแล้ว");
      await reloadNavigation(); // รีโหลดข้อมูลใหม่
      setShowDeliverModal(false);
      setDeliverNote("โอนเข้าบริษัท");
      setDeliverNoteCustom("");
    }
  };

  // ⭐ แก้ confirmReport ทั้งหมด
  const confirmReport = async () => {
    if (!houseToReport) return;
    const { error } = await supabase
      .from("user_navigation_houses")
      .update({
        delivery_status: "reported",
        report_reason: reportReason.trim(),
        reported_at: new Date().toISOString(),
      })
      .eq("id", houseToReport.nav_id);

    if (error) {
      toast.error("บันทึกรายงานไม่สำเร็จ: " + error.message);
    } else {
      toast.success("⚠️ บันทึกรายงานเรียบร้อยแล้ว");
      await reloadNavigation(); // รีโหลดข้อมูลใหม่
      setShowReportModal(false);
      setReportReason("");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-lg text-gray-600">กำลังโหลดการนำทาง...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-32 md:pb-8 relative">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Home className="w-8 h-8 text-blue-600" />
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
        <p className="text-gray-600 mt-2 text-sm font-medium">
          {getCountText()}
        </p>
      </div>

      <div className="mb-6">
        <div className="flex bg-gray-100 p-1 rounded-xl max-w-lg">
          <button
            onClick={() => setViewMode("today")}
            className={`flex-1 px-5 py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
              viewMode === "today"
                ? "bg-blue-600 text-white shadow-md"
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
            className={`flex-1 px-5 py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
              viewMode === "delivered"
                ? "bg-green-600 text-white shadow-md"
                : "text-gray-600"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            ส่ง
            <span className="text-sm font-normal">
              ({list.filter((h) => h.delivery_status === "delivered").length})
            </span>
          </button>
          <button
            onClick={() => setViewMode("reported")}
            className={`flex-1 px-5 py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
              viewMode === "reported"
                ? "bg-orange-600 text-white shadow-md"
                : "text-gray-600"
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            รายงาน
            <span className="text-sm font-normal">
              ({list.filter((h) => h.delivery_status === "reported").length})
            </span>
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
                // คืน focus กลับไปที่ input ทันที
                searchInputRef.current?.focus();
              }}
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
      {/* ตัวกรองพิกัด */}
      <div className="flex flex-wrap items-center gap-8 mb-8 bg-gray-50 p-5 rounded-xl border border-gray-200">
        {/* คำนวณจำนวนบ้านที่มีและไม่มีพิกัดจาก list เดิม (ก่อนกรองอื่น ๆ) */}
        {(() => {
          const noCoordsCount = list.filter((h) => !h.lat || !h.lng).length;
          const withCoordsCount = list.filter((h) => h.lat && h.lng).length;

          return (
            <>
              {/* เพิ่มพิกัดแล้ว – แสดงด้านหน้า */}
              <label className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showWithCoords}
                  onChange={(e) => setShowWithCoords(e.target.checked)}
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                />
                <span className="flex items-center gap-2">
                  เพิ่มพิกัดแล้ว
                  <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full">
                    {withCoordsCount}
                  </span>
                </span>
              </label>

              {/* ยังไม่เพิ่มพิกัด – แสดงด้านหลัง */}
              <label className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showNoCoords}
                  onChange={(e) => setShowNoCoords(e.target.checked)}
                  className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="flex items-center gap-2">
                  ยังไม่เพิ่มพิกัด
                  <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold text-orange-700 bg-orange-100 rounded-full">
                    {noCoordsCount}
                  </span>
                </span>
              </label>
            </>
          );
        })()}
      </div>

      {/* รายการบ้าน */}
      {currentHouses.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-100 rounded-full mb-6">
            <MapPin className="w-12 h-12 text-gray-400" />
          </div>
          <p className="text-xl text-gray-500">ไม่พบบ้านที่ตรงกับเงื่อนไข</p>
          <p className="text-gray-400 mt-2">
            ลองเพิ่มบ้านจากคลังบ้าน หรือปรับตัวกรอง
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
                    className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden flex flex-col relative"
                  >
                    {/* ปุ่มนำทาง / สถานะพิกัด - มุมขวาบน */}
                    <div className="absolute top-3 right-3 z-10">
                      {h.lat && h.lng ? (
                        <button
                          onClick={() => openNavigation(h.lat!, h.lng!)}
                          onMouseDown={(e) => e.preventDefault()}
                          className="px-3 py-2 bg-emerald-600 text-white rounded-lg shadow-md hover:shadow-lg hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-1.5 font-medium text-sm"
                          title="นำทางไปยังบ้านนี้"
                        >
                          <Navigation className="w-4 h-4" />
                          นำทาง
                        </button>
                      ) : (
                        <div
                          className="px-3 py-2 bg-orange-500 text-white rounded-lg shadow-md flex items-center gap-1.5 font-medium text-sm opacity-90"
                          title="บ้านนี้ยังไม่มีพิกัด"
                        >
                          <MapPin className="w-4 h-4" />
                          ไม่มีพิกัด
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      {/* ลำดับที่ + ชื่อ */}
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-extrabold text-indigo-600">
                          #{displayOrder}
                        </span>
                        <h3 className="font-bold text-lg text-indigo-700 line-clamp-2">
                          {h.full_name || "ไม่มีชื่อ"}
                        </h3>
                      </div>
                      {h.phone && (
                        <p className="text-sm text-gray-600 mt-2">{h.phone}</p>
                      )}
                      <div className="flex items-start gap-2 mt-3 text-gray-600 text-sm">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                        <span className="line-clamp-3">{h.address}</span>
                      </div>
                      {/* ระยะทางโดยประมาณ */}
                      {h.distance !== undefined && h.distance < Infinity && (
                        <p className="text-xs text-gray-500 mt-3">
                          ระยะทางโดยประมาณ ~{" "}
                          <span className="font-bold text-blue-600">
                            {h.distance.toFixed(1)} กม.
                          </span>
                        </p>
                      )}
                      {h.note && (
                        <p className="text-xs text-amber-700 mt-3 italic">
                          หมายเหตุ: {h.note}
                        </p>
                      )}
                      {/* สถานะการส่ง + วันที่เวลา */}
                      {h.delivery_status === "delivered" && (
                        <div className="mt-3 space-y-1">
                          {h.delivered_at && (
                            <p className="text-xs text-green-600">
                              {new Date(h.delivered_at)
                                .toLocaleDateString("th-TH", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })
                                .replace(
                                  /(\d+)\/(\d+)\/(\d+)/,
                                  "$1/$2/$3",
                                )}{" "}
                              |{" "}
                              {new Date(h.delivered_at).toLocaleTimeString(
                                "th-TH",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                },
                              )}
                            </p>
                          )}
                          <p className="text-xs text-green-700 font-medium">
                            ✓ ส่งแล้ว: {h.delivery_note || "ไม่มีหมายเหตุ"}
                          </p>
                        </div>
                      )}
                      {h.delivery_status === "reported" && (
                        <div className="mt-3 space-y-1">
                          {h.reported_at && (
                            <p className="text-xs text-orange-600">
                              {new Date(h.reported_at)
                                .toLocaleDateString("th-TH", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })
                                .replace(
                                  /(\d+)\/(\d+)\/(\d+)/,
                                  "$1/$2/$3",
                                )}{" "}
                              |{" "}
                              {new Date(h.reported_at).toLocaleTimeString(
                                "th-TH",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                },
                              )}
                            </p>
                          )}
                          <p className="text-xs text-red-700 font-medium">
                            ⚠ รายงาน: {h.report_reason || "ไม่มีเหตุผล"}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ปุ่มด้านล่าง */}
                    <div className="px-5 pb-5 flex flex-wrap justify-center items-center gap-3">
                      {/* ปุ่มลบออกจากการนำทาง - แสดงทุกสถานะ */}
                      <button
                        onClick={() => removeFromNavigation(h.nav_id)}
                        className="p-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                        title="ลบออกจากการนำทาง"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>

                      {/* ปุ่มรายงาน - แสดงเฉพาะสถานะ pending และ delivered (ถ้าต้องการให้รายงานซ้ำได้ก็เปิดได้) */}
                      {(!h.delivery_status ||
                        h.delivery_status === "pending" ||
                        h.delivery_status === "delivered") && (
                        <button
                          onClick={() => {
                            setHouseToReport(h);
                            setShowReportModal(true);
                          }}
                          className="p-3 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition"
                          title="รายงานปัญหา"
                        >
                          <AlertCircle className="w-5 h-5" />
                        </button>
                      )}

                      {/* ปุ่มแก้ไข - แสดงทุกสถานะ */}
                      <button
                        onClick={() => openEditModal(h)}
                        className="p-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                        title="แก้ไข"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>

                      {/* === ปุ่มส่งแล้ว === */}
                      {/* แสดงใน 2 กรณีหลัก: pending และ reported */}
                      {(!h.delivery_status ||
                        h.delivery_status === "pending" ||
                        h.delivery_status === "reported") && (
                        <button
                          onClick={() => {
                            setHouseToDeliver(h);
                            setShowDeliverModal(true);
                          }}
                          className="p-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                          title={
                            h.delivery_status === "reported"
                              ? "เปลี่ยนเป็นส่งแล้ว"
                              : "ส่งงาน"
                          }
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}

                      {/* แสดงสถานะส่งแล้ว (สำหรับ delivered) */}
                      {h.delivery_status === "delivered" && (
                        <div
                          className="p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 cursor-default"
                          title="ส่งงานแล้ว"
                        >
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-xs font-medium">ส่งแล้ว</span>
                        </div>
                      )}
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
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="w-10 h-10 rounded-lg bg-gray-200 disabled:opacity-50 hover:bg-gray-300 flex items-center justify-center transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  {renderPageNumbers()}
                </div>
                <button
                  onClick={() => goToPage(currentPage + 1)}
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
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-6 shadow-xl max-w-xs w-full">
                <h3 className="text-lg font-medium mb-4 text-center">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-lg font-medium"
                  placeholder={`1 - ${totalPages}`}
                  autoFocus
                />
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => {
                      setShowPageInput(false);
                      setPageInputValue("");
                    }}
                    className="flex-1 py-2.5 bg-gray-200 rounded-lg font-medium hover:bg-gray-300"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handlePageInputSubmit}
                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
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
                onClick={clearAllNavigation}
                className="flex items-center gap-3 px-6 py-3.5 bg-red-600 text-white rounded-2xl shadow-lg hover:bg-red-700 transition-all hover:shadow-xl min-w-44"
              >
                <Trash className="w-5 h-5" />
                <span className="text-base font-medium">ลบทั้งหมด</span>
              </button>
              <button
                onClick={openFullRoute}
                className="flex items-center gap-3 px-6 py-3.5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl shadow-lg hover:from-orange-700 hover:to-red-700 transition-all hover:shadow-xl min-w-44"
              >
                <Map className="w-5 h-5" />
                <span className="text-base font-medium">เส้นทางทั้งหมด</span>
              </button>
              <button
                onClick={() => {
                  setShowStartModal(true);
                  setIsFabOpen(false);
                }}
                className="flex items-center gap-3 px-6 py-3.5 bg-purple-600 text-white rounded-2xl shadow-lg hover:bg-purple-700 transition-all hover:shadow-xl min-w-44"
              >
                <MapPin className="w-5 h-5" />
                <span className="text-base font-medium">ตั้งจุดเริ่มต้น</span>
              </button>
            </div>

            {/* ปุ่มหลัก - แสดงตอนเปิด (หมุนลูกศร) */}
            <button
              onClick={() => setIsFabOpen(false)}
              className="w-12 h-12 bg-indigo-600 text-white rounded-2xl shadow-2xl hover:bg-indigo-700 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
            >
              <ChevronUp className="w-6 h-6 rotate-180 transition-transform duration-300" />
            </button>
          </div>
        </>
      ) : (
        /* เมื่อปิด FAB - แสดงเฉพาะปุ่มหลักตัวเดียว (ไม่หมุนลูกศร) */
        <div className="fixed bottom-20 right-4 z-50">
          <button
            onClick={() => setIsFabOpen(true)}
            className="w-12 h-12 bg-indigo-600 text-white rounded-2xl shadow-2xl hover:bg-indigo-700 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
          >
            <ChevronUp className="w-6 h-6 transition-transform duration-300" />
          </button>
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-gray-800">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-5 text-center">ตัวกรองบ้าน</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="บ้านเลขที่"
                value={houseNumberFilter}
                onChange={(e) => setHouseNumberFilter(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:outline-none font-medium"
              />
              <input
                type="text"
                placeholder="เบอร์โทร"
                value={phoneFilter}
                onChange={(e) =>
                  setPhoneFilter(e.target.value.replace(/\D/g, ""))
                }
                className="w-full px-4 py-2.5 text-sm border-2 border-blue-300 rounded-xl focus:border-blue-500 focus:outline-none font-medium"
              />
              <input
                type="text"
                placeholder="หมู่ที่ (แค่เลข)"
                value={villageFilter}
                onChange={(e) =>
                  setVillageFilter(e.target.value.replace(/[^\d]/g, ""))
                }
                className="w-full px-4 py-2.5 text-sm border-2 border-orange-300 rounded-xl focus:border-orange-500 focus:outline-none font-bold text-orange-700"
              />
              <input
                type="text"
                placeholder="ตำบล"
                value={subdistrictFilter}
                onChange={(e) => setSubdistrictFilter(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="อำเภอ"
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="จังหวัด"
                value={provinceFilter}
                onChange={(e) => setProvinceFilter(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  clearFilters();
                  setShowFilterModal(false);
                }}
                className="flex-1 py-2.5 bg-gray-200 rounded-xl text-sm font-medium hover:bg-gray-300"
              >
                ล้างทั้งหมด
              </button>
              <button
                onClick={() => setShowFilterModal(false)}
                className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold"
              >
                ใช้ตัวกรอง
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal แก้ไขบ้าน */}
      {editingHouse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-gray-800">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-5">แก้ไขบ้าน</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="ชื่อ-นามสกุล"
                value={formData.full_name || ""}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, full_name: e.target.value }))
                }
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="เบอร์โทรศัพท์"
                value={formData.phone || ""}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, phone: e.target.value }))
                }
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              />
              <div className="relative">
                <input
                  type="text"
                  placeholder="ที่อยู่เต็ม (พิมพ์บ้านเลขที่ → space → เลือกหมู่ที่ → space → เลือกหมู่บ้าน → space → เลือกตำบล)"
                  value={addressInput}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  onKeyDown={handleAddressKeyDown}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
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
                        className={`w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 transition ${
                          index === highlightedSuggestionIndex
                            ? "bg-indigo-100"
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
                    ? `${formData.lat},${formData.lng}`
                    : ""
                }
                onChange={(e) => {
                  const parts = e.target.value.split(",");
                  if (parts.length === 2) {
                    const lat = parseFloat(parts[0].trim());
                    const lng = parseFloat(parts[1].trim());
                    if (!isNaN(lat) && !isNaN(lng)) {
                      setFormData((p) => ({ ...p, lat, lng }));
                    }
                  }
                }}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              />
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
              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeModal}
                  className="flex-1 py-2.5 bg-gray-200 rounded-xl text-sm font-medium hover:bg-gray-300"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={saveHouse}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold"
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
                  localStorage.setItem(
                    "navigationRealTimeMode",
                    newMode.toString(),
                  );
                  if (newMode) {
                    localStorage.removeItem("navigationStartPosition");
                    setStartPosition(null);
                    toast.success("เปิดโหมดเรียลไทม์แล้ว");
                  } else {
                    toast.success("ปิดโหมดเรียลไทม์ – ใช้ค่าคงที่");
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
      {/* Modal ยืนยันส่งแล้ว */}
      {showDeliverModal && houseToDeliver && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h2 className="text-xl font-bold text-green-600 mb-4">
              ยืนยันส่งแล้ว
            </h2>

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

              <div className="mt-4 p-3 bg-green-50 rounded-xl">
                <p className="text-sm text-green-800 font-medium">
                  หมายเหตุ:{" "}
                  {deliverNote === "อื่นๆ"
                    ? deliverNoteCustom.trim() || "กำลังกรอกรายละเอียด..."
                    : deliverNote}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeliverModal(false);
                  setDeliverNote("โอนเข้าบริษัท");
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
    </div>
  );
}
