"use client";
import { CalendarDays, History, Percent } from "lucide-react";
import { formatProbability, prizeOdds } from "@/lib/odds";
import { formatThaiDate } from "@/lib/thai-date";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";

export type ShortType = "last2" | "last3" | "front3";

export const SHORT_LABEL: Record<ShortType, string> = {
  last2: "เลขท้าย 2 ตัว",
  last3: "เลขท้าย 3 ตัว",
  front3: "เลขหน้า 3 ตัว",
};

export interface ShortResp {
  type: ShortType;
  number: string;
  totalDraws: number;
  prize: {
    value: string;
    drawsWithData: number;
    count: number;
    drawsSince: number | null;
    dates: string[];
  };
  firstPrizePart: { count: number; dates: string[] };
}

const ODDS = prizeOdds();

/** ผลตรวจเลขท้าย 2 ตัว / ท้าย 3 ตัว / หน้า 3 ตัว */
export function ShortResult({ data }: { data: ShortResp }) {
  const label = SHORT_LABEL[data.type];
  const odds = ODDS.find((o) => o.key === data.type)!;
  const p = data.prize;
  const firstPartLabel =
    data.type === "front3"
      ? "3 ตัวหน้าของรางวัลที่ 1"
      : `${data.type === "last2" ? 2 : 3} ตัวท้ายของรางวัลที่ 1`;

  return (
    <div className="space-y-6">
      <section
        aria-label="จำนวนครั้งที่เคยออก"
        className="rounded-2xl border border-primary/30 bg-surface p-4"
      >
        <p className="mb-3 flex items-center gap-1.5 text-sm text-muted">
          <History className="size-4 text-primary" aria-hidden /> {label}{" "}
          <span className="num text-primary">{data.number}</span>{" "}
          ออกมาแล้วกี่ครั้ง
        </p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat
            title={`เป็น${label}`}
            main={p.drawsWithData ? `${p.count}` : null}
            unit="ครั้ง"
            sub={
              p.drawsWithData
                ? `จาก ${p.drawsWithData.toLocaleString("th-TH")} งวด`
                : "ยังไม่มีข้อมูล"
            }
            highlight={p.count > 0}
          />
          <Stat
            title="ออกล่าสุด"
            main={
              p.dates[0]
                ? formatThaiDate(p.dates[0], true)
                : p.drawsWithData
                  ? "ไม่เคย"
                  : null
            }
            sub={
              p.drawsSince != null
                ? p.drawsSince === 0
                  ? "งวดล่าสุด"
                  : `ห่างมา ${p.drawsSince} งวด`
                : ""
            }
            small
          />
          <Stat
            title={`ตรงกับ ${firstPartLabel}`}
            main={data.totalDraws ? `${data.firstPrizePart.count}` : null}
            unit="ครั้ง"
            sub={
              data.totalDraws
                ? `จาก ${data.totalDraws.toLocaleString("th-TH")} งวด`
                : "ยังไม่มีข้อมูล"
            }
          />
          <Stat
            title="โอกาสงวดหน้า"
            main={formatProbability(odds.probability)}
            sub={`1 ใน ${Math.round(odds.oneIn).toLocaleString("th-TH")} · เท่ากันทุกเลข`}
            gold
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Percent className="size-4 text-primary" aria-hidden /> โอกาสถูก
              {label} ต่อ 1 งวด
            </CardTitle>
            <CardDescription>
              คำนวณจากจำนวนรางวัล โดยสมมติว่าการออกรางวัลสุ่มอย่างยุติธรรม
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="num text-5xl font-semibold text-primary">
              {formatProbability(odds.probability)}
            </p>
            <p>หรือ 1 ใน {Math.round(odds.oneIn).toLocaleString("th-TH")}</p>
            <p className="text-muted">
              {data.type === "last2"
                ? "เลขท้าย 2 ตัวออก 1 ชุดต่องวด จากทั้งหมด 100 แบบ (00–99)"
                : `${label}ออก 2 ชุดต่องวด จากทั้งหมด 1,000 แบบ (000–999) จึงมีโอกาสราว 2 ใน 1,000`}
            </p>
            <p className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              ทุกเลขมีโอกาส<strong>เท่ากันหมด</strong> ไม่ว่าจะเคยออกบ่อย
              ออกน้อย หรือไม่เคยออก จำนวนครั้งด้านบนเป็นสิ่งที่เกิดขึ้นแล้ว
              ไม่ได้ทำให้งวดหน้าออกง่ายหรือยากขึ้น
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4 text-primary" aria-hidden />{" "}
              งวดที่เคยออก{label} {data.number}
            </CardTitle>
            <CardDescription>เรียงจากล่าสุด</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <DateList
              dates={p.dates}
              empty={
                p.drawsWithData
                  ? "ยังไม่เคยออกในข้อมูลที่มี"
                  : "ยังไม่มีข้อมูลรางวัลประเภทนี้"
              }
            />
            {data.firstPrizePart.count > 0 && (
              <div>
                <p className="mb-1 text-muted">ตรงกับ {firstPartLabel}</p>
                <DateList dates={data.firstPrizePart.dates} empty="" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  title,
  main,
  unit,
  sub,
  highlight,
  small,
  gold,
}: {
  title: string;
  main: string | null;
  unit?: string;
  sub: string;
  highlight?: boolean;
  small?: boolean;
  gold?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-bg/40 p-3">
      <p className="text-xs text-muted">{title}</p>
      {main == null ? (
        <p className="mt-1 text-sm text-muted">ยังไม่มีข้อมูล</p>
      ) : (
        <p
          className={`num mt-1 font-semibold ${small ? "text-lg" : "text-3xl"} ${gold ? "text-primary" : highlight ? "text-success" : "text-text"}`}
        >
          {main}{" "}
          {unit && (
            <span className="text-sm font-normal text-muted">{unit}</span>
          )}
        </p>
      )}
      {main != null && <p className="truncate text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

function DateList({ dates, empty }: { dates: string[]; empty: string }) {
  if (!dates.length)
    return empty ? <p className="text-muted">{empty}</p> : null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {dates.map((d) => (
        <li key={d}>
          <Badge variant="muted" className="num">
            {formatThaiDate(d, true)}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
