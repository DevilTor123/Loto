"use client";
import { Info } from "lucide-react";
import type { StatsResult } from "@/lib/stats";
import { formatThaiDate } from "@/lib/thai-date";
import { FREQ_NOTE } from "@/lib/copy";
import { fmtPct } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Caption, Table, TBody, TD, TH, THead, TR } from "../ui/table";
import { EmptyState } from "../states";

export function FrequentNumbers({ stats, limit = 15 }: { stats: StatsResult; limit?: number }) {
  const f = stats.frequency;
  const rows = f.items.slice(0, limit);
  return (
    <Card>
      <CardHeader>
        <CardTitle>เลขรางวัลที่ 1 ที่ออกบ่อยที่สุด</CardTitle>
        <CardDescription>{FREQ_NOTE}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {f.sampleSize === 0 ? (
          <EmptyState title="ไม่มีข้อมูลในช่วงที่เลือก" />
        ) : (
          <>
            {!f.hasRepeats && (
              <p className="flex gap-2 rounded-lg border border-border bg-surface-2/60 p-3 text-sm text-muted">
                <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                ในช่วง {f.sampleSize.toLocaleString("th-TH")} งวดนี้ ไม่มีหมายเลขใดออกซ้ำ — ทุกหมายเลขพบเพียง 1 ครั้ง
                จึงไม่มี “อันดับ” ที่มีความหมาย ตารางด้านล่างเรียงตามวันที่ออกล่าสุดแทน
              </p>
            )}
            {f.hasRepeats && (
              <p className="text-sm text-muted">
                พบหมายเลขที่ออกมากกว่า 1 ครั้ง {f.repeated.length.toLocaleString("th-TH")} หมายเลข จาก{" "}
                {f.uniqueNumbers.toLocaleString("th-TH")} หมายเลขที่ไม่ซ้ำกัน
              </p>
            )}
            <Table>
              <THead>
                <TR>
                  <TH className="w-10">#</TH>
                  <TH>หมายเลข</TH>
                  <TH className="text-right">จำนวนครั้งที่พบ</TH>
                  <TH className="text-right">ความถี่ที่พบในอดีต</TH>
                  <TH>งวดล่าสุดที่ปรากฏ</TH>
                  <TH className="text-right">ผ่านมาแล้ว (งวด)</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r, i) => (
                  <TR key={r.number}>
                    <TD className="text-muted">{f.hasRepeats ? i + 1 : "–"}</TD>
                    <TD className="num text-lg font-semibold text-primary">{r.number}</TD>
                    <TD className="num text-right">{r.count}</TD>
                    <TD className="num text-right">{fmtPct(r.pct)}</TD>
                    <TD className="whitespace-nowrap">{formatThaiDate(r.lastDate)}</TD>
                    <TD className="num text-right">{r.drawsSince}</TD>
                  </TR>
                ))}
              </TBody>
              <Caption>
                ความถี่ที่พบในอดีต = จำนวนครั้งที่พบ ÷ {f.sampleSize.toLocaleString("th-TH")} งวดในช่วงที่เลือก × 100 ·
                “ผ่านมาแล้ว” นับจากงวดล่าสุดในฐานข้อมูล (0 = งวดล่าสุด)
                {f.items.length > limit && ` · แสดง ${limit} จาก ${f.items.length} หมายเลข`}
              </Caption>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
