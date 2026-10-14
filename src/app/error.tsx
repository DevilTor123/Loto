"use client";
import { ErrorState } from "@/components/states";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl py-16">
      <ErrorState
        message={`โหลดหน้านี้ไม่สำเร็จ — อาจเชื่อมต่อฐานข้อมูลไม่ได้ (${error.digest ?? error.message})`}
        onRetry={reset}
      />
    </div>
  );
}
