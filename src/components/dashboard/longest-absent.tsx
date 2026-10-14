import { Hourglass } from "lucide-react";
import type { NumberFrequency } from "@/lib/stats";
import { formatThaiDate } from "@/lib/thai-date";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Caption, Table, TBody, TD, TH, THead, TR } from "../ui/table";
import { EmptyState } from "../states";

export function LongestAbsent({ items, total }: { items: NumberFrequency[]; total: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hourglass className="size-4 text-primary" aria-hidden /> เลขที่ไม่ออกมานาน
        </CardTitle>
        <CardDescription>
          หมายเลขที่เคยเป็นรางวัลที่ 1 แล้วไม่ปรากฏอีกนานที่สุด (จากประวัติทั้งหมด {total.toLocaleString("th-TH")} งวด)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
          “ไม่ออกมานาน” ไม่ได้แปลว่า “มีโอกาสออกมากขึ้น” — หากการออกรางวัลสุ่มอย่างยุติธรรม แต่ละงวดเป็นอิสระต่อกัน
          ทุกหมายเลขยังมีโอกาส 1 ใน 1,000,000 เท่าเดิม
        </p>
        {items.length === 0 ? (
          <EmptyState title="ยังไม่มีข้อมูล" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>หมายเลข</TH>
                <TH>ออกครั้งล่าสุด</TH>
                <TH className="text-right">ผ่านไปแล้ว (งวด)</TH>
                <TH className="text-right">พบทั้งหมด (ครั้ง)</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((r) => (
                <TR key={r.number}>
                  <TD className="num text-lg font-semibold text-primary">{r.number}</TD>
                  <TD className="whitespace-nowrap">{formatThaiDate(r.lastDate)}</TD>
                  <TD className="num text-right">{r.drawsSince.toLocaleString("th-TH")}</TD>
                  <TD className="num text-right">{r.totalCount}</TD>
                </TR>
              ))}
            </TBody>
            <Caption>เนื่องจากรางวัลที่ 1 แทบไม่ซ้ำกัน รายการนี้จึงมักเป็นหมายเลขจากงวดที่เก่าที่สุดในฐานข้อมูล</Caption>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
