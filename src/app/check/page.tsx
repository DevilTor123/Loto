import type { Metadata } from "next";
import { Suspense } from "react";
import { NumberChecker } from "@/components/check/number-checker";
import { Spinner } from "@/components/states";

export const metadata: Metadata = {
  title: "ตรวจเลข",
  description: "ตรวจเลข 6 หลัก เลขท้าย 2 ตัว เลขท้าย 3 ตัว และเลขหน้า 3 ตัว ดูโอกาสเป็นเปอร์เซ็นต์ และจำนวนครั้งที่เคยออก",
};

export default function CheckPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-wide md:text-3xl">ตรวจเลข</h1>
        <p className="text-sm text-muted">ตรวจเลข 6 หลัก ท้าย 2 ตัว ท้าย 3 ตัว หรือหน้า 3 ตัว ดูโอกาสเป็น % และจำนวนครั้งที่เคยออก</p>
      </div>
      <Suspense fallback={<Spinner label="กำลังโหลด…" />}>
        <NumberChecker />
      </Suspense>
    </div>
  );
}
