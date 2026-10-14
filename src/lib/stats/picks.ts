/**
 * "เลขน่าจับตาตามสถิติ" — สรุปจากประวัติเท่านั้น ไม่ใช่การทำนาย
 * ทุกหมายเลขมีโอกาสออกเท่ากันในทุกงวด
 */
import type { Draw } from "./index";
import { positionDigitFrequency } from "./index";

/** ผลรางวัลประเภทหนึ่งของแต่ละงวด เรียงใหม่→เก่า (เลขท้าย 3 ตัวมี 2 ชุดต่องวด) */
export interface PrizeDraw {
  drawDate: string;
  numbers: string[];
}

export interface PickItem {
  value: string;
  count: number;
  lastSeen: string | null;
  /** จำนวนงวดตั้งแต่ออกครั้งล่าสุด (null = ไม่เคยออกในข้อมูล) */
  drawsSince: number | null;
}

export interface HotCold {
  sampleSize: number;
  frequent: PickItem[];
  absent: PickItem[];
  neverSeen: number;
}

export function hotCold(rowsDesc: PrizeDraw[], width: 2 | 3, limit = 5): HotCold {
  const items = new Map<string, PickItem>();
  for (let v = 0; v < 10 ** width; v++) {
    const value = String(v).padStart(width, "0");
    items.set(value, { value, count: 0, lastSeen: null, drawsSince: null });
  }
  rowsDesc.forEach((row, i) => {
    for (const n of new Set(row.numbers)) {
      const it = items.get(n);
      if (!it) continue;
      it.count++;
      if (it.lastSeen === null) {
        it.lastSeen = row.drawDate;
        it.drawsSince = i;
      }
    }
  });
  const all = [...items.values()];
  const seen = all.filter((x) => x.count > 0);
  const frequent = [...seen]
    .sort((a, b) => b.count - a.count || (a.drawsSince ?? 0) - (b.drawsSince ?? 0) || a.value.localeCompare(b.value))
    .slice(0, limit);
  const absent = [...seen]
    .sort((a, b) => (b.drawsSince ?? 0) - (a.drawsSince ?? 0) || a.value.localeCompare(b.value))
    .slice(0, limit);
  return { sampleSize: rowsDesc.length, frequent, absent, neverSeen: all.length - seen.length };
}

/** รวมเลขที่ออกบ่อยที่สุดของแต่ละตำแหน่งในรางวัลที่ 1 (เสมอกันเลือกเลขน้อยสุด) */
export function topDigitsNumber(draws: Draw[]): { number: string; digits: { digit: number; pct: number }[] } | null {
  if (draws.length === 0) return null;
  const pos = positionDigitFrequency(draws);
  const digits = pos.map((p) => {
    const digit = Math.min(...p.most.digits);
    return { digit, pct: p.digits[digit].pct };
  });
  return { number: digits.map((d) => d.digit).join(""), digits };
}
