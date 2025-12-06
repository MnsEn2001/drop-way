// src/app/dashboard/houses/page.tsx
"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Search,
  Plus,
  Navigation,
  MapPin,
  Loader2,
  Edit3,
  Trash2,
  AlertCircle,
  ExternalLink,
  Filter,
  ChevronLeft,
  ChevronRight,
  Upload,
  FileSpreadsheet,
  FileText,
  X,
  Copy,
  Download,
  ChevronDown,
} from "lucide-react";
import Papa from "papaparse";

interface House {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  lat: number | null;
  lng: number | null;
  note: string | null;
  created_at: string;
  updated_at: string | null;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

const ITEMS_PER_PAGE = 20;

// ข้อมูลหมู่บ้านตามตำบล
const villageBySubdistrict: Record<string, string[]> = {
  นาโบสถ์: [
    "ลาดยาว",
    "นาโบสถ์",
    "วังตำลึง",
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
const villages = Array.from({ length: 25 }, (_, i) => (i + 1).toString());

export default function HousesPage() {
  const [activeTab, setActiveTab] = useState<"list" | "csv">("list");
  const [houses, setHouses] = useState<House[]>([]);
  const [search, setSearch] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [subdistrictFilter, setSubdistrictFilter] = useState("");
  const [villageFilter, setVillageFilter] = useState("");
  const [houseNumberFilter, setHouseNumberFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [showNoCoords, setShowNoCoords] = useState(false);
  const [showWithCoords, setShowWithCoords] = useState(false);
  const [groupByHouseNumber, setGroupByHouseNumber] = useState(false);
  const [groupByNearby, setGroupByNearby] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCsvExample, setShowCsvExample] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);

  // ฟอร์ม
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [coordInput, setCoordInput] = useState("");
  const [detectedLat, setDetectedLat] = useState<number | null>(null);
  const [detectedLng, setDetectedLng] = useState<number | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // Dropdown state
  const [showMooDropdown, setShowMooDropdown] = useState(false);
  const [showSubdistrictDropdown, setShowSubdistrictDropdown] = useState(false);
  const [showVillageDropdown, setShowVillageDropdown] = useState(false);
  const [selectedSubdistrict, setSelectedSubdistrict] = useState<string | null>(
    null,
  );
  const [showTabMenu, setShowTabMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const filterModalRef = useRef<HTMLDivElement>(null);
  const addEditModalRef = useRef<HTMLDivElement>(null);
  const addressInputRef = useRef<HTMLTextAreaElement>(null);

  const addToast = (message: string, type: "success" | "error" | "info") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000,
    );
  };

  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      addToast("คัดลอกเบอร์โทรแล้ว", "success");
    } catch (err) {
      addToast("คัดลอกไม่สำเร็จ", "error");
    }
  };

  useEffect(() => {
    const loadHouses = async () => {
      const { data } = await supabase
        .from("houses")
        .select("*")
        .order("created_at", { ascending: false });
      setHouses((data as House[]) ?? []);
    };
    loadHouses();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showFilterModal &&
        filterModalRef.current &&
        !filterModalRef.current.contains(e.target as Node)
      ) {
        setShowFilterModal(false);
      }
      if (
        (showAdd || showEditModal) &&
        addEditModalRef.current &&
        !addEditModalRef.current.contains(e.target as Node)
      ) {
        setShowAdd(false);
        setShowEditModal(false);
        resetForm();
      }
    };
    if (showFilterModal || showAdd || showEditModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilterModal, showAdd, showEditModal]);

  const extractHouseNumber = (address: string): string => {
    const match = address.match(
      /(?:บ้านเลขที่|เลขที่|ที่\s*)?\s*([\d\/\\-]+)\s*(?:\/\s*\d+)?/i,
    );
    return match ? match[1].trim() : "";
  };

  const extractVillageNumber = (address: string): string => {
    const match =
      address.match(/หมู่\s*[ที่]?\s*(\d+)/i) ||
      address.match(/ม\s*\.?\s*(\d+)/i);
    return match ? match[1] : "";
  };

  const extractSubdistrict = (address: string): string => {
    const match = address.match(/ต\.\s*([\u0E00-\u0E7F]+)/);
    return match ? match[1] : "";
  };

  const filteredAndSorted = useMemo(() => {
    let result = houses.filter((h) => {
      const lowerSearch = search.toLowerCase().trim();
      const addr = h.address.toLowerCase();
      const fullName = h.full_name.toLowerCase();
      const phoneStr = h.phone;
      const houseNum = extractHouseNumber(h.address);
      const villageNum = extractVillageNumber(h.address);
      const subdistrict = extractSubdistrict(h.address);
      const noteLower = (h.note || "").toLowerCase();

      const matchesText =
        fullName.includes(lowerSearch) ||
        phoneStr.includes(lowerSearch) ||
        addr.includes(lowerSearch) ||
        noteLower.includes(lowerSearch) ||
        houseNum.includes(lowerSearch) ||
        villageNum.includes(lowerSearch) ||
        subdistrict.includes(lowerSearch);

      const matchesCoords =
        h.lat &&
        h.lng &&
        lowerSearch.includes(h.lat.toFixed(2)) &&
        lowerSearch.includes(h.lng.toFixed(2));

      if (lowerSearch && !matchesText && !matchesCoords) return false;
      if (
        houseNumberFilter.trim() &&
        !houseNum.includes(houseNumberFilter.trim())
      )
        return false;
      if (phoneFilter.trim() && !phoneStr.includes(phoneFilter.trim()))
        return false;
      if (provinceFilter.trim()) {
        const p = provinceFilter.toLowerCase().trim();
        if (
          !addr.includes(`จ.${p}`) &&
          !addr.includes(`จังหวัด${p}`) &&
          !addr.includes(p)
        )
          return false;
      }
      if (districtFilter.trim()) {
        const d = districtFilter.toLowerCase().trim();
        if (
          !addr.includes(`อ.${d}`) &&
          !addr.includes(`อำเภอ${d}`) &&
          !addr.includes(d)
        )
          return false;
      }
      if (subdistrictFilter.trim()) {
        const t = subdistrictFilter.toLowerCase().trim();
        if (
          !addr.includes(`ต.${t}`) &&
          !addr.includes(`ตำบล${t}`) &&
          !addr.includes(t)
        )
          return false;
      }
      if (villageFilter.trim() && villageNum !== villageFilter.trim())
        return false;

      const hasCoords = h.lat && h.lng;
      if (showNoCoords && hasCoords) return false;
      if (showWithCoords && !hasCoords) return false;
      return true;
    });

    if (groupByHouseNumber) {
      result.sort((a, b) => {
        const houseA = extractHouseNumber(a.address);
        const houseB = extractHouseNumber(b.address);
        if (houseA && houseB) {
          if (houseA === houseB) {
            return (
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
            );
          }
          return houseA.localeCompare(houseB, undefined, { numeric: true });
        }
        return 0;
      });
    } else if (groupByNearby) {
      result.sort((a, b) => {
        const villageA = parseInt(extractVillageNumber(a.address) || "0");
        const villageB = parseInt(extractVillageNumber(b.address) || "0");
        if (villageA !== villageB) return villageA - villageB;
        const houseA = extractHouseNumber(a.address);
        const houseB = extractHouseNumber(b.address);
        return houseA.localeCompare(houseB, undefined, { numeric: true });
      });
    } else {
      result.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return result;
  }, [
    houses,
    search,
    provinceFilter,
    districtFilter,
    subdistrictFilter,
    villageFilter,
    houseNumberFilter,
    phoneFilter,
    showNoCoords,
    showWithCoords,
    groupByHouseNumber,
    groupByNearby,
  ]);

  const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE);
  const paginatedHouses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSorted.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSorted, currentPage]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const verifyOnMaps = (lat: number, lng: number) => {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      "_blank",
    );
  };

  const openMaps = (lat: number, lng: number) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
      "_blank",
    );
  };

  const openEditModal = (house: House) => {
    setEditingHouse(house);
    setName(house.full_name);
    setPhone(house.phone);
    setAddress(house.address);
    setNote(house.note ?? "");
    setCoordInput(house.lat && house.lng ? `${house.lat},${house.lng}` : "");
    setDetectedLat(house.lat);
    setDetectedLng(house.lng);
    setShowEditModal(true);
  };

  const addToRoute = async (house: House) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      addToast("กรุณาเข้าสู่ระบบก่อน", "error");
      return;
    }
    const { data: existing } = await supabase
      .from("today_houses")
      .select("id")
      .eq("user_id", user.id)
      .eq("full_name", house.full_name)
      .eq("phone", house.phone)
      .single();

    if (existing) {
      addToast("รายการนี้มีในรับงานแล้ว", "info");
      return;
    }

    const { error } = await supabase.from("today_houses").insert({
      user_id: user.id,
      full_name: house.full_name,
      phone: house.phone,
      address: house.address,
      lat: house.lat || null,
      lng: house.lng || null,
      note: house.note || null,
      order_index: 0,
    });

    if (error) addToast("เพิ่มเข้ารับงานไม่สำเร็จ: " + error.message, "error");
    else addToast("เพิ่มเข้ารับงานสำเร็จ!", "success");
  };

  const deleteHouse = async (id: string) => {
    if (!confirm("ลบบ้านนี้จริง ๆ นะ? (ทุกคนจะเห็นการเปลี่ยนแปลง)")) return;
    const { error } = await supabase.from("houses").delete().eq("id", id);
    if (error) addToast("ลบไม่สำเร็จ: " + error.message, "error");
    else {
      setHouses((prev) => prev.filter((h) => h.id !== id));
      addToast("ลบบ้านเรียบร้อย", "success");
    }
  };

  const detectLocation = async () => {
    if (!navigator.geolocation)
      return addToast("เบราว์เซอร์ไม่รองรับตำแหน่ง", "error");
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDetectedLat(lat);
        setDetectedLng(lng);
        setCoordInput(`${lat},${lng}`);
        setIsDetecting(false);
        addToast("ตรวจจับพิกัดสำเร็จ!", "success");
      },
      () => {
        addToast("ไม่สามารถตรวจจับตำแหน่งได้", "error");
        setIsDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const addHouse = async () => {
    setLoading(true);
    const { error } = await supabase.from("houses").insert({
      full_name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      note: note.trim(),
      lat: detectedLat,
      lng: detectedLng,
    });
    if (error) addToast("เกิดข้อผิดพลาด: " + error.message, "error");
    else {
      addToast("เพิ่มบ้านสำเร็จ!", "success");
      setShowAdd(false);
      resetForm();
      const { data } = await supabase
        .from("houses")
        .select("*")
        .order("created_at", { ascending: false });
      setHouses((data as House[]) ?? []);
    }
    setLoading(false);
  };

  const saveEdit = async () => {
    if (!editingHouse) return;
    setSaving(true);
    const { error } = await supabase
      .from("houses")
      .update({
        full_name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        note: note.trim(),
        lat: detectedLat,
        lng: detectedLng,
      })
      .eq("id", editingHouse.id);

    if (error) addToast("อัปเดตไม่สำเร็จ: " + error.message, "error");
    else {
      addToast("อัปเดตข้อมูลสำเร็จ!", "success");
      setShowEditModal(false);
      resetForm();
      const { data } = await supabase
        .from("houses")
        .select("*")
        .order("created_at", { ascending: false });
      setHouses((data as House[]) ?? []);
    }
    setSaving(false);
  };

  const clearFilters = () => {
    setSearch("");
    setProvinceFilter("");
    setDistrictFilter("");
    setSubdistrictFilter("");
    setVillageFilter("");
    setHouseNumberFilter("");
    setPhoneFilter("");
    setShowNoCoords(false);
    setShowWithCoords(false);
    setGroupByHouseNumber(false);
    setGroupByNearby(false);
    setCurrentPage(1);
    addToast("ล้างตัวกรองแล้ว", "info");
  };

  const resetForm = () => {
    setName("");
    setPhone("");
    setAddress("");
    setNote("");
    setCoordInput("");
    setDetectedLat(null);
    setDetectedLng(null);
    setEditingHouse(null);
    setSelectedSubdistrict(null);
    setShowMooDropdown(false);
    setShowSubdistrictDropdown(false);
    setShowVillageDropdown(false);
  };

  // ระบบกรอกที่อยู่แบบอัจฉริยะ
  const handleAddressChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setAddress(value);

    const trimmed = value.trimEnd();
    const endsWithSpace = value.endsWith(" ") || value.endsWith("\n");
    const cursorAtEnd = e.target.selectionStart === value.length;

    // 1. พิมพ์บ้านเลขที่เสร็จแล้วเว้นวรรค → แสดงหมู่ที่
    const houseNumberOnly = trimmed.match(/^[\d\/\\-]+$/);
    if (houseNumberOnly && endsWithSpace && cursorAtEnd) {
      setShowMooDropdown(true);
      setShowSubdistrictDropdown(false);
      setShowVillageDropdown(false);
      return;
    }

    // 2. มี ม.เลข แล้วเว้นวรรค → แสดงตำบล
    if (trimmed.match(/ม\.\s*\d+\s*$/) && endsWithSpace && cursorAtEnd) {
      setShowMooDropdown(false);
      setShowSubdistrictDropdown(true);
      setShowVillageDropdown(false);
      return;
    }

    // 3. เลือกตำบลแล้วเว้นวรรค → แสดงหมู่บ้าน
    if (
      selectedSubdistrict &&
      trimmed.endsWith(`ต.${selectedSubdistrict}`) &&
      endsWithSpace &&
      cursorAtEnd
    ) {
      setShowMooDropdown(false);
      setShowSubdistrictDropdown(false);
      setShowVillageDropdown(true);
      return;
    }

    // ถ้าไม่เข้าเงื่อนไขใด ๆ → ปิด dropdown ทั้งหมด
    setShowMooDropdown(false);
    setShowSubdistrictDropdown(false);
    setShowVillageDropdown(false);
  };

  const selectMoo = (moo: string) => {
    const base = address.replace(/ม\.\s*\d*\s*$/, "").trim();
    const newAddr = `${base} ม.${moo} `;
    setAddress(newAddr);
    setShowMooDropdown(false);
    setShowSubdistrictDropdown(true);
    setTimeout(() => addressInputRef.current?.focus(), 0);
  };

  const selectSubdistrict = (sub: string) => {
    let newAddr = address.replace(/ต\..*?($|\s)/, "").trim();
    newAddr = `${newAddr} ต.${sub} `;
    setAddress(newAddr);
    setSelectedSubdistrict(sub);
    setShowSubdistrictDropdown(false);
    setShowVillageDropdown(true);
    setTimeout(() => addressInputRef.current?.focus(), 0);
  };

  const selectVillageName = (village: string) => {
    let newAddr = address.replace(/บ\..*?($|\s)/, "").trim();
    newAddr = `${newAddr} บ.${village} อ.วังเจ้า จ.ตาก`;
    setAddress(newAddr);
    setShowVillageDropdown(false);
    setTimeout(() => addressInputRef.current?.focus(), 0);
  };

  const handleFileUpload = async () => {
    if (!file) return;
    setUploading(true);
    Papa.parse(file, {
      header: true,
      encoding: "utf-8",
      complete: async (results) => {
        const rows = results.data as any[];
        let addedCount = 0;
        for (const row of rows) {
          const full_name = (
            row.full_name ||
            row.name ||
            row.ชื่อ ||
            ""
          ).trim();
          const phone = (row.phone || row.เบอร์ || "").trim();
          const address = (row.address || row.ที่อยู่ || "").trim();
          const note = (row.note || row.หมายเหตุ || "").trim();
          if (full_name && phone && address) {
            const { error } = await supabase.from("houses").insert({
              full_name,
              phone,
              address,
              note: note || null,
              lat: null,
              lng: null,
            });
            if (!error) addedCount++;
          }
        }
        if (addedCount > 0) {
          addToast(`เพิ่ม ${addedCount} บ้านใหม่!`, "success");
          const { data } = await supabase
            .from("houses")
            .select("*")
            .order("created_at", { ascending: false });
          setHouses((data as House[]) ?? []);
        } else {
          addToast("ไม่มีบ้านใหม่ที่จะเพิ่ม", "info");
        }
        setUploading(false);
        setFile(null);
      },
    });
  };

  const downloadAllHousesCsv = async () => {
    setDownloading(true);
    const { data, error } = await supabase
      .from("houses")
      .select("id,full_name,phone,address,lat,lng,note,created_at,updated_at")
      .order("created_at", { ascending: false });
    if (error) {
      addToast("ดาวน์โหลดไม่สำเร็จ: " + error.message, "error");
      setDownloading(false);
      return;
    }
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `คลังบ้าน_ทั้งหมด_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast("ดาวน์โหลด CSV สำเร็จ!", "success");
    setDownloading(false);
  };

  const downloadCsvExample = () => {
    const csvContent = `full_name,phone,address,note
สมชาย ใจดี,0812345678,"15/8 ม.5 ต.นาโบสถ์ บ.ลาดยาว อ.วังเจ้า จ.ตาก","ข้างศูนย์เด็กเล็ก"
สมศรี สุขใจ,0898765432,"123 ม.10 ต.เชียงทอง บ.วังเจ้า อ.วังเจ้า จ.ตาก","หลังอบต."`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "example_houses.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-6 pb-24 lg:pb-8">
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              คลังบ้าน
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              บ้าน {filteredAndSorted.length} หลังคาเรือน
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={downloadAllHousesCsv}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition shadow-md disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              {downloading ? "กำลังโหลด..." : "โหลด CSV"}
            </button>

            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shadow-md"
            >
              <Plus className="w-4 h-4" /> เพิ่มบ้าน
            </button>

            <div className="relative">
              <button
                onClick={() => setShowTabMenu((prev) => !prev)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl border border-gray-300 hover:bg-gray-200 transition"
              >
                เลือกโหมด
                <ChevronDown className="w-4 h-4" />
              </button>

              {showTabMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
                  <button
                    onClick={() => {
                      setActiveTab("list");
                      setShowTabMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                      activeTab === "list"
                        ? "font-semibold text-blue-600"
                        : "text-gray-700"
                    }`}
                  >
                    รายชื่อบ้านทั้งหมด
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("csv");
                      setShowTabMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                      activeTab === "csv"
                        ? "font-semibold text-blue-600"
                        : "text-gray-700"
                    }`}
                  >
                    เพิ่มบ้านใหม่ด้วย CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {activeTab === "list" && (
          <>
            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1 text-gray-800">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />

                <input
                  type="text"
                  placeholder="ค้นหาทุกอย่าง (ชื่อ, เบอร์, ที่อยู่, พิกัด...)"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-12 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition font-medium"
                />

                {/* ปุ่มตัวกรองแบบไอคอน */}
                <button
                  onClick={() => setShowFilterModal(true)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  <Filter className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            </div>

            {/* Group options */}
            <div className="flex flex-wrap items-center gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={groupByHouseNumber}
                  onChange={(e) => {
                    setGroupByHouseNumber(e.target.checked);
                    setGroupByNearby(false);
                    setCurrentPage(1);
                  }}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                />
                <span className="font-medium">จัดกลุ่มตามบ้านเลขที่</span>
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={groupByNearby}
                  onChange={(e) => {
                    setGroupByNearby(e.target.checked);
                    setGroupByHouseNumber(false);
                    setCurrentPage(1);
                  }}
                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                />
                <span className="font-medium">จัดกลุ่มตามพื้นที่ใกล้เคียง</span>
              </label>

              <label className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showNoCoords}
                  onChange={(e) => {
                    setShowNoCoords(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="w-4 h-4 text-orange-600 rounded"
                />
                ยังไม่เพิ่มพิกัด
              </label>

              <label className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showWithCoords}
                  onChange={(e) => {
                    setShowWithCoords(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="w-4 h-4 text-green-600 rounded"
                />
                เพิ่มพิกัดแล้ว
              </label>
            </div>

            {/* House list */}
            {filteredAndSorted.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-5 bg-gray-200 border-2 border-dashed rounded-2xl" />
                <p className="text-xl font-semibold text-gray-700">
                  ยังไม่มีบ้านในคลัง
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  กดปุ่ม + เพื่อเพิ่มบ้านแรก
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {paginatedHouses.map((h) => (
                    <div
                      key={h.id}
                      className="group relative bg-white rounded-xl shadow-sm hover:shadow-lg border border-gray-200 transition-all duration-200 overflow-hidden"
                    >
                      <div className="p-4">
                        {/* บรรทัด: ชื่อ + ปุ่ม 3 ปุ่ม */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          {/* ชื่อบ้าน */}
                          <h3 className="font-bold text-indigo-700 text-sm line-clamp-2 leading-tight flex-1">
                            {h.full_name || "ไม่มีชื่อ"}
                          </h3>

                          {/* ปุ่ม 3 ปุ่ม */}
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => addToRoute(h)}
                              className="p-1.5 rounded hover:bg-green-50 transition-colors shadow-sm"
                              title="เพิ่มเข้ารับงาน"
                            >
                              <Plus className="w-4 h-4 text-green-600" />
                            </button>

                            <button
                              onClick={() => openEditModal(h)}
                              className="p-1.5 rounded hover:bg-blue-50 transition-colors shadow-sm"
                              title="แก้ไข"
                            >
                              <Edit3 className="w-4 h-4 text-blue-600" />
                            </button>

                            <button
                              onClick={() => deleteHouse(h.id)}
                              className="p-1.5 rounded hover:bg-red-50 transition-colors shadow-sm"
                              title="ลบ"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>

                        {/* เบอร์โทร */}
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm font-medium text-gray-700">
                            {h.phone}
                          </p>
                          <button
                            onClick={() => copyPhone(h.phone)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="คัดลอกเบอร์โทร"
                          >
                            <Copy className="w-3 h-3 text-gray-500" />
                          </button>
                        </div>

                        {/* ที่อยู่ */}
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-tight">
                          {h.address}
                        </p>

                        {/* หมายเหตุ */}
                        {h.note && (
                          <p className="text-xs text-amber-700 mt-1 italic">
                            หมายเหตุ: {h.note}
                          </p>
                        )}
                      </div>

                      <div className="px-4 pb-4">
                        {h.lat && h.lng ? (
                          <button
                            onClick={() => openMaps(h.lat!, h.lng!)}
                            className="w-full py-2.5 text-sm font-semibold text-white bg-linear-to-r from-emerald-600 to-green-600 rounded-lg hover:from-emerald-700 hover:to-green-700 transition flex items-center justify-center gap-1.5"
                          >
                            <Navigation className="w-4 h-4" /> นำทาง
                          </button>
                        ) : (
                          <button
                            onClick={() => openEditModal(h)}
                            className="w-full py-2.5 text-sm font-semibold text-white bg-linear-to-r from-orange-500 to-red-500 rounded-lg hover:from-orange-600 hover:to-red-600 transition flex items-center justify-center gap-1.5"
                          >
                            <MapPin className="w-4 h-4" /> เพิ่มพิกัด
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10 text-gray-800">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg bg-gray-100 disabled:opacity-50 hover:bg-gray-200 transition"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex gap-1">
                      {Array.from(
                        { length: Math.min(totalPages, 7) },
                        (_, i) => {
                          let page;
                          if (totalPages <= 7) page = i + 1;
                          else if (currentPage <= 4) page = i + 1;
                          else if (currentPage >= totalPages - 3)
                            page = totalPages - 6 + i;
                          else page = currentPage - 3 + i;
                          return page > 0 && page <= totalPages ? (
                            <button
                              key={page}
                              onClick={() => goToPage(page)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${currentPage === page ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
                            >
                              {page}
                            </button>
                          ) : null;
                        },
                      )}
                      {totalPages > 7 && currentPage < totalPages - 3 && (
                        <span className="px-2">...</span>
                      )}
                    </div>
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg bg-gray-100 disabled:opacity-50 hover:bg-gray-200 transition"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* CSV Tab */}
        {activeTab === "csv" && (
          <div className="bg-white rounded-2xl shadow-lg p-5 text-gray-800">
            <div className="space-y-5">
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
                {file && (
                  <p className="mt-3 text-sm font-medium text-green-600">
                    {file.name}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCsvExample(true)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl text-sm font-medium hover:bg-gray-200 flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" /> ตัวอย่าง
                </button>
                <button
                  onClick={handleFileUpload}
                  disabled={!file || uploading}
                  className="flex-1 bg-linear-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl text-sm font-bold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {uploading ? "กำลังอัพโหลด..." : "อัพโหลด CSV"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Add Button (mobile) */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-700 transition lg:hidden"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* Toast */}
      <div className="fixed top-16 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl text-white text-sm font-medium animate-in slide-in-from-top ${
              t.type === "success"
                ? "bg-green-600"
                : t.type === "error"
                  ? "bg-red-600"
                  : "bg-blue-600"
            }`}
          >
            {t.type === "success" && <Plus className="w-5 h-5" />}
            {t.type === "error" && <AlertCircle className="w-5 h-5" />}
            {t.type === "info" && <AlertCircle className="w-5 h-5" />}
            {t.message}
          </div>
        ))}
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-gray-800">
          <div
            ref={filterModalRef}
            className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
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
                className="flex-1 py-2.5 bg-gray-200 rounded-xl text-sm font-medium hover:bg-gray-300 transition"
              >
                ล้างทั้งหมด
              </button>
              <button
                onClick={() => {
                  setCurrentPage(1);
                  setShowFilterModal(false);
                }}
                className="flex-1 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-blue-700 hover:to-indigo-700 transition"
              >
                ใช้ตัวกรอง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAdd || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-gray-800">
          <div
            ref={addEditModalRef}
            className="bg-white rounded-2xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold mb-5">
              {showAdd ? "เพิ่มบ้านใหม่" : "แก้ไขบ้าน"}
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="ชื่อ-นามสกุล"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="เบอร์โทรศัพท์"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              />

              {/* ที่อยู่ + Dropdown ทั้ง 3 ชั้น */}
              <div className="relative">
                <textarea
                  ref={addressInputRef}
                  placeholder="บ้านเลขที่ เช่น 15/8 แล้วเว้นวรรค → เลือกหมู่"
                  value={address}
                  onChange={handleAddressChange}
                  rows={4}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
                />

                {/* หมู่ที่ */}
                {showMooDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {villages.map((m) => (
                      <div
                        key={m}
                        className="px-4 py-2.5 hover:bg-gray-100 cursor-pointer text-sm"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectMoo(m)}
                      >
                        หมู่ {m}
                      </div>
                    ))}
                  </div>
                )}

                {/* ตำบล */}
                {showSubdistrictDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {subdistricts.map((s) => (
                      <div
                        key={s}
                        className="px-4 py-2.5 hover:bg-gray-100 cursor-pointer text-sm"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectSubdistrict(s)}
                      >
                        ต.{s}
                      </div>
                    ))}
                  </div>
                )}

                {/* หมู่บ้าน */}
                {showVillageDropdown && selectedSubdistrict && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {villageBySubdistrict[selectedSubdistrict].map((v) => (
                      <div
                        key={v}
                        className="px-4 py-2.5 hover:bg-gray-100 cursor-pointer text-sm"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectVillageName(v)}
                      >
                        {v}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <textarea
                placeholder="หมายเหตุ (เช่น ข้างศูนย์เด็กเล็ก, หลังอบต.)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
              />

              <button
                onClick={detectLocation}
                disabled={isDetecting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
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
                value={coordInput}
                onChange={(e) => {
                  setCoordInput(e.target.value);
                  const [latStr, lngStr] = e.target.value.split(",");
                  const lat = parseFloat(latStr);
                  const lng = parseFloat(lngStr);
                  if (!isNaN(lat) && !isNaN(lng)) {
                    setDetectedLat(lat);
                    setDetectedLng(lng);
                  } else {
                    setDetectedLat(null);
                    setDetectedLng(null);
                  }
                }}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              />

              {detectedLat && detectedLng && (
                <div className="text-center -mt-2">
                  <button
                    onClick={() => verifyOnMaps(detectedLat, detectedLng)}
                    className="text-blue-600 text-xs underline flex items-center gap-1 mx-auto"
                  >
                    <ExternalLink className="w-3 h-3" /> ตรวจสอบบน Google Maps
                  </button>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAdd(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="flex-1 py-2.5 bg-gray-200 rounded-xl text-sm font-medium hover:bg-gray-300 transition"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={showAdd ? addHouse : saveEdit}
                  disabled={loading || saving}
                  className="flex-1 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition"
                >
                  {loading || saving
                    ? "กำลังบันทึก..."
                    : showAdd
                      ? "เพิ่มบ้าน"
                      : "บันทึก"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Example Modal */}
      {showCsvExample && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 text-gray-800"
          onClick={() => setShowCsvExample(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">ตัวอย่าง CSV</h3>
              <button
                onClick={() => setShowCsvExample(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <pre className="bg-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap">
              {`full_name,phone,address,note
สมชาย ใจดี,0812345678,"15/8 ม.5 ต.นาโบสถ์ บ.ลาดยาว อ.วังเจ้า จ.ตาก","ข้างศูนย์เด็กเล็ก"
สมศรี สุขใจ,0898765432,"123 ม.10 ต.เชียงทอง บ.วังเจ้า อ.วังเจ้า จ.ตาก","หลังอบต."`}
            </pre>
            <button
              onClick={downloadCsvExample}
              className="w-full mt-3 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" /> ดาวน์โหลดตัวอย่าง
            </button>
          </div>
        </div>
      )}
    </>
  );
}
