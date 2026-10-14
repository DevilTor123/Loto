import type { Metadata } from "next";
import { Randomizer } from "@/components/random/randomizer";

export const metadata: Metadata = {
  title: "สุ่มเลข 6 หลัก",
  description: "สุ่มหมายเลข 6 หลักด้วย crypto.getRandomValues 3 โหมด พร้อมข้อมูลประวัติของแต่ละหมายเลข — ไม่ใช่การทำนายผล",
};

export default function RandomPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-wide md:text-3xl">สุ่มเลข 6 หลัก</h1>
        <p className="text-sm text-muted">ทุกโหมดแสดงวิธีการที่ตรวจสอบได้ และไม่มีโหมดใดเพิ่มโอกาสถูกรางวัล</p>
      </div>
      <Randomizer />
    </div>
  );
}
