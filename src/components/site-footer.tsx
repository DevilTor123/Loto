import { ShieldAlert } from "lucide-react";
import { DISCLAIMER } from "@/lib/copy";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/70">
      <div className="mx-auto max-w-7xl space-y-3 px-4 py-8 text-sm text-muted">
        <p className="flex gap-2">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>{DISCLAIMER}</span>
        </p>
        <p className="text-xs">
          ข้อมูลผลรางวัลจาก lottery.co.th และตรวจยืนยันกับสำนักงานสลากกินแบ่งรัฐบาล (glo.or.th) เมื่อเข้าถึงได้ ·
          เว็บไซต์ส่วนตัวเพื่อการศึกษาข้อมูล ไม่ได้ขายหรือชักชวนให้ซื้อสลาก
        </p>
      </div>
    </footer>
  );
}
