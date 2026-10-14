"use client";
import { ShoppingBag } from "lucide-react";
import { Button } from "./ui/button";

/**
 * ปุ่มค้นหาเลขในเว็บ ลอตเตอรี่พลัส
 *
 * robots.txt ของเว็บนั้นไม่อนุญาตให้บอทดึงข้อมูล ระบบจึงไม่ scrape และไม่เรียกเว็บนั้นจากเซิร์ฟเวอร์
 * ปุ่มนี้เปิดเว็บในแท็บใหม่บนเบราว์เซอร์ของผู้ใช้ และคัดลอกหมายเลขไว้ให้วางในช่องค้นหา
 * ถ้าเว็บนั้นมี URL ค้นหาที่รับหมายเลขได้ ตั้ง NEXT_PUBLIC_LOTTERYPLUS_SEARCH_URL เช่น
 *   https://example.com/search?number={number}
 */
const HOME = "https://xn--m3ca1athe9asc7b2b6iqe.com/";
const TEMPLATE = process.env.NEXT_PUBLIC_LOTTERYPLUS_SEARCH_URL;

export function lotteryPlusUrl(number: string) {
  return TEMPLATE && TEMPLATE.includes("{number}") ? TEMPLATE.replace("{number}", number) : HOME;
}

export function LotteryPlusButton({ number, compact = false }: { number: string; compact?: boolean }) {
  async function open() {
    try {
      await navigator.clipboard.writeText(number);
    } catch {
      /* เบราว์เซอร์ไม่อนุญาตให้คัดลอก — ยังเปิดเว็บได้ */
    }
    window.open(lotteryPlusUrl(number), "_blank", "noopener,noreferrer");
  }
  return (
    <Button
      variant="ghost"
      size={compact ? "icon" : "sm"}
      onClick={open}
      aria-label={`ค้นหา ${number} ในลอตเตอรี่พลัส (คัดลอกเลขให้แล้ว)`}
      title="เปิดลอตเตอรี่พลัส และคัดลอกเลขไว้ให้วางในช่องค้นหา"
    >
      <ShoppingBag aria-hidden />
      {!compact && <span>หาในลอตเตอรี่พลัส</span>}
    </Button>
  );
}
