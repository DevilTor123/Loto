import type { Metadata } from "next";
import { getStats } from "@/lib/data";
import { StatisticsView } from "@/components/statistics/statistics-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "สถิติ",
  description: "กราฟสถิติรางวัลที่ 1 ย้อนหลัง: ความถี่ตัวเลขตามหลัก ผลรวม เลขคู่คี่ หมายเลขที่ซ้ำ และการเปรียบเทียบช่วงเวลา",
};

export default async function StatisticsPage() {
  const { stats } = await getStats("all");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-wide md:text-3xl">สถิติ</h1>
        <p className="text-sm text-muted">ทุกกราฟแสดงจำนวนตัวอย่างที่ใช้คำนวณ และเปลี่ยนตามตัวกรองช่วงข้อมูล</p>
      </div>
      <StatisticsView initial={stats} />
    </div>
  );
}
