import type { Metadata } from "next";
import { SyncLogList } from "@/components/sync/sync-log";

export const metadata: Metadata = { title: "ประวัติการซิงก์", robots: { index: false } };

export default function SyncPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-wide md:text-3xl">ประวัติการซิงก์ข้อมูล</h1>
        <p className="text-sm text-muted">ตรวจสอบได้ว่าระบบติดต่อแหล่งข้อมูลใดเมื่อใด และเพิ่ม แก้ไข ยืนยัน หรือพบข้อมูลขัดแย้งในงวดใดบ้าง</p>
      </div>
      <SyncLogList />
    </div>
  );
}
