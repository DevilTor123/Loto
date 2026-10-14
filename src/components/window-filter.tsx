"use client";
import { CalendarRange } from "lucide-react";
import type { StatsFilter } from "@/hooks/use-stats";
import { Input, Label } from "./ui/input";
import { cn } from "@/lib/utils";

const OPTIONS: { value: StatsFilter["window"]; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "10", label: "10 งวด" },
  { value: "30", label: "30 งวด" },
  { value: "50", label: "50 งวด" },
  { value: "100", label: "100 งวด" },
  { value: "custom", label: "เลือกช่วงวันที่" },
];

export function WindowFilter({
  value,
  onChange,
  sampleSize,
  range,
}: {
  value: StatsFilter;
  onChange: (f: StatsFilter) => void;
  sampleSize?: number;
  range?: { from: string | null; to: string | null };
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/70 p-3 md:flex-row md:items-end md:justify-between">
      <div role="radiogroup" aria-label="ช่วงข้อมูล" className="scrollbar-none flex gap-1 overflow-x-auto">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            role="radio"
            aria-checked={value.window === o.value}
            onClick={() => onChange({ ...value, window: o.value })}
            className={cn(
              "flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm transition-colors",
              value.window === o.value
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-transparent text-muted hover:bg-surface-2 hover:text-text",
            )}
          >
            {o.value === "custom" && <CalendarRange className="size-3.5" aria-hidden />}
            {o.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {value.window === "custom" && (
          <>
            <div className="flex flex-col gap-1">
              <Label htmlFor="wf-from">ตั้งแต่</Label>
              <Input id="wf-from" type="date" className="h-9 w-40" value={value.from ?? ""} onChange={(e) => onChange({ ...value, from: e.target.value || undefined })} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="wf-to">ถึง</Label>
              <Input id="wf-to" type="date" className="h-9 w-40" value={value.to ?? ""} onChange={(e) => onChange({ ...value, to: e.target.value || undefined })} />
            </div>
          </>
        )}
        {sampleSize !== undefined && (
          <p className="text-xs text-muted" aria-live="polite">
            ใช้คำนวณ <span className="num text-text">{sampleSize.toLocaleString("th-TH")}</span> งวด
            {range?.from && range.to && (
              <>
                {" "}({range.from} ถึง {range.to})
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
