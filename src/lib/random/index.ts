/**
 * ระบบสุ่มหมายเลข 6 หลัก — ใช้ crypto.getRandomValues (CSPRNG) เป็นกลไกหลัก ไม่ใช้ Math.random
 * ผลลัพธ์เป็นสตริง 6 หลักเสมอ ("000000"–"999999")
 *
 * Mode A (uniform)   — ทุกหมายเลขมีโอกาสเท่ากัน 1/1,000,000
 * Mode B (pattern)   — สุ่มแบบเท่ากัน แล้วคัดเฉพาะที่มี "ลักษณะ" (จำนวนเลขคี่, ช่วงผลรวม, รูปแบบเลขซ้ำ)
 *                      ตรงกับลักษณะที่สุ่มเลือกจากประวัติ ตามสัดส่วนที่พบจริงในอดีต
 * Mode C (frequency) — สุ่มทีละหลัก โดยน้ำหนักของเลขแต่ละตัว = ผสมระหว่างแบบเท่ากัน กับความถี่ในอดีต
 *                      ตามค่าที่ผู้ใช้ปรับ (การทดลองแบบจำลอง ไม่ได้แม่นยำกว่า)
 */
import { digitSum, oddCount, repeatPattern, toSixDigit } from "../number";

export interface RandomSource {
  /** เติม Uint32Array ด้วยค่าสุ่ม */
  fill(arr: Uint32Array): Uint32Array;
}

export const cryptoSource: RandomSource = {
  fill(arr) {
    const c = globalThis.crypto;
    if (!c?.getRandomValues) {
      throw new Error("สภาพแวดล้อมนี้ไม่รองรับ crypto.getRandomValues — ไม่สามารถสุ่มอย่างปลอดภัยได้");
    }
    return c.getRandomValues(arr);
  },
};

/** จำนวนเต็มสุ่มใน [0, max) แบบไม่มี modulo bias (rejection sampling) */
export function randomInt(max: number, src: RandomSource = cryptoSource): number {
  if (!Number.isInteger(max) || max <= 0 || max > 2 ** 32) throw new RangeError("max ไม่ถูกต้อง");
  const limit = Math.floor(2 ** 32 / max) * max;
  const buf = new Uint32Array(1);
  for (;;) {
    src.fill(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

/** จำนวนจริงสุ่มใน [0, 1) ความละเอียด 32 บิต */
export function randomUnit(src: RandomSource = cryptoSource): number {
  const buf = new Uint32Array(1);
  src.fill(buf);
  return buf[0] / 2 ** 32;
}

// ------------------------------------------------------------------ Mode A

export function uniformNumber(src: RandomSource = cryptoSource): string {
  return toSixDigit(randomInt(1_000_000, src));
}

// ------------------------------------------------------------------ Mode B

export interface PatternProfile {
  oddCount: number;
  /** ช่วงผลรวม เช่น [25, 29] */
  sumRange: [number, number];
  repeatPattern: string;
  /** จำนวนงวดในประวัติที่มีลักษณะนี้ */
  count: number;
  pct: number;
}

const SUM_BUCKET = 5;
function sumRangeOf(sum: number): [number, number] {
  const lo = Math.floor(sum / SUM_BUCKET) * SUM_BUCKET;
  return [lo, Math.min(lo + SUM_BUCKET - 1, 54)];
}

function profileKey(n: string) {
  return `${oddCount(n)}|${sumRangeOf(digitSum(n))[0]}|${repeatPattern(n)}`;
}

/** สร้างตารางลักษณะ (odd count × ช่วงผลรวม × รูปแบบเลขซ้ำ) จากประวัติรางวัลที่ 1 */
export function buildProfiles(history: string[]): PatternProfile[] {
  const m = new Map<string, number>();
  for (const n of history) m.set(profileKey(n), (m.get(profileKey(n)) ?? 0) + 1);
  return [...m.entries()]
    .map(([k, count]) => {
      const [odd, lo, pattern] = k.split("|");
      return {
        oddCount: Number(odd),
        sumRange: [Number(lo), Math.min(Number(lo) + SUM_BUCKET - 1, 54)] as [number, number],
        repeatPattern: pattern,
        count,
        pct: (count / history.length) * 100,
      };
    })
    .sort((a, b) => b.count - a.count);
}

function weightedPick<T>(items: T[], weight: (t: T) => number, src: RandomSource): T {
  const total = items.reduce((a, t) => a + weight(t), 0);
  let r = randomUnit(src) * total;
  for (const t of items) {
    r -= weight(t);
    if (r < 0) return t;
  }
  return items[items.length - 1];
}

export function matchesProfile(n: string, p: PatternProfile): boolean {
  const s = digitSum(n);
  return oddCount(n) === p.oddCount && s >= p.sumRange[0] && s <= p.sumRange[1] && repeatPattern(n) === p.repeatPattern;
}

/**
 * 1) เลือกลักษณะจากประวัติ ตามสัดส่วนที่พบ
 * 2) สุ่มหมายเลขแบบเท่ากัน แล้วคัดเฉพาะที่ตรงลักษณะ (rejection sampling)
 * ผลลัพธ์จึงเป็นหมายเลขที่สุ่มอย่างเท่ากันภายในกลุ่มลักษณะเดียวกัน
 */
export function patternNumber(
  profiles: PatternProfile[],
  src: RandomSource = cryptoSource,
  maxTries = 20_000,
): { number: string; profile: PatternProfile | null; tries: number } {
  if (profiles.length === 0) return { number: uniformNumber(src), profile: null, tries: 1 };
  const profile = weightedPick(profiles, (p) => p.count, src);
  for (let i = 1; i <= maxTries; i++) {
    const n = uniformNumber(src);
    if (matchesProfile(n, profile)) return { number: n, profile, tries: i };
  }
  // ลักษณะที่หายาก: ไล่หาทุกหมายเลขที่ตรงลักษณะ แล้วสุ่มเลือกแบบเท่ากัน (ผลเหมือน rejection sampling ทุกประการ)
  const matches: number[] = [];
  for (let n = 0; n < 1_000_000; n++) if (matchesProfile(toSixDigit(n), profile)) matches.push(n);
  if (matches.length === 0) return { number: uniformNumber(src), profile: null, tries: maxTries };
  return { number: toSixDigit(matches[randomInt(matches.length, src)]), profile, tries: maxTries + 1 };
}

// ------------------------------------------------------------------ Mode C

export type FrequencyHypothesis = "favor-frequent" | "favor-rare";

/**
 * น้ำหนักของเลข 0–9 ในแต่ละตำแหน่ง
 *   weight = (1 − α) × 0.1 + α × p
 * โดย p = สัดส่วนที่พบในอดีต (favor-frequent) หรือสัดส่วนกลับด้านที่ normalize แล้ว (favor-rare)
 * α = 0 → เท่ากับ Mode A ทุกประการ
 */
export function positionWeights(
  positionCounts: number[][],
  alpha: number,
  hypothesis: FrequencyHypothesis = "favor-frequent",
): number[][] {
  const a = Math.min(1, Math.max(0, alpha));
  return positionCounts.map((counts) => {
    const total = counts.reduce((x, y) => x + y, 0);
    let p = total > 0 ? counts.map((c) => c / total) : counts.map(() => 0.1);
    if (hypothesis === "favor-rare") {
      const inv = p.map((x) => Math.max(...p) - x + 1e-9);
      const s = inv.reduce((x, y) => x + y, 0);
      p = inv.map((x) => x / s);
    }
    return p.map((x) => (1 - a) * 0.1 + a * x);
  });
}

export function frequencyNumber(weights: number[][], src: RandomSource = cryptoSource): string {
  if (weights.length !== 6) throw new Error("ต้องมีน้ำหนักครบ 6 ตำแหน่ง");
  return weights
    .map((w) => String(weightedPick([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], (d) => w[d], src)))
    .join("");
}
