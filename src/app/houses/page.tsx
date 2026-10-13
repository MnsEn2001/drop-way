// C:\DropWay\New_Version\dropway-final\src\app\houses\page.tsx
"use client";
import { supabase } from "@/lib/supabase";
import { House } from "@/types/house";
import { useCallback, useEffect, useRef, useState } from "react";
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
  Phone,
} from "lucide-react";
import Papa from "papaparse";
import { toast } from "react-hot-toast";
import { useModalKeyboardBehavior } from "@/lib/viewport";

const ITEMS_PER_PAGE = 20;

/**
 * ดึงเลขบ้านจากที่อยู่
 * รองรับ: "5", "5/1", "125", "125/2", "บ้านเลขที่ 5" ฯลฯ
 * จะ match รูปแบบตัวเลข Number ตามด้วย /Number เอาแค่ตัวแรก
 */
function extractHouseNumber(address: string | null): string | null {
  if (!address) return null;
  const match = address.match(/\d+(?:\/\d+)?/);
  return match ? match[0] : null;
}

/**
 * ฟิลด์ที่ "ช่องค้นหาหลัก" จะค้นหา (ผู้ใช้เปิด/ปิดได้จาก Filter)
 */
type SearchOptions = {
  searchInName: boolean;
  searchInAddress: boolean;
  searchInPhone: boolean;
  searchInNote: boolean;
};

/**
 * ดึงชื่ออำเภอจาก "ที่อยู่จริง" ซึ่งแอปสร้างในรูปแบบ
 * "... ต.<ตำบล> อ.<อำเภอ> จ.<จังหวัด>"
 * รองรับ "อ.แม่สอด", "อ. แม่สอด", "อำเภอแม่สอด" และกรณีไม่มีช่องว่างหน้า "จ."
 * คืนค่า null เมื่อที่อยู่ไม่มีข้อมูลอำเภอ → จะไม่ถูกจัดเข้าในอำเภอที่ผู้ใช้เลือก
 * (ฐานข้อมูลไม่มีคอลัมน์อำเภอแยก ข้อมูลอำเภออยู่ใน address เท่านั้น)
 */
function extractDistrict(address: string | null): string | null {
  if (!address) return null;
  const match = address.match(/(?:อ\.|อำเภอ)\s*([^ \t\n]+)/);
  if (!match) return null;
  const name = match[1].replace(/(?:จ\.|จังหวัด).*$/, "").trim();
  return name.length > 0 ? name : null;
}

/**
 * คำค้นที่เป็นไปได้ว่าเป็น "เลขบ้าน" = ตัวเลขล้วน หรือตัวเลขที่มีเศษ เช่น "5", "12", "5/1"
 * ใช้เทียบกับเลขบ้านที่ดึงจาก field address เท่านั้น จึงไม่ปนกับเบอร์โทรศัพท์
 */
function isHouseNumberSearch(term: string): boolean {
  return /^\d+(?:\/\d+)?$/.test(term.trim());
}

// ฐานคะแนนของ "เลขบ้าน" ต้องอยู่เหนือคะแนนข้อความเสมอ
const HOUSE_NUMBER_BASE = 1_000_000;
// ช่องว่างระหว่างระดับ (มากกว่าเพดานคะแนนข้อความ) ทำให้แต่ละระดับไม่ทับกัน
const HOUSE_NUMBER_TIER = {
  exact: 500_000,
  subForm: 400_000,
  prefix: 300_000,
  contains: 200_000,
};
const MAX_TEXT_SCORE = 10_000;

/**
 * คะแนนความตรงของ "เลขบ้าน" (แยกออกจากคะแนนข้อความทั้งหมด)
 *
 * ระดับ (มาก → น้อย):
 *   1. exact  : เลขบ้านตรงกับคำค้นทั้งค่า                  เช่น 5 → "5"
 *   2. subForm: รูปแบบย่อย/ต่อเนื่องของเลขบ้านที่ค้นหา      เช่น 5 → "5/1", "5/2"
 *   3. prefix : เลขบ้านที่มีคำค้นเป็นส่วนต้น (ไม่ใช่ตรงตัว)  เช่น 5 → "55", 12 → "125"
 *   4. contains: เลขบ้านที่มีคำค้นอยู่ภายใน                เช่น 5 → "15", "105"
 *
 * ระดับ 3-4 เรียง "จำนวนหลักน้อยก่อน" เพื่อให้ 2 หลัก (15) มาก่อน 3 หลัก (105)
 * คืนค่า 0 เมื่อไม่มีการจับคู่กับเลขบ้านเลย
 */
function rankHouseNumberMatch(address: string | null, term: string): number {
  if (!address) return 0;
  const search = term.trim();
  if (!isHouseNumberSearch(search)) return 0;

  const houseNumber = extractHouseNumber(address);
  if (!houseNumber) return 0;

  const mainPart = houseNumber.split("/")[0];
  const hasFraction = houseNumber.includes("/");

  if (houseNumber === search) {
    return HOUSE_NUMBER_BASE + HOUSE_NUMBER_TIER.exact;
  }
  if (mainPart === search && hasFraction) {
    return HOUSE_NUMBER_BASE + HOUSE_NUMBER_TIER.subForm;
  }
  if (mainPart.startsWith(search)) {
    return HOUSE_NUMBER_BASE + HOUSE_NUMBER_TIER.prefix - mainPart.length;
  }
  if (mainPart.includes(search)) {
    return HOUSE_NUMBER_BASE + HOUSE_NUMBER_TIER.contains - mainPart.length;
  }
  return 0;
}

/**
 * คะแนนความตรงของ "ข้อความ" (ชื่อ / ที่อยู่ / เบอร์โทร / หมายเหตุ)
 * ใช้เฉพาะฟิลด์ที่ผู้ใช้เปิดไว้ และถูกจำกัดเพดานให้ต่ำกว่าคะแนนเลขบ้านเสมอ
 * จึงไม่สามารถแซงรายการที่ตรงกับเลขบ้านได้
 */
function rankTextFields(h: House, term: string, opts: SearchOptions): number {
  const lower = term.toLowerCase();

  const scoreText = (value: string, weight: number, caseSensitive: boolean) => {
    const haystack = caseSensitive ? value : value.toLowerCase();
    const needle = caseSensitive ? term : lower;
    if (haystack === needle) return 1000 * weight;
    if (haystack.startsWith(needle)) return 900 * weight;
    if (haystack.includes(needle)) {
      let score = 800 * weight;
      if (haystack.indexOf(needle) === 0) score += 50 * weight;
      const lastToken = haystack.split(" ").pop() || "";
      if (lastToken.endsWith(needle)) score += 30 * weight;
      return score;
    }
    return 0;
  };

  let total = 0;
  if (opts.searchInName && h.full_name) total += scoreText(h.full_name, 3, false);
  if (opts.searchInAddress && h.address) total += scoreText(h.address, 4, false);
  if (opts.searchInPhone && h.phone) total += scoreText(h.phone, 2, true);
  if (opts.searchInNote && h.note) total += scoreText(h.note, 1, false);

  return Math.min(total, MAX_TEXT_SCORE);
}

/**
 * คะแนนรวมของบ้านหนึ่งหลัง
 * = คะแนนเลขบ้าน (แยกส่วน, อยู่เหนือกว่าเสมอ) + คะแนนข้อความ (ตัวตัดสินเมื่อเลขบ้านเท่ากัน)
 * เลขบ้านดึงจาก address เท่านั้น ไม่ใช้ตัวเลขจากเบอร์โทร
 */
function rankHouse(h: House, term: string, opts: SearchOptions): number {
  if (!term.trim()) return 0;

  // เลขบ้านอยู่ใน field address → คิดคะแนนเลขบ้านเฉพาะเมื่อผู้ใช้เปิดค้นหาที่อยู่
  const houseNumberScore = opts.searchInAddress
    ? rankHouseNumberMatch(h.address, term)
    : 0;

  return houseNumberScore + rankTextFields(h, term, opts);
}

/**
 * ตรวจว่าบ้านตรงกับคำค้นหรือไม่ (partial match) ตามฟิลด์ที่ผู้ใช้เปิด
 * ใช้สำหรับ "กรอง" เท่านั้น — ไม่ได้กรองภายในฟังก์ชันจัดอันดับซ้ำ
 */
function matchesSearch(h: House, term: string, opts: SearchOptions): boolean {
  if (!term.trim()) return true;
  const lower = term.toLowerCase();

  if (opts.searchInName && h.full_name?.toLowerCase().includes(lower)) return true;
  if (opts.searchInAddress && h.address?.toLowerCase().includes(lower)) return true;
  if (opts.searchInPhone && h.phone?.includes(term)) return true;
  if (opts.searchInNote && h.note?.toLowerCase().includes(lower)) return true;
  return false;
}

/**
 * เรียงลำดับรายการที่ผ่านการกรองมาแล้วตามความตรงของ searchTerm
 * - ไม่กรองซ้ำ (การกรองทำไปแล้วครั้งเดียวก่อนเรียกฟังก์ชันนี้)
 * - ถ้าคะแนนเท่ากัน ใช้ลำดับเดิมของข้อมูลเป็นตัวตัดสิน → ผลลัพธ์เสถียรเสมอ
 */
function sortByRelevance(
  houses: House[],
  term: string,
  opts: SearchOptions,
): House[] {
  if (!term.trim()) return houses;
  return houses
    .map((house, index) => ({ house, index, score: rankHouse(house, term, opts) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.house);
}

export default function HousesPage() {
  const [houses, setHouses] = useState<House[]>([]);
  const [filteredHouses, setFilteredHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [houseToDelete, setHouseToDelete] = useState<House | null>(null);
  const [isDeletingHouse, setIsDeletingHouse] = useState(false);

  // ระบบกลางเดียวสำหรับ dialog ทุกตัว (ใช้ร่วมกับหน้า navigation): ล็อก
  // ตำแหน่ง dialog ตอนเปิด ไม่ให้คีย์บอร์ดทำให้ recenter/กระโดด และเลื่อน
  // เฉพาะเนื้อหาใน .modal-sheet ให้ field ที่ผู้ใช้แตะอยู่เหนือคีย์บอร์ดเสมอ
  useModalKeyboardBehavior();
  const [totalInDB, setTotalInDB] = useState<number | null>(null);
  const [addingIds, setAddingIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showNoCoords, setShowNoCoords] = useState(false);
  const [showWithCoords, setShowWithCoords] = useState(false);
  const [lastAdded, setLastAdded] = useState<Record<string, number>>({});
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
  const [isSavingHouse, setIsSavingHouse] = useState(false);
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
  const [selectedDistrict, setSelectedDistrict] = useState("แม่สอด");
  // ข้อมูลคงที่ - ปรับโครงสร้างให้รองรับหลายอำเภอ
  const districts = ["ทั้งหมด", "วังเจ้า", "แม่สอด"];

  // ข้อมูลตำบลและหมู่บ้านแยกตามอำเภอ
  const locationData: Record<
    string,
    {
      subdistricts: string[];
      villageBySubdistrict: Record<string, string[]>;
      subdistrictInfo: Record<string, { province: string }>;
    }
  > = {
    วังเจ้า: {
      subdistricts: ["นาโบสถ์", "เชียงทอง", "ประดาง"],
      villageBySubdistrict: {
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
        ประดาง: [
          "...",
          "ทุ่งกง",
          "คลองเชียงทอง",
          "ประดาง",
          "โตงเตง",
          "ท่าตะคร้อ",
        ],
      },
      subdistrictInfo: {
        นาโบสถ์: { province: "ตาก" },
        เชียงทอง: { province: "ตาก" },
        ประดาง: { province: "ตาก" },
      },
    },

    แม่สอด: {
      subdistricts: [
        "แม่ตาว",
        "แม่ปะ",
        "แม่กุ",
        "แม่สอด",
        "แม่กาษา",
        "ท่าสายลวด",
        "พระธาตุผาแดง",
        "พะวอ",
        "มหาวัน",
        "ด่านแม่ละเมา",
      ],
      villageBySubdistrict: {
        แม่ตาว: [
          "...",
          "แม่ตาวแพะ",
          "แม่ตาวเหนือ",
          "แม่ตาวกลาง",
          "แม่ตาวใต้",
          "แม่ตาวสันแป่",
          "แม่ตาวสันโรงเรียน",
          "ดอนไชย",
        ],
        แม่สอด: [
          "...",
          "ในเมือง",
          "ท่าอาจ",
          "บางกาด",
          "ช่องแคบ" /* เพิ่มตามจริง */,
        ],
        แม่กุ: ["...", "หนองหลวง", "ห้วยน้ำเย็น" /* ตัวอย่าง */],
        แม่กาษา: ["...", "โป่งแพร", "ห้วยน้ำขาว" /* ตัวอย่าง */],

        ท่าสายลวด: ["...", "ท่าสายลวด", "บางมะดัน"],
        พระธาตุผาแดง: ["...", "เจดีย์พระธาตุ", "ผาแดง"],
        พะวอ: ["...", "พะวอ", "ห้วยไม้แดง"],
        มหาวัน: ["...", "ห้วยไม้แป้น", "มหาวัน"],
        ด่านแม่ละเมา: ["...", "ด่านแม่ละเมา", "เชตะวันคีรี"],
        แม่ปะ: ["...", "แม่ปะ", "ท่าอิฐ"],
        // สามารถเพิ่มหมู่บ้านจริง ๆ เพิ่มเติมได้ตามข้อมูลจาก อบต./ทต.
      },
      subdistrictInfo: {
        แม่สอด: { province: "ตาก" },
        แม่กุ: { province: "ตาก" },
        แม่กาษา: { province: "ตาก" },
        แม่ตาว: { province: "ตาก" },
        ท่าสายลวด: { province: "ตาก" },
        พระธาตุผาแดง: { province: "ตาก" },
        พะวอ: { province: "ตาก" },
        มหาวัน: { province: "ตาก" },
        ด่านแม่ละเมา: { province: "ตาก" },
        แม่ปะ: { province: "ตาก" },
      },
    },
  };

  // ค่า default ถ้าเลือก "ทั้งหมด" → รวมทุกอำเภอ
  const allSubdistricts = Array.from(
    new Set(Object.values(locationData).flatMap((d) => d.subdistricts)),
  ).sort();

  const allVillageBySubdistrict = Object.values(locationData).reduce(
    (acc, d) => ({ ...acc, ...d.villageBySubdistrict }),
    {} as Record<string, string[]>,
  );

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

  // กรองข้อมูล + เรียงลำดับตามความตรงของ searchTerm
  // ลำดับการทำงาน (สำคัญ):
  //   (1) อำเภอ/พื้นที่แบบเข้มงวด → (2) ตัวกรองเดิมที่มีอยู่ →
  //   (3) ค้นหาข้อความตามฟิลด์ที่เปิด → (4) จัดอันดับ → (5) แบ่งหน้า
  // การจัดอันดับทำ "หลัง" การกรองเสมอ จึงไม่ดึงรายการจากอำเภออื่นกลับมา
  useEffect(() => {
    const searchOptions: SearchOptions = {
      searchInName,
      searchInAddress,
      searchInPhone,
      searchInNote,
    };

    let filtered = houses;

    // (1) อำเภอ: ต้องตรงกับชื่ออำเภอที่ดึงได้จากที่อยู่จริงเท่านั้น
    //     รายการที่ที่อยู่ไม่ระบุอำเภอ (extractDistrict = null) จะไม่ถูกจัดเข้า
    //     อำเภอที่เลือกโดยการเดา
    if (selectedDistrict !== "ทั้งหมด") {
      filtered = filtered.filter(
        (h) => extractDistrict(h.address) === selectedDistrict,
      );
    }

    // (2) ตัวกรองเดิมที่มีอยู่แล้ว
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

    // (3) ค้นหาข้อความ (partial match) เฉพาะฟิลด์ที่ผู้ใช้เปิด
    filtered = filtered.filter((h) => matchesSearch(h, searchTerm, searchOptions));

    // (4) จัดอันดับเฉพาะรายการที่ผ่านตัวกรองทั้งหมดแล้ว
    setFilteredHouses(sortByRelevance(filtered, searchTerm, searchOptions));
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
    searchInNote,
    selectedDistrict,
  ]);

  const clearFilters = () => {
    setHouseNumberFilter("");
    setPhoneFilter("");
    setVillageFilter("");
    setSubdistrictFilter("");
    setDistrictFilter("");
    setProvinceFilter("");
  };

  // โหลดบ้านทั้งหมด (ใช้ทั้งตอนเปิดหน้าและตอนกด "ลองใหม่" — โค้ดชุดเดียว)
  const loadHouses = useCallback(async () => {
    setLoading(true);
    setLoadingError(null);
    let allHouses: House[] = [];
    let start = 0;
    const pageSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from("houses")
          .select("*")
          .order("created_at", { ascending: false })
          .range(start, start + pageSize - 1);

        if (error) {
          console.error("Error:", error);
          toast.error("โหลดข้อมูลไม่สำเร็จ");
          setLoadingError(
            "ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วกดลองใหม่อีกครั้ง",
          );
          break;
        }

        if (!data || data.length === 0) break;

        allHouses = [...allHouses, ...data];
        start += pageSize;

        // ถ้าได้น้อยกว่า pageSize → จบแล้ว
        if (data.length < pageSize) break;
      }

    setHouses(allHouses);
    setTotalInDB(allHouses.length);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadHouses();
  }, [loadHouses]);

  // หากโหลดครั้งแรกแล้วล้มเหลว ให้แสดงปุ่มลองใหม่ ไม่ใช่แค่หน้าว่าง
  const retryInitialLoad = () => {
    loadHouses();
  };

  // แก้ฟังก์ชัน getCountText() ให้แสดงจำนวนจริงทั้งหมด
  const getCountText = () => {
    const totalAll = totalInDB ?? houses.length;
    const total = filteredHouses.length;

    let prefix = "";

    if (selectedDistrict !== "ทั้งหมด") {
      prefix = `อ.${selectedDistrict} `;
    }

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

    if (searchTerm || prefix) {
      return `พบ ${total.toLocaleString()} บ้าน ${prefix}จากทั้งหมด ${totalAll.toLocaleString()} หลัง`;
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

    const maxVisible = 5; // จำนวนปุ่มเลขหน้าที่แสดงสูงสุด (รวมหน้าปัจจุบัน)

    // คำนวณช่วงหน้าที่จะแสดง (ไม่เปลี่ยนค่าอีก → ใช้ const)
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);

    // ถ้าช่วงสั้นเกินไป ให้ยืดไปทางซ้ายเพื่อให้ครบ maxVisible
    const adjustedStartPage = Math.max(1, endPage - maxVisible + 1);
    const finalStartPage = Math.max(startPage, adjustedStartPage);

    // แสดงหน้า 1 เสมอ ถ้าปัจจุบันอยู่ไกลจากหน้าแรก
    if (currentPage > 3) {
      pages.push(
        <button
          key={1}
          type="button"
          onClick={() => goToPage(1)}
          onMouseDown={(e) => e.preventDefault()}
          className="h-10 w-10 rounded-lg border border-gray-200 bg-white font-medium transition-all hover:bg-gray-100 active:scale-95"
        >
          1
        </button>,
      );
    }

    // แสดงเลขหน้าช่วงปัจจุบัน
    for (let i = finalStartPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          type="button"
          onClick={() => goToPage(i)}
          onMouseDown={(e) => e.preventDefault()}
          aria-current={i === currentPage ? "page" : undefined}
          className={`h-10 w-10 rounded-lg font-medium transition-all active:scale-95 ${
            i === currentPage
              ? "border border-teal-600 bg-teal-600 text-white shadow-sm"
              : "border border-gray-200 bg-white hover:bg-gray-100"
          }`}
        >
          {i}
        </button>,
      );
    }

    // แสดง ... และหน้าสุดท้าย (ถ้ายังมีหน้าอยู่ข้างหน้า)
    if (endPage < totalPages) {
      pages.push(
        <button
          key="ellipsis-right"
          type="button"
          onClick={() => setShowPageInput(true)}
          onMouseDown={(e) => e.preventDefault()}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 font-medium hover:bg-gray-200 transition-all active:scale-95 mx-1"
        >
          ...
        </button>,
      );

      pages.push(
        <button
          key={totalPages}
          type="button"
          onClick={() => goToPage(totalPages)}
          onMouseDown={(e) => e.preventDefault()}
          className="w-10 h-10 rounded-lg font-medium bg-gray-200 hover:bg-gray-300 transition-all active:scale-95"
        >
          {totalPages}
        </button>,
      );
    }

    return pages;
  };

  // แก้ฟังก์ชันนี้ทั้งหมด (แทนที่อันเดิม)
  const reloadHouses = async () => {
    let allHouses: House[] = [];
    let start = 0;
    const pageSize = 1000;

    setLoading(true);

    try {
      while (true) {
        const { data, error } = await supabase
          .from("houses")
          .select("*")
          .order("created_at", { ascending: false })
          .range(start, start + pageSize - 1);

        if (error) {
          toast.error("รีโหลดข้อมูลไม่สำเร็จ");
          console.error(error);
          break;
        }

        if (!data || data.length === 0) break;

        allHouses = [...allHouses, ...data];
        start += pageSize;

        if (data.length < pageSize) break;
      }

      setHouses(allHouses);
      setTotalInDB(allHouses.length);
      toast.success("รีโหลดข้อมูลสำเร็จ");
    } catch {
      toast.error("เกิดข้อผิดพลาดในการรีโหลด");
    } finally {
      setLoading(false);
    }
  };

  // ⭐ แก้ฟังก์ชัน addToNav ทั้งหมด (แทนที่อันเดิม)
  const addToNav = async (houseId: string) => {
    const now = Date.now();
    if (lastAdded[houseId] && now - lastAdded[houseId] < 1000) {
      return; // ป้องกันกดซ้ำภายใน 1 วิ
    }

    if (addingIds.includes(houseId)) return;

    setAddingIds((prev) => [...prev, houseId]);
    setLastAdded((prev) => ({ ...prev, [houseId]: now }));

    const { error } = await supabase
      .from("user_navigation_houses")
      .insert({ house_id: houseId });

    if (error) {
      if (error.code === "23505") {
        toast("บ้านนี้อยู่ในรายการนำทางแล้ว", {
          icon: "ℹ️",
          duration: 1000,
        });
      } else {
        toast.error("เพิ่มไม่สำเร็จ");
      }
    } else {
      toast.success(" เพิ่มเรียบร้อย");
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

    // เลือกข้อมูลตาม selectedDistrict
    let currentSubdistricts = allSubdistricts;
    let currentVillageBySub = allVillageBySubdistrict;

    if (selectedDistrict !== "ทั้งหมด") {
      const data = locationData[selectedDistrict];
      if (data) {
        currentSubdistricts = data.subdistricts;
        currentVillageBySub = data.villageBySubdistrict;
        // ลบ currentSubdistrictInfo ออก เพราะไม่ได้ใช้ที่นี่
      }
    }
    // ไม่ต้อง else เพราะถ้า "ทั้งหมด" ก็ใช้ allSubdistricts และ allVillageBySubdistrict อยู่แล้ว

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

    // 2. มี ม.เลข แล้วกด space → แสดงหมู่บ้านตามอำเภอ
    if (trimmed.match(/ม\.\d+$/) && /\s$/.test(input)) {
      if (hasShownVillageSuggestions) {
        // ครั้งต่อไป แสดงแค่ ต.ชื่อตำบล
        setAddressSuggestions(
          currentSubdistricts.map((sd) => ({
            label: `ต.${sd}`,
            value: `ต.${sd}`,
          })),
        );
        return;
      }

      // ครั้งแรก → แสดงรายการหมู่บ้าน + ข้าม
      const allVillages = Array.from(
        new Set(Object.values(currentVillageBySub).flat()),
      ).filter((v) => v !== "...");
      const suggestions = ["...", ...allVillages];
      setAddressSuggestions(
        suggestions.map((v) => ({
          label: v === "..." ? "➜ ข้ามการระบุหมู่บ้าน" : `บ.${v}`,
          value: v === "..." ? "" : `บ.${v} `,
        })),
      );
      setHasShownVillageSuggestions(true);
      return;
    }

    // 3. มี "บ." แล้วกด space → แสดง ต.ชื่อตำบล
    if (trimmed.match(/บ\.[^ ]+$/) && /\s$/.test(input)) {
      setAddressSuggestions(
        currentSubdistricts.map((sd) => ({
          label: `ต.${sd}`,
          value: `ต.${sd}`,
        })),
      );
      return;
    }

    // 4. พิมพ์ "ต." แล้วกำลังพิมพ์ตำบล → แสดง ต.ชื่อตำบล
    const tambonMatch = trimmed.match(/ต\.([^ ]*)$/);
    if (tambonMatch) {
      const partial = tambonMatch[1];
      const matches = currentSubdistricts.filter((sd) => sd.includes(partial));
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

      // หา province จากข้อมูล
      let province = "ตาก"; // default
      if (selectedDistrict !== "ทั้งหมด") {
        const info = locationData[selectedDistrict]?.subdistrictInfo[tambon];
        if (info) province = info.province;
      } else {
        // ถ้า "ทั้งหมด" หาจากรวมทุกอำเภอ
        const info = Object.values(locationData).find(
          (d) => d.subdistrictInfo[tambon],
        )?.subdistrictInfo[tambon];
        if (info) province = info.province;
      }

      // กำหนดอำเภอ (ถ้าเลือกทั้งหมด อาจ default เป็นอำเภอที่พบบ่อย หรือปล่อยให้ผู้ใช้กรอกเอง)
      const district =
        selectedDistrict === "ทั้งหมด" ? "แม่สอด" : selectedDistrict; // หรือปรับตามต้องการ

      newAddress = newAddress.trim() + ` อ.${district} จ.${province}`;
    }

    setAddressInput(newAddress);
    setFormData((prev) => ({ ...prev, address: newAddress }));
    setAddressSuggestions([]);
    setHighlightedSuggestionIndex(-1);

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

  const closeModal = useCallback(() => {
    setEditingHouse(null);
    setIsAdding(false);
    setFormData({});
    setIsDetecting(false);
  }, []);

  // Modal ทุกตัวปิดได้จากปุ่มภายใน dialog เท่านั้น (ยกเลิก/ปิด/บันทึก/ยืนยัน)
  // — ไม่มี Escape และไม่มี overlay/backdrop click ที่ทำให้ปิดได้
  // Body lock: ระหว่างมี modal เปิดให้ล็อกการ scroll ของหน้าด้านหลัง
  const anyModalOpen =
    showFilterModal || isAdding || !!editingHouse || !!houseToDelete || showPageInput;
  useEffect(() => {
    if (!anyModalOpen) return;
    document.body.classList.add("nav-dialog-open");
    return () => {
      document.body.classList.remove("nav-dialog-open");
    };
  }, [anyModalOpen]);

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
    // ป้องกันกดซ้ำและปิด modal ขณะกำลังบันทึก
    if (isSavingHouse) return;
    // อนุญาตให้สร้างด้วยข้อมูลบางส่วนได้ แต่ห้ามบันทึก record ว่างเปล่า
    const hasAnyField =
      !!formData.full_name ||
      !!formData.phone ||
      !!formData.address ||
      !!formData.lat ||
      !!formData.lng ||
      !!formData.note;
    if (isAdding && !hasAnyField) {
      toast.error("กรุณากรอกข้อมูลอย่างน้อยหนึ่งช่องก่อนบันทึก");
      return;
    }

    const finalData = {
      ...formData,
      lat: formData.lat ?? null,
      lng: formData.lng ?? null,
    };

    setIsSavingHouse(true);
    try {
      if (isAdding) {
        const { error } = await supabase.from("houses").insert(finalData);
        if (error) {
          toast.error("เพิ่มบ้านไม่สำเร็จ: " + error.message);
          return;
        }
        toast.success("เพิ่มบ้านสำเร็จ!");
      } else {
        if (!editingHouse) return;
        const { error } = await supabase
          .from("houses")
          .update(finalData)
          .eq("id", editingHouse.id);
        if (error) {
          toast.error("เกิดข้อผิดพลาด: " + error.message);
          return;
        }
        toast.success("บันทึกสำเร็จ");
      }

      await reloadHouses();
      closeModal();
    } finally {
      setIsSavingHouse(false);
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

  // ลบได้เฉพาะหลังยืนยันในหน้าต่างยืนยันของแอป (ไม่ใช้ confirm ของเบราว์เซอร์)
  const confirmDeleteHouse = async () => {
    const house = houseToDelete;
    if (!house || isDeletingHouse) return;

    setIsDeletingHouse(true);
    try {
      const { data, error } = await supabase
        .from("houses")
        .delete()
        .eq("id", house.id)
        .select();

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
      setHouses((prev) => prev.filter((h) => h.id !== house.id));
      // หากกำลังแสดงหน้าที่ว่างเปล่าหลังจากลบ ให้ย้อนกลับหน้าก่อน
      const totalPagesAfter = Math.ceil(
        filteredHouses.filter((h) => h.id !== house.id).length /
          ITEMS_PER_PAGE,
      );
      if (currentPage > Math.max(1, totalPagesAfter)) {
        setCurrentPage(Math.max(1, totalPagesAfter));
      }
      setHouseToDelete(null);
    } finally {
      setIsDeletingHouse(false);
    }
  };

  const openNavigation = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.location.href = url;
  };

  return (
    <div className="page-shell mx-auto max-w-7xl px-4 py-6 pb-32 sm:py-8 md:pb-8">
      {/* หัวข้อ + ปุ่ม + จำนวนบ้าน */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">
            <Home className="h-7 w-7 text-teal-700" aria-hidden="true" />
            คลังบ้านทั้งหมด
          </h1>
          <p className="mt-2 text-sm font-medium text-gray-600">
            {getCountText()}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={downloadAllHousesCsv}
            disabled={downloading}
            className="btn btn-secondary flex-1 sm:flex-none"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {downloading ? "กำลังโหลด..." : "โหลด CSV"}
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="btn btn-primary flex-1 sm:flex-none"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            เพิ่มบ้าน
          </button>
        </div>
      </div>

      {/* ช่องค้นหา + ปุ่ม X ล้างคำค้นหา + ปุ่มกรอง */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <label htmlFor="house-search" className="sr-only">
            ค้นหาบ้าน
          </label>
        
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
        
          <input
            id="house-search"
            ref={searchInputRef}
            type="text"
            placeholder="ค้นหาด้วยชื่อหรือที่อยู่..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 pr-28"
          />
      
          {/* ปุ่ม X ล้างคำค้นหา: อยู่ตำแหน่งเดิมก่อนปุ่ม Filter */}
          {searchTerm && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setSearchTerm("");
                searchInputRef.current?.focus();
              }}
              aria-label="ล้างคำค้นหา"
              className="zoom-pinch-ok absolute right-14 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <XIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        
          {/* ปุ่ม Filter: อยู่ขวาสุดเหมือนเดิม */}
          <button
            type="button"
            onClick={() => setShowFilterModal(true)}
            aria-label="เปิดตัวกรองบ้าน"
            className="zoom-pinch-ok absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200"
          >
            <Filter className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ตัวกรองพิกัด + เลือกอำเภอ */}
      <div className="card mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 p-4 sm:p-5">
        {/* Checkbox เดิม */}
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={showNoCoords}
            onChange={(e) => setShowNoCoords(e.target.checked)}
            className="h-5 w-5 rounded accent-amber-600"
          />
          <span>ไม่มีพิกัด</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={showWithCoords}
            onChange={(e) => setShowWithCoords(e.target.checked)}
            className="h-5 w-5 rounded accent-teal-600"
          />
          <span>มีพิกัด</span>
        </label>

        {/* Dropdown เลือกอำเภอ */}
        <div className="flex items-center gap-3">
          <label htmlFor="house-district" className="sr-only">
            เลือกอำเภอ
          </label>
          <select
            id="house-district"
            value={selectedDistrict}
            onChange={(e) => {
              setSelectedDistrict(e.target.value);
              // รีเซ็ต flag และ suggestions เมื่อเปลี่ยนอำเภอ
              setHasShownVillageSuggestions(false);
              setAddressSuggestions([]);
            }}
            className="min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm focus:border-teal-500 focus:outline-none"
          >
            {districts.map((dist) => (
              <option key={dist} value={dist}>
                {dist === "ทั้งหมด" ? "ทุกอำเภอ" : `อ.${dist}`}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* รายการบ้าน */}
      {currentHouses.length === 0 ? (
        loading ? (
          <div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            aria-busy="true"
            aria-label="กำลังโหลดคลังบ้าน"
          >
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className="card p-5">
                <div className="skeleton h-5 w-2/3" />
                <div className="skeleton mt-3 h-4 w-1/2" />
                <div className="skeleton mt-4 h-4 w-full" />
                <div className="skeleton mt-2 h-4 w-4/5" />
              </div>
            ))}
          </div>
        ) : loadingError ? (
          <div className="error-state">
            <p className="text-base font-semibold">โหลดคลังบ้านไม่สำเร็จ</p>
            <p className="text-sm">{loadingError}</p>
            <button
              type="button"
              onClick={retryInitialLoad}
              className="btn btn-primary mt-2"
            >
              ลองใหม่
            </button>
          </div>
        ) : (
          <div className="empty-state">
            <p className="text-base font-medium text-gray-700">
              ไม่พบบ้านที่ตรงกับเงื่อนไขการค้นหา
            </p>
            <p className="text-sm">
              ลองล้างคำค้นหาหรือเปลี่ยนตัวกรอง แล้วค้นหาอีกครั้ง
            </p>
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentHouses.map((h) => (
              <div
                key={h.id}
                className="card relative flex flex-col overflow-hidden transition-shadow hover:shadow-md"
              >
                {/* มุมขวาบน: ปุ่ม + (ป้องกันคีย์บอร์ดปิด) */}
                <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
                  <button
                    onClick={() => addToNav(h.id)}
                    onMouseDown={(e) => e.preventDefault()}
                    disabled={addingIds.includes(h.id)}
                    aria-label={
                      addingIds.includes(h.id)
                        ? "กำลังเพิ่มเข้าสู่การนำทาง"
                        : "เพิ่มเข้าสู่การนำทาง"
                    }
                    className={`zoom-pinch-ok flex h-11 w-11 items-center justify-center rounded-xl border bg-white shadow-sm transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
                      h.lat && h.lng
                        ? "border-teal-200 text-teal-700 hover:border-teal-400 hover:bg-teal-50"
                        : "border-amber-200 text-amber-700 hover:border-amber-400 hover:bg-amber-50"
                    }`}
                    title={
                      addingIds.includes(h.id)
                        ? "กำลังเพิ่ม..."
                        : "เพิ่มเข้าสู่การนำทาง"
                    }
                  >
                    {addingIds.includes(h.id) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* เนื้อหาการ์ด */}
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="line-clamp-2 text-lg font-bold text-gray-900 text-wrap-safe">
                    {h.full_name || "ไม่มีชื่อ"}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {h.lat && h.lng ? (
                      <span className="badge badge-teal">มีพิกัด</span>
                    ) : (
                      <span className="badge badge-amber">ไม่มีพิกัด</span>
                    )}
                    {typeof h.quantity === "number" && h.quantity > 0 && (
                      <span className="badge badge-slate">
                        {h.quantity.toLocaleString("th-TH")} ชิ้น
                      </span>
                    )}
                  </div>
                  {h.phone && (
                    <div className="mt-3 flex items-center gap-2">
                      <p className="select-none text-sm font-medium text-gray-700">
                        {h.phone}
                      </p>

                      {/* ปุ่ม Copy */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(h.phone!);
                          toast.success("คัดลอกเบอร์เรียบร้อยแล้ว!");
                        }}
                        className="zoom-pinch-ok flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50"
                        title="คัดลอกเบอร์โทร"
                        aria-label="คัดลอกเบอร์โทร"
                      >
                        <Copy className="h-4 w-4" aria-hidden="true" />
                      </button>

                      {/* ปุ่ม โทร ออกทันที */}
                      <a
                        href={`tel:${h.phone.replace(/[^0-9+]/g, "")}`} // ล้างอักขระพิเศษออกให้โทรได้จริง
                        onClick={(e) => e.stopPropagation()} // ป้องกัน bubble ไป card
                        className="zoom-pinch-ok flex h-9 w-9 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-teal-700 transition-colors hover:border-teal-400 hover:bg-teal-100"
                        title={`โทรหา ${h.full_name || "ลูกค้า"}`}
                        aria-label="โทรออกทันที"
                      >
                        <Phone className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </div>
                  )}
                  <div className="mt-3 flex items-start gap-2 text-sm text-gray-600">
                    <MapPin
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400"
                      aria-hidden="true"
                    />
                    <span className="line-clamp-3 text-wrap-safe">
                      {h.address || "ไม่ระบุที่อยู่"}
                    </span>
                  </div>
                  {h.note && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">
                      <span className="font-semibold text-amber-900">
                        หมายเหตุ:{" "}
                      </span>
                      <span className="whitespace-pre-line text-wrap-safe text-amber-900">
                        {h.note}
                      </span>
                    </div>
                  )}
                </div>

                {/* ปุ่มด้านล่าง: ลบ, นำทาง, แก้ไข */}
                <div className="mt-auto flex items-center gap-2 border-t border-gray-100 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setHouseToDelete(h)}
                    onMouseDown={(e) => e.preventDefault()}
                    className="icon-btn icon-btn-danger"
                    title="ลบ"
                    aria-label="ลบบ้านหลังนี้"
                  >
                    <Trash2 className="h-5 w-5" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(h)}
                    onMouseDown={(e) => e.preventDefault()}
                    className="icon-btn"
                    title="แก้ไข"
                    aria-label="แก้ไขข้อมูลบ้าน"
                  >
                    <Edit3 className="h-5 w-5" aria-hidden="true" />
                  </button>

                  {h.lat && h.lng && (
                    <button
                      type="button"
                      onClick={() => openNavigation(h.lat!, h.lng!)}
                      onMouseDown={(e) => e.preventDefault()}
                      className="btn btn-secondary ml-auto"
                    >
                      <Navigation className="h-4 w-4" aria-hidden="true" />
                      นำทาง
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mb-6 mt-10 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                onMouseDown={(e) => e.preventDefault()}
                disabled={currentPage === 1}
                className="icon-btn"
                aria-label="หน้าก่อนหน้า"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="flex items-center gap-2">
                {renderPageNumbers()}
              </div>
              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                onMouseDown={(e) => e.preventDefault()}
                disabled={currentPage === totalPages}
                className="icon-btn"
                aria-label="หน้าถัดไป"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Input กรอกหน้าเมื่อกด ... */}
          {showPageInput && (
            <div className="modal-overlay flex items-center justify-center p-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="houses-page-input-title"
                className="modal-sheet w-full max-w-xs p-5 sm:rounded-2xl sm:p-6"
              >
                <h3
                  id="houses-page-input-title"
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
        <div
          className="modal-overlay flex items-center justify-center p-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="modal-sheet w-full max-w-md p-5 sm:rounded-2xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="filter-modal-title" className="text-lg font-bold">
                ตัวกรองบ้าน
              </h2>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                aria-label="ปิดตัวกรอง"
                className="icon-btn h-10 w-10 shrink-0"
              >
                <XIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* ค้นหาจากฟิลด์ใดบ้าง */}
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

      {/* Modal เพิ่ม / แก้ไขบ้าน */}      {(editingHouse || isAdding) && (
        <div
          className="modal-overlay flex items-center justify-center p-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="house-form-title"
            onClick={(e) => e.stopPropagation()}
            className="modal-sheet w-full max-w-md p-5 sm:rounded-2xl sm:p-6"
          >
            <h2 id="house-form-title" className="text-lg font-bold">
              {isAdding ? "เพิ่มบ้านใหม่" : "แก้ไขบ้าน"}
            </h2>
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="house-full-name" className="label">
                    ชื่อ-นามสกุล
                  </label>
                  <input
                    id="house-full-name"
                    type="text"
                    autoComplete="name"
                    placeholder="เช่น คุณสมชาย"
                    value={formData.full_name || ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, full_name: e.target.value }))
                    }
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="house-phone" className="label">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    id="house-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="เช่น 0812345678"
                    value={formData.phone || ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, phone: e.target.value }))
                    }
                    className="input"
                  />
                </div>
              </div>
              <div className="relative">
                <label htmlFor="house-address" className="label">
                  ที่อยู่
                </label>
                <input
                  id="house-address"
                  type="text"
                  autoComplete="street-address"
                  placeholder="บ้านเลขที่ → space → เลือกหมู่ที่ → space → เลือกตำบล → space → เลือกหมู่บ้าน"
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
                        onMouseDown={(e) => e.preventDefault()} // ป้องกัน input เสีย focus
                        onClick={() => selectAddressSuggestion(suggestion)}
                        className={`w-full px-4 py-3 text-left text-sm transition hover:bg-teal-50 ${
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
              <div>
                <label htmlFor="house-note" className="label">
                  หมายเหตุ
                </label>
                <textarea
                  id="house-note"
                  placeholder="เช่น ข้างศูนย์เด็กเล็ก, หลังอบต."
                  rows={2}
                  value={formData.note || ""}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, note: e.target.value }))
                  }
                  className="input resize-none"
                />
              </div>
              <button
                type="button"
                onClick={detectLocation}
                disabled={isDetecting}
                //className="btn btn-secondary btn-block"
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {isDetecting ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                )}
                {isDetecting ? "กำลังตรวจจับ..." : "ตรวจจับตำแหน่งปัจจุบัน"}
              </button>
              <div>
                <label htmlFor="house-coords" className="label">
                  พิกัด (ไม่บังคับ)
                </label>
              <input
                id="house-coords"
                type="text"
                placeholder="เช่น 16.123456,99.123456"
                value={coordsInput}
                onChange={(e) => {
                  const value = e.target.value.trim(); // trim เพื่อความสะอาด
                  setCoordsInput(value);

                  if (value === "") {
                    // ช่องว่าง = ต้องการลบพิกัด
                    setFormData((prev) => ({ ...prev, lat: null, lng: null }));
                    return;
                  }

                  const parts = value.split(",");
                  if (parts.length === 2) {
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
                      // รูปแบบผิด → ถือว่าไม่ต้องการพิกัด (หรือจะแจ้งเตือนก็ได้ แต่ที่นี่ให้ลบ)
                      setFormData((prev) => ({
                        ...prev,
                        lat: null,
                        lng: null,
                      }));
                    }
                  } else {
                    // ไม่ครบ 2 ส่วน → ไม่บันทึกพิกัด (ถือเป็นลบ)
                    setFormData((prev) => ({ ...prev, lat: null, lng: null }));
                  }
                }}
                className="input"
              />
              </div>
              {formData.lat && formData.lng && (
                <div className="-mt-2 mb-2 text-center">
                  <button
                    type="button"
                    onClick={() => verifyOnMaps(formData.lat!, formData.lng!)}
                    className="mx-auto flex items-center gap-1 text-xs font-medium text-teal-700 underline"
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    ตรวจสอบบน Google Maps
                  </button>
                </div>
              )}
              <div className="modal-foot flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={isSavingHouse}
                  className="btn btn-secondary flex-1"
                >
                  ยกเลิก
                </button>

                <button
                  type="button"
                  onClick={saveHouse}
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={isSavingHouse}
                  className="btn btn-primary flex-1"
                >
                  {isSavingHouse ? (
                    <>
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                      กำลังบันทึก...
                    </>
                  ) : isAdding ? (
                    "เพิ่มบ้าน"
                  ) : (
                    "บันทึก"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal ยืนยันการลบบ้าน */}
      {houseToDelete && (
        <div
          className="modal-overlay flex items-center justify-center p-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-house-title"
            onClick={(e) => e.stopPropagation()}
            className="modal-sheet w-full max-w-md p-5 sm:rounded-2xl"
          >
            <h2
              id="delete-house-title"
              className="text-lg font-bold text-gray-900"
            >
              ลบบ้านหลังนี้?
            </h2>
            <p className="mt-2 text-sm break-words text-gray-600">
              {houseToDelete.full_name?.trim() || "รายการที่เลือก"} —
              การลบไม่สามารถย้อนกลับได้
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setHouseToDelete(null)}
                disabled={isDeletingHouse}
                className="btn btn-secondary flex-1"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeleteHouse}
                disabled={isDeletingHouse}
                className="btn flex-1 border-transparent bg-red-600 font-semibold text-white hover:bg-red-700 hover:text-white"
              >
                {isDeletingHouse ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    กำลังลบ...
                  </>
                ) : (
                  "ลบบ้าน"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
