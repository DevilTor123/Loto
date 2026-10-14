"use client";
import { useState } from "react";
import type { StatsResult } from "@/lib/stats";
import { useStats, type StatsFilter } from "@/hooks/use-stats";
import { POSITION_NAMES } from "@/lib/number";
import { formatThaiDate } from "@/lib/thai-date";
import { FREQ_NOTE } from "@/lib/copy";
import { fmtPct } from "@/lib/utils";
import { WindowFilter } from "../window-filter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Caption, Table, TBody, TD, TH, THead, TR } from "../ui/table";
import { Select, Label } from "../ui/input";
import { SimpleBar } from "../charts/simple-bar";
import { TrendLine } from "../charts/trend-line";
import { GroupedBar } from "../charts/grouped-bar";
import { EmptyState, ErrorState } from "../states";
import { Skeleton } from "../ui/skeleton";

function N({ n }: { n: number }) {
  return <span className="num text-text">{n.toLocaleString("th-TH")}</span>;
}

function ChartCard({ title, description, children, className }: { title: string; description: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function StatisticsView({ initial }: { initial: StatsResult }) {
  const [filter, setFilter] = useState<StatsFilter>({ window: "all" });
  const [trendDigit, setTrendDigit] = useState(0);
  const { data, loading, error, reload } = useStats(filter, initial);

  if (initial.totalDraws === 0) {
    return <EmptyState title="ยังไม่มีข้อมูลสำหรับคำนวณสถิติ" description="เมื่อระบบซิงก์ผลรางวัลจริงได้แล้ว กราฟทั้งหมดจะแสดงที่นี่" />;
  }

  return (
    <div className="space-y-6">
      <WindowFilter value={filter} onChange={setFilter} sampleSize={data?.sampleSize} range={data ? { from: data.from, to: data.to } : undefined} />
      <p className="text-sm text-muted">{FREQ_NOTE} · กราฟทุกกราฟใช้เฉพาะรางวัลที่ 1 ของงวดที่ข้อมูลสมบูรณ์</p>
      {error && <ErrorState message={`โหลดสถิติไม่สำเร็จ: ${error}`} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-96 rounded-2xl" />}
      {data && data.sampleSize === 0 && <EmptyState title="ไม่มีงวดในช่วงที่เลือก" />}
      {data && data.sampleSize > 0 && (
        <div className={`grid gap-6 lg:grid-cols-2 ${loading ? "opacity-50" : ""}`} aria-busy={loading}>
          {/* 1. แนวโน้มตามปี */}
          <ChartCard
            className="lg:col-span-2"
            title="แนวโน้มความถี่ตามช่วงเวลา (รายปี)"
            description={
              <>
                สัดส่วนที่เลข {trendDigit} ปรากฏในรางวัลที่ 1 (รวมทุกตำแหน่ง) ในแต่ละปี · ฐานการคำนวณ = จำนวนงวดในปีนั้น × 6 หลัก · เส้นประ = 10%
                ซึ่งเป็นค่าที่คาดหวังหากสุ่มเท่ากัน · ใช้ <N n={data.sampleSize} /> งวด
              </>
            }
          >
            <div className="mb-3 flex items-end gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="trend-digit">เลือกเลข</Label>
                <Select id="trend-digit" value={trendDigit} onChange={(e) => setTrendDigit(Number(e.target.value))} className="w-28">
                  {Array.from({ length: 10 }, (_, d) => (
                    <option key={d} value={d}>เลข {d}</option>
                  ))}
                </Select>
              </div>
            </div>
            <TrendLine
              ariaLabel={`กราฟเส้นสัดส่วนเลข ${trendDigit} รายปี`}
              seriesName={`สัดส่วนเลข ${trendDigit}`}
              reference={{ value: 10, label: "10% (สุ่มเท่ากัน)" }}
              data={data.yearly.map((y) => ({ label: String(y.yearBE), value: y.digitPct[trendDigit], n: y.sampleSize }))}
            />
            <Table>
              <THead>
                <TR>
                  <TH>ปี (พ.ศ.)</TH>
                  <TH className="text-right">จำนวนงวด</TH>
                  <TH className="text-right">ผลรวมเฉลี่ย</TH>
                  <TH className="text-right">สัดส่วนหลักคี่</TH>
                  <TH>เลขที่พบมากสุด (ทุกตำแหน่ง)</TH>
                </TR>
              </THead>
              <TBody>
                {data.yearly.map((y) => (
                  <TR key={y.year}>
                    <TD className="num">{y.yearBE}</TD>
                    <TD className="num text-right">{y.sampleSize}</TD>
                    <TD className="num text-right">{y.meanSum.toFixed(2)}</TD>
                    <TD className="num text-right">{fmtPct(y.oddDigitPct, 1)}</TD>
                    <TD className="num">{y.most.digits.join(", ")} <span className="text-xs text-muted">({y.most.count} ครั้ง)</span></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </ChartCard>

          {/* 2. เลข 0–9 แยกตามหลัก (small multiples) */}
          <ChartCard
            className="lg:col-span-2"
            title="ความถี่ตัวเลข 0–9 แยกตามหลัก"
            description={<>จำนวนครั้งที่พบเลขแต่ละตัวในแต่ละตำแหน่ง · ใช้ <N n={data.sampleSize} /> งวด · แท่งเข้ม = มากที่สุด (รวมกรณีเสมอ)</>}
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.positions.map((p) => (
                <div key={p.position} className="rounded-xl border border-border bg-bg/40 p-3">
                  <p className="mb-1 text-sm text-text">{POSITION_NAMES[p.position]}</p>
                  <SimpleBar
                    height={170}
                    ariaLabel={`ความถี่เลข 0–9 ${POSITION_NAMES[p.position]}`}
                    legendLabel={`${POSITION_NAMES[p.position]} (n=${p.sampleSize})`}
                    data={p.digits.map((d) => ({ label: String(d.digit), value: d.count, pct: d.pct, highlight: p.most.digits.includes(d.digit) }))}
                  />
                </div>
              ))}
            </div>
          </ChartCard>

          {/* 3. ผลรวม */}
          <ChartCard
            title="การกระจายผลรวมของตัวเลข 6 หลัก"
            description={
              <>
                ผลรวมเป็นไปได้ 0–54 · เฉลี่ย <span className="num text-text">{data.digitSum.mean.toFixed(2)}</span> · มัธยฐาน{" "}
                <span className="num text-text">{data.digitSum.median}</span> · ส่วนเบี่ยงเบน{" "}
                <span className="num text-text">{data.digitSum.stdev.toFixed(2)}</span> · ใช้ <N n={data.sampleSize} /> งวด
                (หากสุ่มเท่ากัน ค่าเฉลี่ยทางทฤษฎีคือ 27)
              </>
            }
          >
            <SimpleBar
              ariaLabel="กราฟการกระจายผลรวมตัวเลข"
              legendLabel="จำนวนงวดตามผลรวม"
              valueLabel="จำนวนงวด"
              data={data.digitSum.buckets.slice(Math.max(0, data.digitSum.min - 2), data.digitSum.max + 3).map((b) => ({ label: String(b.key), value: b.count, pct: b.pct }))}
            />
          </ChartCard>

          {/* 4. คู่/คี่ */}
          <ChartCard
            title="การกระจายเลขคู่และเลขคี่"
            description={
              <>
                จำนวนหลักที่เป็นเลขคี่ในแต่ละหมายเลข · หลักคี่รวม <span className="num text-text">{fmtPct(data.oddEven.oddDigitPct, 1)}</span> /
                หลักคู่ <span className="num text-text">{fmtPct(data.oddEven.evenDigitPct, 1)}</span> · ใช้ <N n={data.sampleSize} /> งวด
              </>
            }
          >
            <SimpleBar
              ariaLabel="กราฟการกระจายเลขคู่เลขคี่"
              legendLabel="จำนวนงวด"
              valueLabel="จำนวนงวด"
              data={data.oddEven.buckets.map((b) => ({ label: `คี่${b.key}:คู่${6 - b.key}`, value: b.count, pct: b.pct }))}
            />
          </ChartCard>

          {/* 5. หมายเลขที่ปรากฏซ้ำ */}
          <ChartCard
            title="หมายเลขที่ปรากฏซ้ำในประวัติ"
            description={<>รางวัลที่ 1 ที่ออกมากกว่า 1 ครั้งในช่วงที่เลือก (จาก <N n={data.sampleSize} /> งวด)</>}
          >
            {data.frequency.repeated.length === 0 ? (
              <p className="rounded-lg border border-border bg-surface-2/60 p-4 text-sm text-muted">
                ไม่มีหมายเลขรางวัลที่ 1 ใดออกซ้ำในช่วงนี้ — ผลตามจริงของข้อมูล (มีหมายเลขที่เป็นไปได้ 1,000,000 หมายเลข การซ้ำจึงเกิดได้ยากมาก)
              </p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>หมายเลข</TH>
                    <TH className="text-right">จำนวนครั้ง</TH>
                    <TH>วันที่ออก</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.frequency.repeated.map((r) => (
                    <TR key={r.number}>
                      <TD className="num font-semibold text-primary">{r.number}</TD>
                      <TD className="num text-right">{r.count}</TD>
                      <TD className="text-xs text-muted">{r.dates.map((d) => formatThaiDate(d, true)).join(" · ")}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
            <div className="mt-4">
              <p className="mb-2 text-sm text-text">รูปแบบเลขซ้ำภายในหมายเลข</p>
              <SimpleBar
                height={200}
                ariaLabel="กราฟรูปแบบเลขซ้ำภายในหมายเลข"
                legendLabel="จำนวนงวด"
                valueLabel="จำนวนงวด"
                data={data.repeats.distinct.map((b) => ({ label: `${b.key} ตัวไม่ซ้ำ`, value: b.count, pct: b.pct }))}
              />
              <p className="text-xs text-muted">
                หมายเลขที่มีเลขซ้ำอย่างน้อย 1 ตัว: <span className="num text-text">{fmtPct(data.repeats.withRepeatPct, 1)}</span> (ทางทฤษฎีหากสุ่มเท่ากัน ≈ 84.88%)
              </p>
            </div>
          </ChartCard>

          {/* 6. คู่เลขร่วม */}
          <ChartCard
            title="คู่เลขที่ปรากฏร่วมกัน"
            description={<>คู่ตัวเลข (ไม่สนลำดับ) ที่อยู่ในรางวัลที่ 1 หมายเลขเดียวกัน นับ 1 ครั้งต่อหมายเลข · ใช้ <N n={data.sampleSize} /> งวด</>}
          >
            <Table>
              <THead>
                <TR>
                  <TH>คู่เลข</TH>
                  <TH className="text-right">จำนวนงวด</TH>
                  <TH className="text-right">สัดส่วน</TH>
                </TR>
              </THead>
              <TBody>
                {data.pairs.top.slice(0, 8).map((p) => (
                  <TR key={p.key}>
                    <TD className="num text-primary">{p.key}</TD>
                    <TD className="num text-right">{p.count}</TD>
                    <TD className="num text-right">{fmtPct(p.pct, 1)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <p className="mb-2 mt-4 text-sm text-text">2 หลักท้ายของรางวัลที่ 1 ที่พบบ่อย</p>
            <p className="mb-2 text-xs text-muted">(คำนวณจากรางวัลที่ 1 เท่านั้น ไม่ใช่รางวัลเลขท้าย 2 ตัว)</p>
            <div className="flex flex-wrap gap-2">
              {data.suffix2.top.map((s) => (
                <span key={s.key} className="rounded-lg border border-border bg-bg/50 px-2.5 py-1 text-sm">
                  <span className="num text-primary">{s.key}</span> <span className="text-xs text-muted">×{s.count}</span>
                </span>
              ))}
            </div>
          </ChartCard>

          {/* 7. เปรียบเทียบช่วง */}
          <ChartCard
            className="lg:col-span-2"
            title="เปรียบเทียบ 10, 30, 50 และ 100 งวดล่าสุด"
            description="สัดส่วนของเลข 0–9 (รวมทุกตำแหน่ง) ในแต่ละช่วง — ช่วงสั้นมีตัวอย่างน้อย จึงแกว่งได้มากโดยธรรมชาติ (ไม่ขึ้นกับตัวกรองด้านบน)"
          >
            <GroupedBar
              ariaLabel="กราฟเปรียบเทียบสัดส่วนเลข 0–9 ระหว่าง 10, 30, 50 และ 100 งวดล่าสุด"
              series={data.compare.map((c) => ({ key: `w${c.size}`, name: `${c.size} งวด (n=${c.sampleSize})` }))}
              data={Array.from({ length: 10 }, (_, d) => ({
                label: String(d),
                ...Object.fromEntries(data.compare.map((c) => [`w${c.size}`, c.digitPct[d]])),
              }))}
            />
            <Table>
              <THead>
                <TR>
                  <TH>ช่วง</TH>
                  <TH className="text-right">ตัวอย่าง</TH>
                  <TH className="text-right">ผลรวมเฉลี่ย</TH>
                  <TH className="text-right">หลักคี่</TH>
                  <TH className="text-right">มีเลขซ้ำ</TH>
                  {POSITION_NAMES.map((p) => (
                    <TH key={p} className="hidden text-center md:table-cell">{p}</TH>
                  ))}
                </TR>
              </THead>
              <TBody>
                {data.compare.map((c) => (
                  <TR key={c.size}>
                    <TD>{c.size} งวดล่าสุด</TD>
                    <TD className="num text-right">{c.sampleSize}{!c.complete && <span className="text-xs text-warning"> (ไม่ครบ)</span>}</TD>
                    <TD className="num text-right">{c.meanSum.toFixed(2)}</TD>
                    <TD className="num text-right">{fmtPct(c.oddDigitPct, 1)}</TD>
                    <TD className="num text-right">{fmtPct(c.withRepeatPct, 1)}</TD>
                    {c.topDigitByPosition.map((t, i) => (
                      <TD key={i} className="num hidden text-center md:table-cell">
                        {t.digits.join(",")}
                      </TD>
                    ))}
                  </TR>
                ))}
              </TBody>
              <Caption>คอลัมน์ตำแหน่ง = เลขที่พบมากที่สุดในตำแหน่งนั้น (หลายตัว = เสมอกัน)</Caption>
            </Table>
          </ChartCard>

          {/* 8. คุณภาพข้อมูล */}
          <ChartCard
            className="lg:col-span-2"
            title="ความครบถ้วนของข้อมูล"
            description={<>งวดที่มีข้อมูลสมบูรณ์ทั้งหมด <N n={data.totalDraws} /> งวด (ไม่รวมงวดที่รอตรวจสอบ)</>}
          >
            {data.gaps.length === 0 ? (
              <p className="text-sm text-success">ไม่พบช่วงห่างระหว่างงวดที่เกิน 20 วัน</p>
            ) : (
              <ul className="space-y-1 text-sm text-warning">
                {data.gaps.map((g) => (
                  <li key={g.after}>
                    ช่วง {formatThaiDate(g.after)} → {formatThaiDate(g.before)} ห่างกัน {Math.round(g.days)} วัน — อาจมีงวดที่ขาดหาย
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>
        </div>
      )}
    </div>
  );
}
