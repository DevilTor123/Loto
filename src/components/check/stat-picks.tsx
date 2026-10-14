"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Dices, Flame, Snowflake, Sparkles } from "lucide-react";
import type { HotCold, PickItem } from "@/lib/stats/picks";
import { formatThaiDate } from "@/lib/thai-date";
import { fmtPct } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { NumberDisplay } from "../number-display";
import { Spinner } from "../states";

interface PicksResp {
  totalDraws: number;
  first: { number: string; digits: { digit: number; pct: number }[] } | null;
  firstSuffix2: HotCold;
  last2: HotCold;
  front3: HotCold;
  last3: HotCold;
}

/** เลขน่าจับตาตามสถิติในอดีต — แสดงพร้อมคำเตือนว่าไม่ใช่การทำนาย */
export function StatPicks({ onPick }: { onPick: (n: string) => void }) {
  const [data, setData] = useState<PicksResp | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/picks")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
  }, []);

  // เลขท้าย 2 ตัว: ใช้รางวัลเลขท้าย 2 ตัวจริงถ้ามี ไม่งั้นใช้ 2 ตัวท้ายของรางวัลที่ 1
  const two = data && (data.last2.sampleSize > 0 ? { label: "เลขท้าย 2 ตัว", hc: data.last2 } : { label: "2 ตัวท้ายของรางวัลที่ 1", hc: data.firstSuffix2 });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" aria-hidden /> เลขน่าจับตาตามสถิติ
        </CardTitle>
        <CardDescription>
          สรุปจากผลที่ออกไปแล้ว{data ? ` ${data.totalDraws.toLocaleString("th-TH")} งวด` : ""} ·{" "}
          <strong className="text-warning">ไม่ใช่การทำนาย ทุกเลขยังมีโอกาสออกเท่ากัน</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && <p className="text-sm text-muted">โหลดสถิติไม่สำเร็จ</p>}
        {!data && !error && <Spinner label="กำลังคำนวณ…" />}
        {data && data.totalDraws === 0 && <p className="text-sm text-muted">ยังไม่มีข้อมูลผลรางวัล กด “อัปเดตข้อมูล” ที่หน้าซิงก์ก่อน</p>}
        {data && data.totalDraws > 0 && (
          <>
            {data.first && (
              <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-text">รางวัลที่ 1: รวมหลักที่ออกบ่อยที่สุดของแต่ละตำแหน่ง</p>
                  <p className="text-xs text-muted">
                    {data.first.digits.map((d, i) => `หลัก ${i + 1}: ${d.digit} (${fmtPct(d.pct, 1)})`).join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onPick(data.first!.number)}
                  className="shrink-0 self-start rounded-xl transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-primary sm:self-auto"
                  title="ตรวจเลขนี้"
                >
                  <NumberDisplay value={data.first.number} size="sm" />
                </button>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-3">
              {two && <PickGroup label={two.label} hc={two.hc} />}
              <PickGroup label="เลขหน้า 3 ตัว" hc={data.front3} />
              <PickGroup label="เลขท้าย 3 ตัว" hc={data.last3} />
            </div>
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
              “ออกบ่อย” กับ “ไม่ออกนาน” เป็นแค่สิ่งที่เกิดขึ้นในอดีต เลขที่ไม่ออกนานไม่ได้ “ถึงคิว” และเลขที่ออกบ่อยก็ไม่ได้ “มาแรง”
              <Link href="/random" className="inline-flex items-center gap-1 text-primary hover:underline">
                <Dices className="size-3.5" aria-hidden /> หรือลองสุ่มเลข
              </Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PickGroup({ label, hc }: { label: string; hc: HotCold }) {
  if (hc.sampleSize === 0)
    return (
      <div className="rounded-xl border border-border p-3 text-sm">
        <p className="font-medium">{label}</p>
        <p className="mt-1 text-muted">ยังไม่มีข้อมูลรางวัลประเภทนี้</p>
      </div>
    );
  return (
    <div className="min-w-0 space-y-3 rounded-xl border border-border p-3 text-sm">
      <p className="font-medium">
        {label} <span className="text-xs font-normal text-muted">({hc.sampleSize.toLocaleString("th-TH")} งวด)</span>
      </p>
      <PickList icon={<Flame className="size-3.5 text-warning" aria-hidden />} title="ออกบ่อยที่สุด" items={hc.frequent} kind="hot" />
      <PickList icon={<Snowflake className="size-3.5 text-[#1F96B8]" aria-hidden />} title="ไม่ออกนานที่สุด" items={hc.absent} kind="cold" />
      {hc.neverSeen > 0 && <p className="text-xs text-muted">ยังไม่เคยออกเลย {hc.neverSeen.toLocaleString("th-TH")} เลข</p>}
    </div>
  );
}

function PickList({ icon, title, items, kind }: { icon: React.ReactNode; title: string; items: PickItem[]; kind: "hot" | "cold" }) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1 text-xs text-muted">{icon} {title}</p>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <li key={it.value}>
            <Badge
              variant={kind === "hot" ? "warning" : "muted"}
              className="num text-sm"
              title={it.lastSeen ? `ออกล่าสุด ${formatThaiDate(it.lastSeen, true)}` : undefined}
            >
              {it.value}
              <span className="text-[10px] opacity-80">{kind === "hot" ? `×${it.count}` : `${it.drawsSince} งวด`}</span>
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
