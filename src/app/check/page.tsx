import type { Metadata } from "next";
import { Suspense } from "react";
import { NumberChecker } from "@/components/check/number-checker";
import { Spinner } from "@/components/states";

export const metadata: Metadata = {
  title: "ตรวจเลข",
  description: "กรอกเลข 6 หลักเพื่อดูโอกาสถูกรางวัลแต่ละประเภทเป็นเปอร์เซ็นต์ และประวัติของเลขนั้นในอดีต",
};

export default function CheckPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-wide md:text-3xl">ตรวจเลข</h1>
        <p className="text-sm text-muted">ดูโอกาสถูกรางวัลเป็น % และประวัติของเลขนั้นในอดีต</p>
      </div>
      <Suspense fallback={<Spinner label="กำลังโหลด…" />}>
        <NumberChecker />
      </Suspense>
    </div>
  );
}
