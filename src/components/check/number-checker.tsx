"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { History, Percent, Search, ShieldAlert } from "lucide-react";
import { normalizeDigits, POSITION_NAMES } from "@/lib/number";
import { anyPrizeProbability, formatProbability, prizeOdds } from "@/lib/odds";
import { formatThaiDate } from "@/lib/thai-date";
import { fmtPct } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Caption, Table, TBody, TD, TH, THead, TR } from "../ui/table";
import { NumberDisplay } from "../number-display";
import { ErrorState, Spinner } from "../states";
import { LotteryPlusButton } from "../external-search";

interface PrizeHist {
  value: string;
  drawsWithData: number;
  count: number;
  dates: string[];
}
interface CheckResp {
  number: string;
  totalDraws: number;
  firstPrize: { count: number; dates: string[] };
  last2: PrizeHist;
  front3: PrizeHist;
  last3: PrizeHist;
  positions: { digit: number; count: number; pct: number }[];
  profile: { oddCount: number; digitSum: number; repeatPattern: string; sameProfileCount: number };
}

const ODDS = prizeOdds();
const ANY = anyPrizeProbability();

function partOf(number: string, key: string) {
  if (key === "front3") return number.slice(0, 3);
  if (key === "last3") return number.slice(3);
  if (key === "last2") return number.slice(4);
  return number;
}

export function NumberChecker() {
  const router = useRouter();
  const sp = useSearchParams();
  const [input, setInput] = useState(sp.get("n") ?? "");
  const [data, setData] = useState<CheckResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const norm = normalizeDigits(input).slice(0, 6);

  const check = useCallback(
    async (n: string) => {
      setLoading(true);
      setError(null);
      router.replace(`/check?n=${n}`, { scroll: false });
      try {
        const res = await fetch(`/api/check?number=${n}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body?.issues?.join(", ") || body?.error || `HTTP ${res.status}`);
        setData(body);
      } catch (e) {
        setError(e instanceof Error ? e.message : "ตรวจไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    const n = normalizeDigits(sp.get("n") ?? "");
    if (n.length === 6) void check(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (norm.length === 6) void check(norm);
            }}
          >
            <div className="flex-1">
              <label htmlFor="chk" className="mb-1 block text-sm text-muted">กรอกเลข 6 หลัก (เลขไทยหรือเลขอารบิกก็ได้)</label>
              <Input
                id="chk"
                inputMode="numeric"
                autoComplete="off"
                placeholder="เช่น 123456"
                className="num h-14 text-center text-3xl tracking-[0.3em]"
                value={input}
                maxLength={12}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>
            <Button type="submit" size="lg" className="h-14" disabled={norm.length !== 6 || loading}>
              <Search aria-hidden /> ตรวจโอกาส
            </Button>
          </form>
          {input && norm.length !== 6 && <p className="mt-2 text-sm text-muted">ต้องมีตัวเลข 6 หลัก (ตอนนี้ {norm.length} หลัก)</p>}
        </CardContent>
      </Card>

      {loading && <Spinner label="กำลังตรวจ…" />}
      {error && <ErrorState message={error} onRetry={() => norm.length === 6 && check(norm)} />}

      {data && !loading && (
        <>
          <Card className="overflow-hidden">
            <div className="grid gap-0 md:grid-cols-[1fr_1.2fr]">
              <div className="flex flex-col items-center justify-center gap-3 border-b border-border p-6 md:border-b-0 md:border-r">
                <NumberDisplay value={data.number} size="lg" animate />
                <LotteryPlusButton number={data.number} />
              </div>
              <div className="space-y-2 p-6">
                <p className="flex items-center gap-1.5 text-sm text-muted">
                  <Percent className="size-4 text-primary" aria-hidden /> โอกาสถูกรางวัลที่ 1 ในงวดถัดไป
                </p>
                <p className="num text-5xl font-semibold text-primary">0.0001%</p>
                <p className="text-sm text-text">หรือ 1 ใน 1,000,000</p>
                <p className="text-sm text-muted">
                  โอกาสถูกรางวัลใดรางวัลหนึ่ง (รวมเลขหน้า/ท้าย) ≈ <span className="num text-text">{formatProbability(ANY)}</span>
                </p>
                <p className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-text">
                  ทุกหมายเลข 6 หลักได้ตัวเลขนี้<strong>เท่ากันหมด</strong> ไม่ว่าเคยออกบ่อย เคยออกน้อย หรือไม่เคยออกเลย
                  ถ้าเว็บไหนบอกว่าเลขหนึ่งมีโอกาสออกมากกว่าเลขอื่น ตัวเลขนั้นไม่มีหลักคณิตศาสตร์รองรับ
                </p>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">โอกาสถูกรางวัลแต่ละประเภท (ต่อ 1 งวด)</CardTitle>
                <CardDescription>คำนวณจากจำนวนรางวัลของสลากกินแบ่งรัฐบาล โดยสมมติว่าการออกรางวัลสุ่มอย่างยุติธรรม</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <THead>
                    <TR>
                      <TH>รางวัล</TH>
                      <TH className="hidden sm:table-cell">เลขที่ใช้ตรวจ</TH>
                      <TH className="text-right">โอกาส</TH>
                      <TH className="hidden text-right sm:table-cell">1 ใน</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {ODDS.map((o) => (
                      <TR key={o.key}>
                        <TD>{o.label}{o.draws > 1 && <span className="text-xs text-muted"> ({o.draws} รางวัล)</span>}<span className="num block text-xs text-primary sm:hidden">{partOf(data.number, o.key)}</span></TD>
                        <TD className="num hidden text-primary sm:table-cell">{partOf(data.number, o.key)}</TD>
                        <TD className="num whitespace-nowrap text-right">{formatProbability(o.probability)}<span className="block text-[11px] text-muted sm:hidden">1 ใน {Math.round(o.oneIn).toLocaleString("th-TH")}</span></TD>
                        <TD className="num hidden text-right sm:table-cell">{Math.round(o.oneIn).toLocaleString("th-TH")}</TD>
                      </TR>
                    ))}
                  </TBody>
                  <Caption>เลขหน้า/ท้าย 3 ตัวออก 2 ชุดต่องวด จึงมีโอกาสราว 2 ใน 1,000 · รางวัลที่ 1–5 และข้างเคียงต้องตรงครบ 6 หลัก</Caption>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="size-4 text-primary" aria-hidden /> ประวัติของเลขนี้ในอดีต
                </CardTitle>
                <CardDescription>
                  จากข้อมูล {data.totalDraws.toLocaleString("th-TH")} งวดในฐานข้อมูล — <strong className="text-warning">เป็นสิ่งที่เกิดขึ้นแล้ว ไม่ใช่โอกาสในอนาคต</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {data.totalDraws === 0 ? (
                  <p className="text-muted">ยังไม่มีข้อมูลผลรางวัลในฐานข้อมูล</p>
                ) : (
                  <>
                    <ul className="space-y-2">
                      <HistLine label="เคยเป็นรางวัลที่ 1" value={data.number} count={data.firstPrize.count} of={data.totalDraws} dates={data.firstPrize.dates} />
                      {(["last2", "front3", "last3"] as const).map((k) => {
                        const h = data[k];
                        const label = k === "last2" ? "เลขท้าย 2 ตัว" : k === "front3" ? "เลขหน้า 3 ตัว" : "เลขท้าย 3 ตัว";
                        return h.drawsWithData === 0 ? (
                          <li key={k} className="text-muted">{label} {h.value}: ยังไม่มีข้อมูลรางวัลประเภทนี้</li>
                        ) : (
                          <HistLine key={k} label={`เคยออก${label}`} value={h.value} count={h.count} of={h.drawsWithData} dates={h.dates} />
                        );
                      })}
                    </ul>
                    <div>
                      <p className="mb-1 text-muted">เลขแต่ละหลักเคยอยู่ในตำแหน่งนั้นของรางวัลที่ 1 บ่อยแค่ไหน (ค่ากลาง = 10%)</p>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                        {data.positions.map((p, i) => (
                          <div key={i} className="rounded-lg border border-border bg-bg/40 p-2 text-center">
                            <p className="text-[11px] text-muted">{POSITION_NAMES[i]}</p>
                            <p className="num text-lg text-primary">{p.digit}</p>
                            <p className="num text-xs">{fmtPct(p.pct, 1)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-muted">
                      ลักษณะ: เลขคี่ {data.profile.oddCount} หลัก · ผลรวม {data.profile.digitSum} · รูปแบบเลขซ้ำ {data.profile.repeatPattern} — รางวัลที่ 1 ในอดีตที่มีจำนวนเลขคี่และรูปแบบเลขซ้ำแบบเดียวกัน{" "}
                      {data.profile.sameProfileCount.toLocaleString("th-TH")} งวด ({fmtPct((data.profile.sameProfileCount / data.totalDraws) * 100, 1)})
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="flex gap-3 p-5 text-sm text-muted">
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <p>
                ทำไมประวัติไม่เปลี่ยนโอกาส: แต่ละงวดสุ่มใหม่ทั้งหมด ลูกบอลไม่ได้ “จำ” ว่าเคยออกอะไร เลขที่ไม่เคยออกจึงไม่ได้ “ถึงคิว” และเลขที่เคยออกก็ไม่ได้ “ติดมือ”
                ความแตกต่างของสัดส่วนในประวัติด้านบนเกิดจากความบังเอิญของข้อมูลจำนวนไม่กี่ร้อยงวดตามปกติ
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function HistLine({ label, value, count, of, dates }: { label: string; value: string; count: number; of: number; dates: string[] }) {
  return (
    <li>
      <span className="text-text">{label} </span>
      <span className="num text-primary">{value}</span>
      {": "}
      <strong className="text-text">{count}</strong> ครั้ง จาก {of.toLocaleString("th-TH")} งวด
      {count > 0 && <span className="text-xs text-muted"> · ล่าสุด {dates.slice(0, 3).map((d) => formatThaiDate(d, true)).join(", ")}</span>}
    </li>
  );
}
