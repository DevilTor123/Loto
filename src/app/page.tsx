import Link from "next/link";
import { Dices } from "lucide-react";
import { getStats, getStatus } from "@/lib/data";
import { StatusPanel } from "@/components/dashboard/status-panel";
import { DashboardAnalytics } from "@/components/dashboard/analytics";
import { LongestAbsent } from "@/components/dashboard/longest-absent";
import { EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [status, { stats }] = await Promise.all([getStatus(), getStats("all")]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-wide md:text-3xl">แดชบอร์ด</h1>
        <p className="text-sm text-muted">สถิติรางวัลที่ 1 สลากกินแบ่งรัฐบาลจากข้อมูลที่บันทึกจริง</p>
      </div>
      <StatusPanel status={status} />

      {stats.totalDraws === 0 ? (
        <EmptyState
          title="ยังไม่มีข้อมูลผลรางวัลในฐานข้อมูล"
          description="กด “อัปเดตข้อมูล” เพื่อดึงผลย้อนหลังจากแหล่งข้อมูล หรือรันคำสั่ง npm run sync:backfill บนเซิร์ฟเวอร์ ระบบจะไม่แสดงตัวเลขใด ๆ จนกว่าจะได้ข้อมูลจริง"
        />
      ) : (
        <>
          {stats.gaps.length > 0 && (
            <p className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
              พบช่วงข้อมูลที่อาจขาดหาย {stats.gaps.length} ช่วง (ห่างกันเกิน 20 วัน) — ดูรายละเอียดในหน้าสถิติ
            </p>
          )}
          <DashboardAnalytics initial={stats} />
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <LongestAbsent items={stats.longestAbsent.slice(0, 10)} total={stats.totalDraws} />
            <Card className="flex flex-col justify-between bg-gradient-to-br from-surface to-[#1a1610]">
              <CardContent className="space-y-3 p-6">
                <Dices className="size-8 text-primary" aria-hidden />
                <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">สุ่มเลข 6 หลัก</h2>
                <p className="text-sm text-muted">
                  สุ่มด้วย crypto.getRandomValues พร้อม 3 โหมด: สุ่มเท่ากันทุกหมายเลข, ตามลักษณะที่พบในอดีต และทดลองปรับน้ำหนักความถี่
                  — ทุกโหมดมีโอกาสถูกรางวัลเท่ากัน
                </p>
                <Button asChild>
                  <Link href="/random">ไปที่หน้าสุ่มเลข</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
