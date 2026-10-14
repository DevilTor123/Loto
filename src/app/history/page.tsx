import type { Metadata } from "next";
import { Suspense } from "react";
import { HistoryTable } from "@/components/history/history-table";
import { LoadingRows } from "@/components/states";

export const metadata: Metadata = {
  title: "ประวัติผลรางวัลที่ 1",
  description: "ค้นหาประวัติผลรางวัลที่ 1 สลากกินแบ่งรัฐบาล ตามหมายเลข ปี หรือช่วงวันที่ พร้อมลิงก์แหล่งข้อมูลต้นฉบับ",
};

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-wide md:text-3xl">ประวัติผลรางวัลที่ 1</h1>
        <p className="text-sm text-muted">ค้นหาว่าหมายเลขใดเคยออกเมื่อใด — พิมพ์ได้ทั้งเลขไทยและเลขอารบิก</p>
      </div>
      <Suspense fallback={<LoadingRows rows={8} />}>
        <HistoryTable />
      </Suspense>
    </div>
  );
}
