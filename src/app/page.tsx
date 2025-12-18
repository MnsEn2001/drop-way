import { redirect } from "next/navigation";

export default function Home() {
  redirect("/houses"); // ถ้ายังไม่ล็อกอิน middleware จะ redirect ไป login ให้เอง
}
