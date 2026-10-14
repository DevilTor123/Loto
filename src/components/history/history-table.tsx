"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ChevronLeft, ChevronRight, CircleDashed, ExternalLink, Search, ShieldCheck, X } from "lucide-react";
import { normalizeDigits } from "@/lib/number";
import { formatThaiDate } from "@/lib/thai-date";
import { Card, CardContent } from "../ui/card";
import { Input, Label, Select } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Caption, Table, TBody, TD, TH, THead, TR } from "../ui/table";
import { EmptyState, ErrorState, LoadingRows } from "../states";
import { LotteryPlusButton } from "../external-search";

interface Item {
  id: number;
  drawDate: string;
  number: string;
  status: "VERIFIED" | "SOURCE_ONLY" | "CONFLICT";
  sourceName: string;
  sourceUrl: string;
  verifiedSource: string | null;
  conflictNumber: string | null;
  conflictSource: string | null;
  otherPrizes: { type: string; label: string; number: string }[];
}
interface Resp {
  total: number;
  page: number;
  pages: number;
  years: number[];
  items: Item[];
}

function Highlight({ value, q }: { value: string; q: string }) {
  if (!q || !value.includes(q)) return <>{value}</>;
  const i = value.indexOf(q);
  return (
    <>
      {value.slice(0, i)}
      <mark className="rounded bg-primary/25 px-0.5 text-primary-strong">{value.slice(i, i + q.length)}</mark>
      {value.slice(i + q.length)}
    </>
  );
}

function groupPrizes(prizes: Item["otherPrizes"]): [string, string[]][] {
  const acc = new Map<string, string[]>();
  for (const p of prizes) acc.set(p.label, [...(acc.get(p.label) ?? []), p.number]);
  return [...acc.entries()];
}

export function HistoryTable() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [year, setYear] = useState(sp.get("year") ?? "");
  const [from, setFrom] = useState(sp.get("from") ?? "");
  const [to, setTo] = useState(sp.get("to") ?? "");
  const [page, setPage] = useState(Number(sp.get("page") ?? 1) || 1);
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const normQ = normalizeDigits(q).slice(0, 6);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (normQ) qs.set("q", normQ);
    if (year) qs.set("year", year);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (page > 1) qs.set("page", String(page));
    router.replace(`/history${qs.size ? `?${qs}` : ""}`, { scroll: false });
    try {
      const res = await fetch(`/api/draws?${qs}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body?.issues?.join(", ") || body?.error || `HTTP ${res.status}`);
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [normQ, year, from, to, page, router]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const reset = () => {
    setQ("");
    setYear("");
    setFrom("");
    setTo("");
    setPage(1);
  };
  const exact = normQ.length === 6;

  return (
    <Card>
      <CardContent className="space-y-4 p-4 md:p-5">
        <form className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-end" onSubmit={(e) => e.preventDefault()} role="search">
          <div className="flex flex-col gap-1">
            <Label htmlFor="h-q">ค้นหาหมายเลข (ทั้งหมดหรือบางส่วน)</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <Input
                id="h-q"
                inputMode="numeric"
                placeholder="เช่น 004615 หรือ ๐๐๔๖๑๕"
                className="num pl-9"
                value={q}
                maxLength={12}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="h-year">ปี</Label>
            <Select id="h-year" value={year} onChange={(e) => { setYear(e.target.value); setPage(1); }}>
              <option value="">ทุกปี</option>
              {data?.years.map((y) => (
                <option key={y} value={y}>
                  {y + 543} ({y})
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="h-from">ตั้งแต่วันที่</Label>
            <Input id="h-from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="h-to">ถึงวันที่</Label>
            <Input id="h-to" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          </div>
          <Button type="button" variant="ghost" onClick={reset}>
            <X aria-hidden /> ล้าง
          </Button>
        </form>

        {exact && <LotteryPlusButton number={normQ} />}
        {data && normQ && (
          <p className="text-sm" aria-live="polite">
            {exact ? (
              data.total > 0 ? (
                <>
                  หมายเลข <span className="num font-semibold text-primary">{normQ}</span> เคยเป็นรางวัลที่ 1 จำนวน{" "}
                  <strong>{data.total}</strong> ครั้ง ในฐานข้อมูล
                </>
              ) : (
                <>
                  หมายเลข <span className="num font-semibold text-primary">{normQ}</span> ไม่เคยเป็นรางวัลที่ 1 ในข้อมูลที่บันทึกไว้
                </>
              )
            ) : (
              <>พบ {data.total.toLocaleString("th-TH")} งวดที่มี “{normQ}” อยู่ในรางวัลที่ 1</>
            )}
          </p>
        )}

        {error ? (
          <ErrorState message={`โหลดประวัติไม่สำเร็จ: ${error}`} onRetry={load} />
        ) : loading && !data ? (
          <LoadingRows rows={8} />
        ) : data && data.items.length === 0 ? (
          <EmptyState title={data.total === 0 && !normQ && !year && !from && !to ? "ยังไม่มีข้อมูลในฐานข้อมูล" : "ไม่พบงวดที่ตรงกับเงื่อนไข"} />
        ) : data ? (
          <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={loading}>
            <Table>
              <THead>
                <TR>
                  <TH>วันที่ออกรางวัล</TH>
                  <TH>รางวัลที่ 1</TH>
                  <TH className="hidden md:table-cell">รางวัลอื่น (แยกประเภท)</TH>
                  <TH>สถานะ / แหล่งข้อมูล</TH>
                  <TH className="text-right">ต้นฉบับ</TH>
                </TR>
              </THead>
              <TBody>
                {data.items.map((r) => (
                  <TR key={r.id}>
                    <TD className="whitespace-nowrap">{formatThaiDate(r.drawDate)}</TD>
                    <TD>
                      {r.status === "CONFLICT" ? (
                        <div className="text-sm">
                          <Badge variant="warning"><AlertTriangle /> รอตรวจสอบ</Badge>
                          <p className="mt-1 text-xs text-muted">
                            {r.sourceName}: <span className="num">{r.number}</span> · {r.conflictSource}: <span className="num">{r.conflictNumber}</span>
                          </p>
                        </div>
                      ) : (
                        <span className="num text-lg font-semibold text-primary">
                          <Highlight value={r.number} q={normQ} />
                        </span>
                      )}
                    </TD>
                    <TD className="hidden text-xs text-muted md:table-cell">
                      {r.otherPrizes.length
                        ? groupPrizes(r.otherPrizes).map(([label, nums]) => (
                            <span key={label} className="mr-3 inline-block">
                              {label} <span className="num text-text">{nums.join(" ")}</span>
                            </span>
                          ))
                        : "—"}
                    </TD>
                    <TD className="text-xs">
                      {r.status === "VERIFIED" && <Badge variant="success"><ShieldCheck /> ยืนยันแล้ว</Badge>}
                      {r.status === "SOURCE_ONLY" && <Badge variant="muted"><CircleDashed /> แหล่งเดียว</Badge>}
                      <p className="mt-1 text-muted">{r.sourceName}{r.verifiedSource && r.verifiedSource !== r.sourceName ? ` · ยืนยันโดย ${r.verifiedSource}` : ""}</p>
                    </TD>
                    <TD className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`เปิดผลต้นฉบับงวด ${formatThaiDate(r.drawDate)}`}>
                          <ExternalLink aria-hidden /> <span className="hidden sm:inline">เปิดผลต้นฉบับ</span>
                        </a>
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
              <Caption>เรียงจากใหม่ไปเก่า · ทั้งหมด {data.total.toLocaleString("th-TH")} งวดที่ตรงเงื่อนไข · งวด “รอตรวจสอบ” ไม่ถูกนำไปคำนวณสถิติ</Caption>
            </Table>
            <nav aria-label="เปลี่ยนหน้า" className="mt-4 flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft aria-hidden /> ก่อนหน้า
              </Button>
              <span className="text-sm text-muted">
                หน้า <span className="num text-text">{data.page}</span> จาก <span className="num text-text">{data.pages}</span>
              </span>
              <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
                ถัดไป <ChevronRight aria-hidden />
              </Button>
            </nav>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
