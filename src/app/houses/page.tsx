// C:\DropWay\New_Version\dropway-final\src\app\houses\page.tsx
"use client";
import { supabase } from "@/lib/supabase";
import { House } from "@/types/house";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  MapPin,
  Navigation,
  Search,
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  Loader2,
  Download,
  Filter,
  X as XIcon,
  ChevronLeft,
  ChevronRight,
  Copy,
} from "lucide-react";
import Papa from "papaparse";
import { toast } from "react-hot-toast";

const ITEMS_PER_PAGE = 20;

export default function HousesPage() {
  const [houses, setHouses] = useState<House[]>([]);
  const [filteredHouses, setFilteredHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalInDB, setTotalInDB] = useState<number | null>(null);
  const [addingIds, setAddingIds] = useState<string[]>([]);
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
  // เพิ่ม state ใหม่ ๆ ใกล้กับ state อื่น ๆ
  const [searchInName, setSearchInName] = useState(true);
  const [searchInAddress, setSearchInAddress] = useState(true);
  const [searchInPhone, setSearchInPhone] = useState(false);
  const [searchInNote, setSearchInNote] = useState(true); // เพิ่มหมายเหตุเป็น default เปิด

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [showPageInput, setShowPageInput] = useState(false);
  const [pageInputValue, setPageInputValue] = useState("");
  // Modal เพิ่ม/แก้ไข
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<House>>({});
  const [isDetecting, setIsDetecting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [coordsInput, setCoordsInput] = useState<string>("");
  const [hasShownVillageSuggestions, setHasShownVillageSuggestions] =
    useState(false);

  // เพิ่ม state เหล่านี้ข้างๆ state อื่น ๆ (ใกล้ๆ coordsInput)
  const [addressInput, setAddressInput] = useState<string>("");
  const [addressSuggestions, setAddressSuggestions] = useState<
    { label: string; value: string }[]
  >([]);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] =
    useState<number>(-1);

  // ข้อมูลคงที่ (ใส่ข้างนอก component หรือข้างในก็ได้ แนะนำข้างใน)
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

  // เพิ่ม useEffect นี้ (ข้างๆ useEffect อื่นๆ)
  useEffect(() => {
    if ((editingHouse || isAdding) && formData.address !== undefined) {
      setAddressInput(formData.address || "");
    }
  }, [editingHouse, isAdding, formData.address]);

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

  // โหลดข้อมูล houses
  useEffect(() => {
    supabase
      .from("houses")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setHouses(data);
        }
        setLoading(false);
      });
  }, []);

  // กรองข้อมูล
  // แก้ useEffect กรองข้อมูล (แทนที่ useEffect เดิมที่มี searchTerm)
  useEffect(() => {
    let filtered = houses;

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
          // เบอร์ไม่ case-sensitive มากนัก
          matches = true;
        }
        if (searchInNote && h.note?.toLowerCase().includes(lower)) {
          matches = true;
        }

        return matches;
      });
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

    setFilteredHouses(filtered);
    setCurrentPage(1);
  }, [
    searchTerm,
    houses,
    showNoCoords,
    showWithCoords,
    houseNumberFilter,
    phoneFilter,
    villageFilter,
    subdistrictFilter,
    districtFilter,
    provinceFilter,
    searchInName,
    searchInAddress,
    searchInPhone,
    searchInNote, // เพิ่ม dependency ตัวใหม่
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

  useEffect(() => {
    const fetchHouses = async () => {
      setLoading(true);

      const { data, error, count } = await supabase
        .from("houses")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(0, 9999); // ดึงสูงสุด 10,000 (ปรับได้ถ้าต้องการมากกว่านี้)

      if (error) {
        console.error("Error fetching houses:", error);
        toast.error("โหลดข้อมูลบ้านไม่สำเร็จ");
        setLoading(false);
        return;
      }

      if (data) {
        setHouses(data);
        setTotalInDB(count ?? data.length); // เก็บจำนวนจริงจากฐานข้อมูล
      }

      setLoading(false);
    };

    fetchHouses();
  }, []);

  // แก้ฟังก์ชัน getCountText() ให้แสดงจำนวนจริงทั้งหมด
  const getCountText = () => {
    const totalAll = totalInDB ?? houses.length;
    const total = filteredHouses.length;

    if (
      total === totalAll &&
      !searchTerm &&
      !showNoCoords &&
      !showWithCoords &&
      !houseNumberFilter &&
      !phoneFilter &&
      !villageFilter &&
      !subdistrictFilter &&
      !districtFilter &&
      !provinceFilter
    ) {
      return `บ้านทั้งหมด ${totalAll.toLocaleString()} หลัง`;
    }

    if (searchTerm) {
      return `พบ ${total.toLocaleString()} บ้าน จากทั้งหมด ${totalAll.toLocaleString()} หลัง`;
    }

    if (showWithCoords && !showNoCoords) {
      return `บ้านที่มีพิกัด ${total.toLocaleString()} บ้าน (จากทั้งหมด ${totalAll.toLocaleString()} หลัง)`;
    }

    if (showNoCoords && !showWithCoords) {
      return `บ้านที่ยังไม่มีพิกัด ${total.toLocaleString()} บ้าน (จากทั้งหมด ${totalAll.toLocaleString()} หลัง)`;
    }

    return `พบ ${totalAll.toLocaleString()} บ้าน`;
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredHouses.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentHouses = filteredHouses.slice(startIndex, endIndex);

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

  // แสดงเลขหน้าแบบย่อ
  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => goToPage(1)}
          className="w-10 h-10 rounded-lg font-medium bg-gray-200 hover:bg-gray-300"
        >
          1
        </button>,
      );
      if (startPage > 2) {
        pages.push(
          <button
            key="start-ellipsis"
            onClick={() => setShowPageInput(true)}
            className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 font-medium"
          >
            ...
          </button>,
        );
      }
    }
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => goToPage(i)}
          className={`w-10 h-10 rounded-lg font-medium ${
            i === currentPage
              ? "bg-indigo-600 text-white"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          {i}
        </button>,
      );
    }
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <button
            key="end-ellipsis"
            onClick={() => setShowPageInput(true)}
            className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 font-medium"
          >
            ...
          </button>,
        );
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => goToPage(totalPages)}
          className="w-10 h-10 rounded-lg font-medium bg-gray-200 hover:bg-gray-300"
        >
          {totalPages}
        </button>,
      );
    }
    return pages;
  };

  const reloadHouses = async () => {
    const { data } = await supabase
      .from("houses")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setHouses(data);
    }
  };

  // ⭐ แก้ฟังก์ชัน addToNav ทั้งหมด (แทนที่อันเดิม)
  const addToNav = async (houseId: string) => {
    if (addingIds.includes(houseId)) return;
    setAddingIds((prev) => [...prev, houseId]);

    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast.error("กรุณา login ก่อน");
      setAddingIds((prev) => prev.filter((id) => id !== houseId));
      return;
    }

    const { error } = await supabase
      .from("user_navigation_houses")
      .insert({ house_id: houseId });

    if (error) {
      if (error.code === "23505") {
        toast.error("🏠 บ้านนี้ถูกเพิ่มเข้าการนำทางแล้ว");
      } else {
        toast.error(error.message || "เกิดข้อผิดพลาดในการเพิ่ม");
      }
    } else {
      toast.success("✅ เพิ่มเข้าการนำทางเรียบร้อย");
    }

    setAddingIds((prev) => prev.filter((id) => id !== houseId));
  };

  const openAddModal = () => {
    setIsAdding(true);
    setEditingHouse(null);
    setFormData({
      full_name: "",
      phone: "",
      address: "",
      note: "",
      lat: undefined,
      lng: undefined,
    });
    setCoordsInput("");
    setAddressInput("");
    setHasShownVillageSuggestions(false); // เพิ่มบรรทัดนี้
  };

  const openEditModal = (house: House) => {
    setIsAdding(false);
    setEditingHouse(house);
    setFormData({
      full_name: house.full_name || "",
      phone: house.phone || "",
      address: house.address || "",
      note: house.note || "",
      lat: house.lat || undefined,
      lng: house.lng || undefined,
    });
    setCoordsInput(house.lat && house.lng ? `${house.lat},${house.lng}` : "");
    setAddressInput(house.address || "");
    setHasShownVillageSuggestions(false); // เพิ่มบรรทัดนี้
  };

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
      // รีเซ็ต flag เมื่อเริ่มใหม่
      setHasShownVillageSuggestions(false);
      return;
    }

    // 2. มี ม.เลข แล้วกด space
    if (trimmed.match(/ม\.\d+$/) && /\s$/.test(input)) {
      // ถ้าเคยแสดงรายการหมู่บ้านแล้ว → ไปแสดง ต. ทันที (รวมถึงกรณีข้าม)
      if (hasShownVillageSuggestions) {
        setAddressSuggestions(
          subdistricts.map((sd) => ({
            label: `ต.${sd}`,
            value: `ต.${sd}`,
          })),
        );
        return;
      }

      // ครั้งแรกที่เห็น ม. + space → แสดงรายการหมู่บ้าน + ข้าม
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

      // ตั้ง flag ว่าแสดงแล้ว
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

    // ทำให้ dropdown ถัดไปโผล่ทันที
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

  const closeModal = () => {
    setEditingHouse(null);
    setIsAdding(false);
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
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);

        // อัปเดตทั้ง formData และ coordsInput พร้อมกัน
        setFormData((prev) => ({
          ...prev,
          lat: latNum,
          lng: lngNum,
        }));

        // <<< สำคัญ: อัปเดตช่อง input ให้แสดงพิกัดด้วย
        setCoordsInput(`${lat},${lng}`);

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
    if (isAdding) {
      const { error } = await supabase.from("houses").insert(formData);
      if (error) {
        toast.error("เพิ่มบ้านไม่สำเร็จ: " + error.message);
      } else {
        toast.success("เพิ่มบ้านสำเร็จ!");
        await reloadHouses(); // รีโหลดข้อมูลใหม่
        closeModal();
      }
    } else {
      if (!editingHouse) return;
      const { error } = await supabase
        .from("houses")
        .update(formData)
        .eq("id", editingHouse.id);

      if (error) {
        toast.error("เกิดข้อผิดพลาด: " + error.message);
      } else {
        toast.success("บันทึกสำเร็จ");
        await reloadHouses(); // รีโหลดข้อมูลใหม่
        closeModal();
      }
    }
  };

  const downloadAllHousesCsv = async () => {
    setDownloading(true);
    const { data, error } = await supabase
      .from("houses")
      .select("id,full_name,phone,address,lat,lng,note,created_at,updated_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("ดาวน์โหลดไม่สำเร็จ: " + error.message);
      setDownloading(false);
      return;
    }
    const csv = Papa.unparse(data);
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `คลังบ้าน_ทั้งหมด_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("ดาวน์โหลด CSV สำเร็จ!");
    setDownloading(false);
  };

  const deleteHouse = async (houseId: string) => {
    if (!confirm("ยืนยันการลบบ้านนี้? การกระทำนี้ไม่สามารถย้อนกลับได้")) return;

    const { data, error } = await supabase
      .from("houses")
      .delete()
      .eq("id", houseId)
      .select(); // สำคัญ: ต้องมี .select() เพื่อเช็คว่าลบจริงไหม

    if (error) {
      toast.error("ลบไม่สำเร็จ: " + error.message);
      console.error("Delete error:", error);
      return;
    }

    if (!data || data.length === 0) {
      toast.error("ลบไม่สำเร็จ: ไม่มีสิทธิ์หรือไม่พบข้อมูล");
      return;
    }

    toast.success("ลบบ้านเรียบร้อย");
    setHouses((prev) => prev.filter((h) => h.id !== houseId));
  };

  const openNavigation = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.location.href = url;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-lg text-gray-600">กำลังโหลดคลังบ้าน...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-32 md:pb-8">
      {/* หัวข้อ + ปุ่ม + จำนวนบ้าน */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Home className="w-8 h-8 text-indigo-600" />
            คลังบ้านทั้งหมด
          </h1>
          <p className="text-gray-600 mt-2 text-sm font-medium">
            {getCountText()}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={downloadAllHousesCsv}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            {downloading ? "กำลังโหลด..." : "โหลด CSV"}
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl"
          >
            <Plus className="w-4 h-4" />
            เพิ่มบ้าน
          </button>
        </div>
      </div>

      {/* ช่องค้นหา + ปุ่ม X + ปุ่มกรอง */}
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
              onClick={(e) => {
                e.preventDefault();
                clearSearch();
                // ย้าย focus กลับไปที่ input ทันที
                searchInputRef.current?.focus();
              }}
              className="absolute right-12 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 z-10"
              type="button" // สำคัญ: ระบุ type="button" เพื่อไม่ให้ submit form
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
      <div className="flex flex-wrap items-center gap-6 mb-8 bg-gray-50 p-5 rounded-xl border border-gray-200">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={showNoCoords}
            onChange={(e) => setShowNoCoords(e.target.checked)}
            className="w-4 h-4 text-orange-600 rounded"
          />
          <span>ยังไม่เพิ่มพิกัด</span>
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={showWithCoords}
            onChange={(e) => setShowWithCoords(e.target.checked)}
            className="w-4 h-4 text-green-600 rounded"
          />
          <span>เพิ่มพิกัดแล้ว</span>
        </label>
      </div>

      {/* รายการบ้าน */}
      {currentHouses.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-xl text-gray-500">ไม่พบบ้านที่ตรงกับเงื่อนไข</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentHouses.map((h) => (
              <div
                key={h.id}
                className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden flex flex-col relative"
              >
                {/* มุมขวาบน: ปุ่ม + (ป้องกันคีย์บอร์ดปิด) */}
                <div className="absolute top-3 right-3 z-10">
                  <button
                    onClick={() => addToNav(h.id)}
                    onMouseDown={(e) => e.preventDefault()} // <<< ป้องกันไม่ให้คีย์บอร์ดปิดเมื่อกดปุ่มนี้
                    disabled={addingIds.includes(h.id)}
                    className={`px-3 py-2 text-white rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 transition-all active:scale-95 flex items-center gap-1.5 font-medium text-sm ${
                      h.lat && h.lng
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-orange-500 hover:bg-orange-600"
                    }`}
                    title="เพิ่มเข้าการนำทาง"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่ม
                  </button>
                </div>

                {/* เนื้อหาการ์ด */}
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg text-indigo-700 line-clamp-2">
                    {h.full_name || "ไม่มีชื่อ"}
                  </h3>
                  {h.phone && (
                    <div className="flex items-center gap-2 mt-2 group">
                      <p className="text-sm text-gray-600 select-none">
                        {h.phone}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(h.phone!);
                          toast.success("คัดลอกเบอร์เรียบร้อยแล้ว!");
                        }}
                        className="opacity-40 group-hover:opacity-100 transition-opacity duration-200"
                        title="คัดลอกเบอร์โทร"
                        aria-label="คัดลอกเบอร์โทร"
                      >
                        <Copy className="w-4 h-4 text-gray-500 hover:text-gray-700 transition-colors" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-start gap-2 mt-3 text-gray-600 text-sm">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                    <span className="line-clamp-3">{h.address}</span>
                  </div>
                  {h.note && (
                    <p className="text-xs text-amber-700 mt-3 italic">
                      หมายเหตุ: {h.note}
                    </p>
                  )}
                </div>

                {/* ปุ่มด้านล่าง: ลบ (ซ้ายสุด), นำทาง, แก้ไข */}
                <div className="px-5 pb-5 flex justify-center items-center gap-4">
                  <button
                    onClick={() => deleteHouse(h.id)}
                    className="p-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                    title="ลบ"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  {h.lat && h.lng && (
                    <button
                      onClick={() => openNavigation(h.lat!, h.lng!)}
                      className="p-3 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition"
                      title="นำทาง"
                    >
                      <Navigation className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(h)}
                    className="p-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                    title="แก้ไข"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 mb-8 flex items-center justify-center gap-3">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-10 h-10 rounded-lg bg-gray-200 disabled:opacity-50 hover:bg-gray-300 flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                {renderPageNumbers()}
              </div>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-10 h-10 rounded-lg bg-gray-200 disabled:opacity-50 hover:bg-gray-300 flex items-center justify-center"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Input กรอกหน้าเมื่อกด ... */}
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

      {/* แก้ Filter Modal: เพิ่มส่วนตัวเลือกการค้นหา */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-gray-800">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-5 text-center">ตัวกรองบ้าน</h2>

            {/* ส่วนใหม่: ค้นหาจากฟิลด์ไหนบ้าง */}
            <div className="mb-6 p-4 bg-indigo-50 rounded-xl">
              <p className="text-sm font-semibold text-indigo-800 mb-3">
                ช่องค้นหาหลักจะค้นหาจาก:
              </p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchInName}
                    onChange={(e) => setSearchInName(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium">ชื่อ-นามสกุล</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchInAddress}
                    onChange={(e) => setSearchInAddress(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium">ที่อยู่</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchInPhone}
                    onChange={(e) => setSearchInPhone(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium">เบอร์โทรศัพท์</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchInNote}
                    onChange={(e) => setSearchInNote(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium">หมายเหตุ</span>
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

      {/* Modal เพิ่ม / แก้ไขบ้าน */}
      {(editingHouse || isAdding) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-gray-800">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-5">
              {isAdding ? "เพิ่มบ้านใหม่" : "แก้ไขบ้าน"}
            </h2>
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
                  placeholder="ที่อยู่เต็ม (พิมพ์บ้านเลขที่ → space → เลือกหมู่ที่ → space → เลือกตำบล → space → เลือกหมู่บ้าน)"
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
                        onMouseDown={(e) => e.preventDefault()} // ป้องกัน input เสีย focus
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
                value={coordsInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setCoordsInput(value);

                  // พยายาม parse เป็น lat,lng เฉพาะเมื่อรูปแบบครบ
                  const parts = value.split(",");
                  if (parts.length === 2) {
                    const lat = parseFloat(parts[0].trim());
                    const lng = parseFloat(parts[1].trim());
                    if (!isNaN(lat) && !isNaN(lng)) {
                      setFormData((p) => ({ ...p, lat, lng }));
                    } else {
                      // ถ้า parse ไม่ได้ ให้ล้าง lat/lng
                      setFormData((p) => ({
                        ...p,
                        lat: undefined,
                        lng: undefined,
                      }));
                    }
                  } else {
                    // ถ้าไม่ครบรูปแบบ ให้ล้าง lat/lng
                    setFormData((p) => ({
                      ...p,
                      lat: undefined,
                      lng: undefined,
                    }));
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
                  {isAdding ? "เพิ่มบ้าน" : "บันทึก"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
