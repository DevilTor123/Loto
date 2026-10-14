"use client";
import type { PositionStats } from "@/lib/stats";
import { POSITION_NAMES } from "@/lib/number";
import { fmtPct } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Caption, Table, TBody, TD, TH, THead, TR } from "../ui/table";
import { SimpleBar } from "../charts/simple-bar";
import { EmptyState } from "../states";

function list(digits: number[]) {
  return digits.join(", ");
}

export function PositionDigits({ positions }: { positions: PositionStats[] }) {
  const n = positions[0]?.sampleSize ?? 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle>สถิติเลข 0–9 แยกตามตำแหน่ง</CardTitle>
        <CardDescription>
          นับจากรางวัลที่ 1 จำนวน <span className="num text-text">{n.toLocaleString("th-TH")}</span> งวด — ความถี่ที่พบในอดีต ไม่ใช่ความน่าจะเป็นของงวดถัดไป
        </CardDescription>
      </CardHeader>
      <CardContent>
        {n === 0 ? (
          <EmptyState title="ไม่มีข้อมูลในช่วงที่เลือก" />
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {positions.map((p) => (
                <div key={p.position} className="rounded-xl border border-border bg-bg/40 p-3">
                  <p className="text-xs text-muted">{POSITION_NAMES[p.position]}</p>
                  <p className="mt-1 text-sm">
                    มากสุด <span className="num font-semibold text-primary">{list(p.most.digits)}</span>
                    <span className="text-xs text-muted"> ({p.most.count} ครั้ง)</span>
                  </p>
                  <p className="text-sm">
                    น้อยสุด <span className="num font-semibold text-text">{list(p.least.digits)}</span>
                    <span className="text-xs text-muted"> ({p.least.count} ครั้ง)</span>
                  </p>
                  {(p.most.digits.length > 1 || p.least.digits.length > 1) && (
                    <p className="mt-1 text-[11px] text-warning">มีเลขที่จำนวนเท่ากัน (เสมอ)</p>
                  )}
                </div>
              ))}
            </div>
            <Tabs defaultValue="0">
              <TabsList aria-label="เลือกตำแหน่ง">
                {positions.map((p) => (
                  <TabsTrigger key={p.position} value={String(p.position)}>
                    {POSITION_NAMES[p.position]}
                  </TabsTrigger>
                ))}
              </TabsList>
              {positions.map((p) => (
                <TabsContent key={p.position} value={String(p.position)}>
                  <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                    <SimpleBar
                      ariaLabel={`กราฟความถี่เลข 0–9 ${POSITION_NAMES[p.position]}`}
                      data={p.digits.map((d) => ({
                        label: String(d.digit),
                        value: d.count,
                        pct: d.pct,
                        highlight: p.most.digits.includes(d.digit),
                      }))}
                      height={260}
                      xLabel="เลข"
                    />
                    <Table>
                      <THead>
                        <TR>
                          <TH>ตำแหน่ง</TH>
                          <TH>เลข</TH>
                          <TH className="text-right">จำนวนครั้ง</TH>
                          <TH className="text-right">สัดส่วนที่พบ</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {p.digits.map((d) => (
                          <TR key={d.digit}>
                            <TD className="whitespace-nowrap text-muted">{POSITION_NAMES[p.position]}</TD>
                            <TD className={`num font-semibold ${p.most.digits.includes(d.digit) ? "text-primary" : ""}`}>{d.digit}</TD>
                            <TD className="num text-right">{d.count}</TD>
                            <TD className="num text-right">{fmtPct(d.pct)}</TD>
                          </TR>
                        ))}
                      </TBody>
                      <Caption>จำนวนตัวอย่าง {p.sampleSize.toLocaleString("th-TH")} งวด · แท่งสีทองเข้ม = เลขที่พบมากที่สุด (รวมกรณีเสมอ)</Caption>
                    </Table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}
