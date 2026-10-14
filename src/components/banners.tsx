"use client";
import { useEffect, useState } from "react";
import { FlaskConical, WifiOff } from "lucide-react";

export function DemoBanner() {
  return (
    <div role="alert" className="border-b border-warning/40 bg-warning/10">
      <div className="mx-auto flex max-w-7xl items-start gap-2 px-4 py-2.5 text-sm text-warning">
        <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          <strong>โหมดสาธิต (DEMO)</strong> — ข้อมูลทั้งหมดบนหน้านี้สร้างขึ้นแบบสุ่มจากฐานข้อมูลสาธิตที่แยกไว้
          <strong> ไม่ใช่ผลสลากกินแบ่งรัฐบาลจริง</strong> ใช้เพื่อทดสอบการแสดงผลเท่านั้น
        </p>
      </div>
    </div>
  );
}

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="border-b border-danger/40 bg-danger/10">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-sm text-danger">
        <WifiOff className="size-4" aria-hidden /> คุณออฟไลน์อยู่ — ข้อมูลที่เห็นอาจไม่ใช่ข้อมูลล่าสุด และการอัปเดตจะทำงานเมื่อกลับมาออนไลน์
      </div>
    </div>
  );
}
