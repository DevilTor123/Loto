"use client";
import { useState } from "react";
import type { StatsResult } from "@/lib/stats";
import { useStats, type StatsFilter } from "@/hooks/use-stats";
import { WindowFilter } from "../window-filter";
import { ErrorState } from "../states";
import { Skeleton } from "../ui/skeleton";
import { FrequentNumbers } from "./frequent-numbers";
import { PositionDigits } from "./position-digits";

export function DashboardAnalytics({ initial }: { initial: StatsResult }) {
  const [filter, setFilter] = useState<StatsFilter>({ window: "all" });
  const { data, loading, error, reload } = useStats(filter, initial);
  return (
    <section aria-labelledby="analytics-h" className="space-y-4">
      <h2 id="analytics-h" className="sr-only">การวิเคราะห์ตามช่วงข้อมูล</h2>
      <WindowFilter value={filter} onChange={setFilter} sampleSize={data?.sampleSize} range={data ? { from: data.from, to: data.to } : undefined} />
      {filter.window === "custom" && !filter.from && !filter.to && (
        <p className="text-sm text-muted">เลือกวันที่เริ่มต้นหรือสิ้นสุดเพื่อคำนวณ</p>
      )}
      {error && <ErrorState message={`โหลดสถิติไม่สำเร็จ: ${error}`} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-96 rounded-2xl" />}
      {data && (
        <div className={`grid gap-6 transition-opacity xl:grid-cols-2 ${loading ? "opacity-50" : ""}`} aria-busy={loading}>
          <FrequentNumbers stats={data} />
          <PositionDigits positions={data.positions} />
        </div>
      )}
    </section>
  );
}
