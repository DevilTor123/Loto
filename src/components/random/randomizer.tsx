"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Dices, FlaskConical, RotateCcw, Shuffle, Star, Trash2, Waves } from "lucide-react";
import {
  buildProfiles,
  frequencyNumber,
  patternNumber,
  positionWeights,
  uniformNumber,
  type FrequencyHypothesis,
  type PatternProfile,
} from "@/lib/random";
import { digitSum, oddCount, POSITION_NAMES } from "@/lib/number";
import { formatThaiDate } from "@/lib/thai-date";
import { DISCLAIMER } from "@/lib/copy";
import type { Draw } from "@/lib/stats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input, Label, Select } from "../ui/input";
import { Slider } from "../ui/slider";
import { NumberDisplay } from "../number-display";
import { EmptyState, ErrorState, Spinner } from "../states";
import { Table, TBody, TD, TH, THead, TR } from "../ui/table";

type Mode = "A" | "B" | "C";
interface NumbersResp {
  sampleSize: number;
  draws: Draw[];
  positionCounts: number[][];
}
interface Result {
  number: string;
  note?: string;
}
interface Saved {
  id: number;
  number: string;
  label: string | null;
  createdAt: string;
}

const COUNTS = [1, 5, 10, 20];

function useHistory() {
  const [data, setData] = useState<NumbersResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/numbers");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    }
  }, []);
  useEffect(() => void load(), [load]);
  return { data, error, reload: load };
}

function useSaved() {
  const [items, setItems] = useState<Saved[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/saved");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setItems((await res.json()).items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดรายการโปรดไม่สำเร็จ");
    }
  }, []);
  useEffect(() => void load(), [load]);
  const save = async (number: string, label?: string) => {
    const res = await fetch("/api/saved", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ number, label }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "บันทึกไม่สำเร็จ");
    await load();
  };
  const remove = async (number: string) => {
    await fetch(`/api/saved?number=${number}`, { method: "DELETE" });
    await load();
  };
  return { items, error, save, remove };
}

function summarize(nums: string[]) {
  if (!nums.length) return null;
  const meanSum = nums.reduce((a, n) => a + digitSum(n), 0) / nums.length;
  const oddPct = (nums.reduce((a, n) => a + oddCount(n), 0) / (nums.length * 6)) * 100;
  return { meanSum, oddPct };
}

export function Randomizer() {
  const history = useHistory();
  const saved = useSaved();
  const [mode, setMode] = useState<Mode>("A");
  const [count, setCount] = useState(5);
  const [alpha, setAlpha] = useState(50);
  const [hypothesis, setHypothesis] = useState<FrequencyHypothesis>("favor-frequent");
  const [results, setResults] = useState<Result[]>([]);
  const [compare, setCompare] = useState<{ uniform: string[]; frequent: string[]; rare: string[] } | null>(null);
  const [rollId, setRollId] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const lookup = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const d of history.data?.draws ?? []) m.set(d.number, [...(m.get(d.number) ?? []), d.drawDate]);
    return m;
  }, [history.data]);

  const profiles: PatternProfile[] = useMemo(
    () => buildProfiles((history.data?.draws ?? []).map((d) => d.number)),
    [history.data],
  );
  const weights = useMemo(
    () => (history.data ? positionWeights(history.data.positionCounts, alpha / 100, hypothesis) : null),
    [history.data, alpha, hypothesis],
  );

  const roll = useCallback(() => {
    try {
      if (mode === "A") {
        setResults(Array.from({ length: count }, () => ({ number: uniformNumber() })));
        setCompare(null);
      } else if (mode === "B") {
        setResults(
          Array.from({ length: count }, () => {
            const r = patternNumber(profiles);
            return {
              number: r.number,
              note: r.profile
                ? `ลักษณะ: เลขคี่ ${r.profile.oddCount} หลัก · ผลรวม ${r.profile.sumRange[0]}–${r.profile.sumRange[1]} · รูปแบบซ้ำ ${r.profile.repeatPattern} (พบ ${r.profile.count} งวด = ${r.profile.pct.toFixed(1)}%)`
                : "ไม่มีข้อมูลประวัติ — ใช้การสุ่มแบบเท่ากัน",
            };
          }),
        );
        setCompare(null);
      } else if (history.data) {
        const pc = history.data.positionCounts;
        const a = alpha / 100;
        const main = Array.from({ length: count }, () => ({ number: frequencyNumber(positionWeights(pc, a, hypothesis)) }));
        setResults(main);
        setCompare({
          uniform: Array.from({ length: count }, () => uniformNumber()),
          frequent: Array.from({ length: count }, () => frequencyNumber(positionWeights(pc, a, "favor-frequent"))),
          rare: Array.from({ length: count }, () => frequencyNumber(positionWeights(pc, a, "favor-rare"))),
        });
      }
      setRollId((x) => x + 1);
    } catch (e) {
      setResults([{ number: "------", note: e instanceof Error ? e.message : "สุ่มไม่สำเร็จ" }]);
    }
  }, [mode, count, profiles, history.data, alpha, hypothesis]);

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied("error");
    }
  }

  async function saveNumber(n: string) {
    try {
      await saved.save(n, mode === "A" ? "สุ่มแบบเท่ากัน" : mode === "B" ? "ตามลักษณะในอดีต" : `ทดลองน้ำหนัก ${alpha}%`);
      setSaveMsg(`บันทึก ${n} แล้ว`);
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    }
    setTimeout(() => setSaveMsg(null), 2000);
  }

  const sampleSize = history.data?.sampleSize ?? 0;
  const needsHistory = mode !== "A";
  const savedSet = new Set(saved.items.map((s) => s.number));

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>ตั้งค่าการสุ่ม</CardTitle>
            <CardDescription>
              ทุกโหมดใช้ <code className="text-primary">crypto.getRandomValues</code> (ไม่ใช้ Math.random) · ผลเป็นสตริง 6 หลัก 000000–999999 รวมเลขซ้ำได้ตามปกติ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={mode} onValueChange={(v) => { setMode(v as Mode); setResults([]); setCompare(null); }}>
              <TabsList aria-label="โหมดการสุ่ม">
                <TabsTrigger value="A"><Shuffle className="mr-1 inline size-3.5" aria-hidden />A: สุ่มเท่ากัน</TabsTrigger>
                <TabsTrigger value="B"><Waves className="mr-1 inline size-3.5" aria-hidden />B: ตามลักษณะในอดีต</TabsTrigger>
                <TabsTrigger value="C"><FlaskConical className="mr-1 inline size-3.5" aria-hidden />C: ทดลองน้ำหนักความถี่</TabsTrigger>
              </TabsList>

              <TabsContent value="A" className="space-y-2 text-sm text-muted">
                <p><strong className="text-text">วิธีการ:</strong> สุ่มจำนวนเต็ม 0–999,999 แบบเท่ากันทุกค่าด้วย rejection sampling (ตัดค่าที่ทำให้เกิด modulo bias) แล้วเติม 0 ด้านหน้าให้ครบ 6 หลัก</p>
                <p>ทุกหมายเลขมีโอกาสถูกเลือก 1 ใน 1,000,000 เท่ากัน ไม่ใช้สถิติย้อนหลังใด ๆ</p>
              </TabsContent>

              <TabsContent value="B" className="space-y-2 text-sm text-muted">
                <p>
                  <strong className="text-text">วิธีการ:</strong> (1) จัดกลุ่มรางวัลที่ 1 ในอดีต {sampleSize.toLocaleString("th-TH")} งวด ตามลักษณะ:
                  จำนวนหลักคี่, ช่วงผลรวม (ช่วงละ 5) และรูปแบบเลขซ้ำ — ได้ {profiles.length} กลุ่ม (2) สุ่มเลือก 1 กลุ่มตามสัดส่วนที่พบในอดีต
                  (3) สุ่มหมายเลขแบบเท่ากัน แล้วเก็บเฉพาะหมายเลขที่มีลักษณะตรงกับกลุ่มนั้น
                </p>
                <p className="rounded-lg border border-warning/30 bg-warning/5 p-2.5 text-warning">
                  ลักษณะเหล่านี้เป็นเพียงสิ่งที่พบในอดีต และส่วนใหญ่สะท้อนว่า “หมายเลขแบบไหนมีจำนวนมากอยู่แล้ว” — ไม่ใช่หลักฐานว่าหมายเลขที่มีลักษณะนี้มีโอกาสถูกรางวัลมากกว่า
                </p>
                {profiles.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-text">ดูลักษณะที่พบบ่อย 8 อันดับ</summary>
                    <ul className="mt-2 space-y-1">
                      {profiles.slice(0, 8).map((p) => (
                        <li key={`${p.oddCount}-${p.sumRange[0]}-${p.repeatPattern}`}>
                          คี่ {p.oddCount} หลัก · ผลรวม {p.sumRange[0]}–{p.sumRange[1]} · ซ้ำ {p.repeatPattern} — {p.count} งวด ({p.pct.toFixed(1)}%)
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </TabsContent>

              <TabsContent value="C" className="space-y-3 text-sm text-muted">
                <p className="rounded-lg border border-warning/30 bg-warning/5 p-2.5 text-warning">
                  <strong>การทดลองแบบจำลอง</strong> — ใช้เปรียบเทียบชุดหมายเลขที่สร้างจากสมมติฐานต่างกันเท่านั้น ไม่ใช่ความน่าจะเป็นที่พิสูจน์แล้ว
                  และไม่แม่นยำกว่าการสุ่มแบบปกติ (หมายเลขใดก็ตามมีโอกาสถูกรางวัล 1 ใน 1,000,000 เท่ากัน)
                </p>
                <p>
                  <strong className="text-text">วิธีการ:</strong> สุ่มทีละหลัก น้ำหนักของเลข d ในตำแหน่ง i = (1 − α) × 10% + α × p<sub>i</sub>(d)
                  โดย p คือสัดส่วนที่พบในอดีต ({sampleSize.toLocaleString("th-TH")} งวด) หรือสัดส่วนกลับด้าน (ให้น้ำหนักเลขที่พบน้อย) · α = 0 จะเหมือนโหมด A ทุกประการ
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="alpha">น้ำหนักจากความถี่ในอดีต (α): <span className="num text-primary">{alpha}%</span></Label>
                    <Slider id="alpha" aria-label="น้ำหนักจากความถี่ในอดีต" min={0} max={100} step={5} value={[alpha]} onValueChange={([v]) => setAlpha(v)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="hyp">สมมติฐาน</Label>
                    <Select id="hyp" value={hypothesis} onChange={(e) => setHypothesis(e.target.value as FrequencyHypothesis)}>
                      <option value="favor-frequent">ให้น้ำหนักเลขที่พบบ่อยในอดีต</option>
                      <option value="favor-rare">ให้น้ำหนักเลขที่พบน้อยในอดีต</option>
                    </Select>
                  </div>
                </div>
                {weights && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-text">ดูตารางน้ำหนักที่ใช้จริง (%)</summary>
                    <Table className="mt-2 text-xs">
                      <THead>
                        <TR>
                          <TH>ตำแหน่ง</TH>
                          {Array.from({ length: 10 }, (_, d) => <TH key={d} className="text-right">{d}</TH>)}
                        </TR>
                      </THead>
                      <TBody>
                        {weights.map((row, i) => (
                          <TR key={i}>
                            <TD className="whitespace-nowrap">{POSITION_NAMES[i]}</TD>
                            {row.map((w, d) => <TD key={d} className="num text-right">{(w * 100).toFixed(1)}</TD>)}
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </details>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
              <div className="flex flex-col gap-1">
                <Label htmlFor="count">จำนวนหมายเลข</Label>
                <Select id="count" value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-32">
                  {COUNTS.map((c) => <option key={c} value={c}>{c} หมายเลข</option>)}
                </Select>
              </div>
              <Button size="lg" onClick={roll} disabled={needsHistory && (!history.data || sampleSize === 0)}>
                <Dices aria-hidden /> {results.length ? "สุ่มใหม่" : "สุ่มเลข"}
              </Button>
              {results.length > 0 && (
                <>
                  <Button variant="outline" onClick={() => copy(results.map((r) => r.number).join("\n"), "all")}>
                    {copied === "all" ? <Check aria-hidden /> : <Copy aria-hidden />} คัดลอกทั้งหมด
                  </Button>
                  <Button variant="ghost" onClick={() => { setResults([]); setCompare(null); }}>
                    <RotateCcw aria-hidden /> ล้าง
                  </Button>
                </>
              )}
            </div>
            {needsHistory && history.error && <ErrorState message={`โหลดข้อมูลย้อนหลังไม่สำเร็จ: ${history.error}`} onRetry={history.reload} />}
            {needsHistory && !history.data && !history.error && <Spinner label="กำลังโหลดข้อมูลย้อนหลัง…" />}
            {needsHistory && history.data && sampleSize === 0 && (
              <p className="text-sm text-warning">ยังไม่มีข้อมูลย้อนหลังในฐานข้อมูล โหมดนี้จึงใช้งานไม่ได้ — ใช้โหมด A ได้ตามปกติ</p>
            )}
            {(saveMsg || copied === "error") && <p role="status" className="text-sm text-success">{copied === "error" ? "คัดลอกไม่สำเร็จ (เบราว์เซอร์ไม่อนุญาต)" : saveMsg}</p>}
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>ผลการสุ่ม</CardTitle>
              <CardDescription>
                ข้อมูลประวัติเทียบกับรางวัลที่ 1 จำนวน {sampleSize.toLocaleString("th-TH")} งวดในฐานข้อมูล · โอกาสถูกรางวัลที่ 1 ของแต่ละหมายเลข = 1 ใน 1,000,000
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3 sm:grid-cols-2" aria-live="polite">
                {results.map((r, i) => {
                  const dates = lookup.get(r.number) ?? [];
                  return (
                    <li key={`${rollId}-${i}`} className="rounded-xl border border-border bg-bg/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <NumberDisplay value={r.number} size="sm" animate />
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" aria-label={`คัดลอก ${r.number}`} onClick={() => copy(r.number, `${rollId}-${i}`)}>
                            {copied === `${rollId}-${i}` ? <Check className="text-success" /> : <Copy />}
                          </Button>
                          <Button variant="ghost" size="icon" aria-label={`บันทึก ${r.number} เป็นรายการโปรด`} onClick={() => saveNumber(r.number)}>
                            <Star className={savedSet.has(r.number) ? "fill-primary text-primary" : ""} />
                          </Button>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        {dates.length > 0 ? (
                          <>
                            เคยเป็นรางวัลที่ 1 <strong className="text-primary">{dates.length}</strong> ครั้ง · ล่าสุด {formatThaiDate(dates[0])}
                            {" "}· ความถี่ที่พบในอดีต {((dates.length / Math.max(sampleSize, 1)) * 100).toFixed(3)}%
                          </>
                        ) : (
                          <>ไม่เคยเป็นรางวัลที่ 1 ในข้อมูล {sampleSize.toLocaleString("th-TH")} งวด (พบ 0 ครั้ง)</>
                        )}
                      </p>
                      {r.note && <p className="mt-1 text-[11px] text-muted/80">{r.note}</p>}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        {compare && (
          <Card>
            <CardHeader>
              <CardTitle>เปรียบเทียบชุดหมายเลขจาก 3 สมมติฐาน (α = {alpha}%)</CardTitle>
              <CardDescription>สร้างพร้อมกันเพื่อเปรียบเทียบลักษณะของชุดหมายเลข ไม่ได้บอกว่าชุดใดมีโอกาสถูกรางวัลมากกว่า</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {(
                [
                  ["uniform", "สุ่มเท่ากัน (α = 0)", compare.uniform],
                  ["frequent", "ให้น้ำหนักเลขที่พบบ่อย", compare.frequent],
                  ["rare", "ให้น้ำหนักเลขที่พบน้อย", compare.rare],
                ] as const
              ).map(([k, title, nums]) => {
                const s = summarize([...nums]);
                return (
                  <div key={k} className="rounded-xl border border-border bg-bg/40 p-3">
                    <p className="mb-2 text-sm text-text">{title}</p>
                    <ul className="num space-y-1 text-primary">
                      {nums.map((n, i) => <li key={i}>{n}</li>)}
                    </ul>
                    {s && (
                      <p className="mt-2 text-xs text-muted">
                        ผลรวมเฉลี่ย {s.meanSum.toFixed(1)} · หลักคี่ {s.oddPct.toFixed(0)}%
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Star className="size-4 text-primary" aria-hidden /> รายการโปรด</CardTitle>
            <CardDescription>บันทึกไว้ในฐานข้อมูลของเว็บนี้</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SaveManual onSave={saveNumber} />
            {saved.error && <ErrorState message={saved.error} />}
            {saved.items.length === 0 ? (
              <EmptyState title="ยังไม่มีรายการโปรด" description="กดไอคอนดาวที่ผลการสุ่มเพื่อบันทึก" />
            ) : (
              <ul className="divide-y divide-border/60">
                {saved.items.map((s) => {
                  const dates = lookup.get(s.number) ?? [];
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-2 py-2">
                      <div>
                        <p className="num text-lg text-primary">{s.number}</p>
                        <p className="text-xs text-muted">
                          {s.label ?? "—"} · {dates.length ? `เคยออก ${dates.length} ครั้ง ล่าสุด ${formatThaiDate(dates[0], true)}` : "ไม่เคยเป็นรางวัลที่ 1"}
                        </p>
                      </div>
                      <div className="flex">
                        <Button variant="ghost" size="icon" aria-label={`คัดลอก ${s.number}`} onClick={() => copy(s.number, `fav-${s.id}`)}>
                          {copied === `fav-${s.id}` ? <Check className="text-success" /> : <Copy />}
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`ลบ ${s.number}`} onClick={() => saved.remove(s.number)}>
                          <Trash2 />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 p-5 text-sm text-muted">
            <Badge variant="warning">ข้อควรทราบ</Badge>
            <p>{DISCLAIMER}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SaveManual({ onSave }: { onSave: (n: string) => Promise<void> }) {
  const [v, setV] = useState("");
  const norm = v.replace(/[๐-๙]/g, (c) => String("๐๑๒๓๔๕๖๗๘๙".indexOf(c))).replace(/\D/g, "");
  return (
    <form
      className="flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (norm.length !== 6) return;
        await onSave(norm);
        setV("");
      }}
    >
      <Input aria-label="เพิ่มหมายเลขเอง (6 หลัก)" placeholder="เพิ่มหมายเลข 6 หลัก" inputMode="numeric" className="num" value={v} maxLength={6} onChange={(e) => setV(e.target.value)} />
      <Button type="submit" variant="outline" disabled={norm.length !== 6}>บันทึก</Button>
    </form>
  );
}
