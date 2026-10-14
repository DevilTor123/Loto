/**
 * โมดูลวิเคราะห์สถิติ (แยกจาก UI — เป็นฟังก์ชันบริสุทธิ์ ทดสอบได้)
 *
 * ใช้เฉพาะ "รางวัลที่ 1" (หมายเลข 6 หลัก) เท่านั้น — รางวัลประเภทอื่นไม่ถูกนำมาปน
 * ข้อมูลที่เข้ามาต้องเป็นงวดที่สมบูรณ์ (ไม่รวมงวดสถานะ CONFLICT)
 *
 * สูตร
 *   ความถี่ของหมายเลข      = จำนวนครั้งที่เป็นรางวัลที่ 1 ÷ จำนวนงวดในช่วงที่เลือก
 *   เปอร์เซ็นต์ความถี่ที่พบ = จำนวนครั้งที่พบ ÷ จำนวนงวดที่มีข้อมูล × 100
 */
import {
  digitsOf,
  digitSum,
  distinctDigitCount,
  isSixDigit,
  oddCount,
  repeatPattern,
} from "../number";

export interface Draw {
  /** YYYY-MM-DD */
  drawDate: string;
  /** สตริง 6 หลัก */
  number: string;
}

export type WindowKey = "all" | "10" | "30" | "50" | "100" | "custom";

export function percent(count: number, total: number): number {
  if (total <= 0) return 0;
  return (count / total) * 100;
}

/** เรียงจากใหม่ไปเก่า และกรองเฉพาะข้อมูลที่ถูกต้อง */
export function normalizeDraws(draws: Draw[]): Draw[] {
  return draws
    .filter((d) => isSixDigit(d.number) && /^\d{4}-\d{2}-\d{2}$/.test(d.drawDate))
    .sort((a, b) => b.drawDate.localeCompare(a.drawDate));
}

export function selectWindow(
  drawsDesc: Draw[],
  window: WindowKey,
  from?: string,
  to?: string,
): Draw[] {
  if (window === "custom") {
    return drawsDesc.filter((d) => (!from || d.drawDate >= from) && (!to || d.drawDate <= to));
  }
  if (window === "all") return drawsDesc;
  return drawsDesc.slice(0, Number(window));
}

// ---------------------------------------------------------------- หมายเลข 6 หลัก

export interface NumberFrequency {
  number: string;
  /** จำนวนครั้งที่พบในช่วงที่เลือก */
  count: number;
  /** % ของงวดในช่วงที่เลือกที่หมายเลขนี้ปรากฏ */
  pct: number;
  /** งวดล่าสุดที่หมายเลขนี้ปรากฏ (ในประวัติทั้งหมด) */
  lastDate: string;
  /** จำนวนงวดที่ผ่านไปหลังการปรากฏครั้งล่าสุด (นับจากประวัติทั้งหมด; 0 = งวดล่าสุด) */
  drawsSince: number;
  /** จำนวนครั้งทั้งหมดในประวัติ */
  totalCount: number;
  dates: string[];
}

interface HistoryIndex {
  totalCount: Map<string, number>;
  lastIndex: Map<string, number>;
  dates: Map<string, string[]>;
}

function indexHistory(allDesc: Draw[]): HistoryIndex {
  const totalCount = new Map<string, number>();
  const lastIndex = new Map<string, number>();
  const dates = new Map<string, string[]>();
  allDesc.forEach((d, i) => {
    totalCount.set(d.number, (totalCount.get(d.number) ?? 0) + 1);
    if (!lastIndex.has(d.number)) lastIndex.set(d.number, i);
    const list = dates.get(d.number) ?? [];
    list.push(d.drawDate);
    dates.set(d.number, list);
  });
  return { totalCount, lastIndex, dates };
}

/**
 * นับความถี่ของหมายเลขรางวัลที่ 1 ในช่วงที่เลือก
 * เรียงตาม: จำนวนครั้ง (มาก→น้อย) แล้ววันที่ล่าสุด (ใหม่→เก่า)
 */
export function numberFrequencies(windowDesc: Draw[], allDesc: Draw[] = windowDesc): NumberFrequency[] {
  const hist = indexHistory(allDesc);
  const counts = new Map<string, number>();
  for (const d of windowDesc) counts.set(d.number, (counts.get(d.number) ?? 0) + 1);
  const total = windowDesc.length;
  return [...counts.entries()]
    .map(([number, count]) => {
      const li = hist.lastIndex.get(number) ?? 0;
      return {
        number,
        count,
        pct: percent(count, total),
        lastDate: allDesc[li]?.drawDate ?? "",
        drawsSince: li,
        totalCount: hist.totalCount.get(number) ?? count,
        dates: hist.dates.get(number) ?? [],
      };
    })
    .sort((a, b) => b.count - a.count || b.lastDate.localeCompare(a.lastDate));
}

export interface FrequencySummary {
  sampleSize: number;
  uniqueNumbers: number;
  /** มีหมายเลขที่ปรากฏมากกว่า 1 ครั้งหรือไม่ */
  hasRepeats: boolean;
  repeated: NumberFrequency[];
  items: NumberFrequency[];
}

export function frequencySummary(windowDesc: Draw[], allDesc: Draw[] = windowDesc): FrequencySummary {
  const items = numberFrequencies(windowDesc, allDesc);
  const repeated = items.filter((i) => i.count > 1);
  return {
    sampleSize: windowDesc.length,
    uniqueNumbers: items.length,
    hasRepeats: repeated.length > 0,
    repeated,
    items,
  };
}

/** หมายเลขที่เคยเป็นรางวัลที่ 1 แต่ไม่ปรากฏอีกนานที่สุด */
export function longestAbsent(allDesc: Draw[], limit = 20): NumberFrequency[] {
  return numberFrequencies(allDesc, allDesc)
    .sort((a, b) => b.drawsSince - a.drawsSince || a.number.localeCompare(b.number))
    .slice(0, limit);
}

// ---------------------------------------------------------------- เลข 0–9 ตามตำแหน่ง

export interface DigitCount {
  digit: number;
  count: number;
  pct: number;
}

export interface PositionStats {
  position: number;
  sampleSize: number;
  digits: DigitCount[];
  /** เลขที่พบมากที่สุด (รวมกรณีเสมอ) */
  most: { count: number; digits: number[] };
  /** เลขที่พบน้อยที่สุด (รวมกรณีเสมอ) */
  least: { count: number; digits: number[] };
}

function extremes(digits: DigitCount[]) {
  const max = Math.max(...digits.map((d) => d.count));
  const min = Math.min(...digits.map((d) => d.count));
  return {
    most: { count: max, digits: digits.filter((d) => d.count === max).map((d) => d.digit) },
    least: { count: min, digits: digits.filter((d) => d.count === min).map((d) => d.digit) },
  };
}

export function positionDigitFrequency(draws: Draw[]): PositionStats[] {
  const counts = Array.from({ length: 6 }, () => new Array<number>(10).fill(0));
  for (const d of draws) digitsOf(d.number).forEach((digit, pos) => counts[pos][digit]++);
  const n = draws.length;
  return counts.map((row, position) => {
    const digits = row.map((count, digit) => ({ digit, count, pct: percent(count, n) }));
    return { position, sampleSize: n, digits, ...extremes(digits) };
  });
}

/** ความถี่ของเลข 0–9 รวมทุกตำแหน่ง (ฐาน = จำนวนงวด × 6 หลัก) */
export function overallDigitFrequency(draws: Draw[]): DigitCount[] {
  const c = new Array<number>(10).fill(0);
  for (const d of draws) for (const x of digitsOf(d.number)) c[x]++;
  const total = draws.length * 6;
  return c.map((count, digit) => ({ digit, count, pct: percent(count, total) }));
}

// ---------------------------------------------------------------- รูปแบบตัวเลข

export interface Bucket<K extends string | number = number> {
  key: K;
  count: number;
  pct: number;
}

function toBuckets<K extends string | number>(map: Map<K, number>, total: number, keys?: K[]): Bucket<K>[] {
  const ks = keys ?? [...map.keys()];
  return ks.map((key) => ({ key, count: map.get(key) ?? 0, pct: percent(map.get(key) ?? 0, total) }));
}

/** จำนวนหลักคี่ในหมายเลข (0–6) */
export function oddEvenDistribution(draws: Draw[]) {
  const m = new Map<number, number>();
  let oddDigits = 0;
  for (const d of draws) {
    const o = oddCount(d.number);
    oddDigits += o;
    m.set(o, (m.get(o) ?? 0) + 1);
  }
  const totalDigits = draws.length * 6;
  return {
    sampleSize: draws.length,
    buckets: toBuckets(m, draws.length, [0, 1, 2, 3, 4, 5, 6]).map((b) => ({
      ...b,
      label: `คี่ ${b.key} : คู่ ${6 - b.key}`,
    })),
    oddDigitPct: percent(oddDigits, totalDigits),
    evenDigitPct: percent(totalDigits - oddDigits, totalDigits),
  };
}

export function describe(values: number[]) {
  if (values.length === 0) return { mean: 0, median: 0, min: 0, max: 0, stdev: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return { mean, median, min: sorted[0], max: sorted.at(-1)!, stdev: Math.sqrt(variance) };
}

/** การกระจายผลรวมตัวเลข 6 หลัก (0–54) */
export function digitSumDistribution(draws: Draw[]) {
  const m = new Map<number, number>();
  const sums = draws.map((d) => digitSum(d.number));
  for (const s of sums) m.set(s, (m.get(s) ?? 0) + 1);
  return {
    sampleSize: draws.length,
    buckets: toBuckets(m, draws.length, Array.from({ length: 55 }, (_, i) => i)),
    ...describe(sums),
  };
}

/** จำนวนหลักที่ซ้ำกัน และรูปแบบการซ้ำ */
export function repeatDistribution(draws: Draw[]) {
  const distinct = new Map<number, number>();
  const patterns = new Map<string, number>();
  for (const d of draws) {
    const k = distinctDigitCount(d.number);
    distinct.set(k, (distinct.get(k) ?? 0) + 1);
    const p = repeatPattern(d.number);
    patterns.set(p, (patterns.get(p) ?? 0) + 1);
  }
  const withRepeat = draws.length - (distinct.get(6) ?? 0);
  return {
    sampleSize: draws.length,
    distinct: toBuckets(distinct, draws.length, [1, 2, 3, 4, 5, 6]),
    patterns: toBuckets(patterns, draws.length).sort((a, b) => b.count - a.count),
    withRepeatPct: percent(withRepeat, draws.length),
  };
}

/** คู่เลข (ไม่สนลำดับ) ที่ปรากฏร่วมกันในหมายเลขเดียวกัน — นับ 1 ครั้งต่อหมายเลข */
export function digitPairCooccurrence(draws: Draw[], limit = 15) {
  const m = new Map<string, number>();
  for (const d of draws) {
    const set = [...new Set(d.number.split(""))].sort();
    for (let i = 0; i < set.length; i++)
      for (let j = i + 1; j < set.length; j++) {
        const k = `${set[i]}-${set[j]}`;
        m.set(k, (m.get(k) ?? 0) + 1);
      }
  }
  return {
    sampleSize: draws.length,
    top: toBuckets(m, draws.length)
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
      .slice(0, limit),
  };
}

/** ชุดเลขท้าย N ตัวของรางวัลที่ 1 (ไม่ใช่รางวัลเลขท้าย 2 ตัว/3 ตัว) */
export function suffixFrequency(draws: Draw[], len: 2 | 3, limit = 10) {
  const m = new Map<string, number>();
  for (const d of draws) {
    const s = d.number.slice(6 - len);
    m.set(s, (m.get(s) ?? 0) + 1);
  }
  const all = toBuckets(m, draws.length).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  return { sampleSize: draws.length, hasRepeats: all.some((b) => b.count > 1), top: all.slice(0, limit) };
}

// ---------------------------------------------------------------- ตามเวลา

export function yearlyStats(draws: Draw[]) {
  const byYear = new Map<number, Draw[]>();
  for (const d of draws) {
    const y = Number(d.drawDate.slice(0, 4));
    const list = byYear.get(y) ?? [];
    list.push(d);
    byYear.set(y, list);
  }
  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, list]) => {
      const digits = overallDigitFrequency(list);
      return {
        year,
        yearBE: year + 543,
        sampleSize: list.length,
        meanSum: describe(list.map((d) => digitSum(d.number))).mean,
        oddDigitPct: oddEvenDistribution(list).oddDigitPct,
        digitPct: digits.map((x) => x.pct),
        ...extremes(digits),
      };
    });
}

export function compareWindows(drawsDesc: Draw[], sizes = [10, 30, 50, 100]) {
  return sizes.map((size) => {
    const w = drawsDesc.slice(0, size);
    const pos = positionDigitFrequency(w);
    return {
      size,
      sampleSize: w.length,
      complete: w.length === size,
      meanSum: describe(w.map((d) => digitSum(d.number))).mean,
      oddDigitPct: oddEvenDistribution(w).oddDigitPct,
      withRepeatPct: repeatDistribution(w).withRepeatPct,
      topDigitByPosition: pos.map((p) => p.most),
      digitPct: overallDigitFrequency(w).map((d) => d.pct),
    };
  });
}

/** ช่องว่างระหว่างงวดที่ยาวผิดปกติ (> 20 วัน) — บ่งชี้ว่าข้อมูลอาจขาดหาย */
export function detectGaps(drawsDesc: Draw[], maxDays = 20) {
  const gaps: { after: string; before: string; days: number }[] = [];
  for (let i = 0; i < drawsDesc.length - 1; i++) {
    const newer = drawsDesc[i].drawDate;
    const older = drawsDesc[i + 1].drawDate;
    const days = (Date.parse(newer) - Date.parse(older)) / 86_400_000;
    if (days > maxDays) gaps.push({ after: older, before: newer, days });
  }
  return gaps;
}

// ---------------------------------------------------------------- สรุปรวม

export function computeAll(allDraws: Draw[], window: WindowKey = "all", from?: string, to?: string) {
  const all = normalizeDraws(allDraws);
  const w = selectWindow(all, window, from, to);
  return {
    window,
    from: w.at(-1)?.drawDate ?? null,
    to: w[0]?.drawDate ?? null,
    sampleSize: w.length,
    totalDraws: all.length,
    frequency: frequencySummary(w, all),
    positions: positionDigitFrequency(w),
    overallDigits: overallDigitFrequency(w),
    oddEven: oddEvenDistribution(w),
    digitSum: digitSumDistribution(w),
    repeats: repeatDistribution(w),
    pairs: digitPairCooccurrence(w),
    suffix2: suffixFrequency(w, 2),
    suffix3: suffixFrequency(w, 3),
    longestAbsent: longestAbsent(all),
    yearly: yearlyStats(w),
    compare: compareWindows(all),
    gaps: detectGaps(all),
  };
}

export type StatsResult = ReturnType<typeof computeAll>;
