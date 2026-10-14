/**
 * ยูทิลิตีหมายเลขสลาก — หมายเลขเป็น String เสมอ เพื่อรักษาเลขศูนย์ด้านหน้า
 */

const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";

/** แปลงเลขไทย (๐–๙) เป็นเลขอารบิก และตัดอักขระที่ไม่ใช่ตัวเลขออก */
export function normalizeDigits(input: string): string {
  let out = "";
  for (const ch of input) {
    const thai = THAI_DIGITS.indexOf(ch);
    if (thai >= 0) out += String(thai);
    else if (ch >= "0" && ch <= "9") out += ch;
  }
  return out;
}

export const SIX_DIGIT_RE = /^\d{6}$/;

export function isSixDigit(value: unknown): value is string {
  return typeof value === "string" && SIX_DIGIT_RE.test(value);
}

/** แปลงจำนวนเต็ม 0–999999 เป็นสตริง 6 หลัก (เติม 0 ด้านหน้า) */
export function toSixDigit(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999) {
    throw new RangeError(`number out of range: ${n}`);
  }
  return String(n).padStart(6, "0");
}

export function digitsOf(num: string): number[] {
  return num.split("").map((c) => c.charCodeAt(0) - 48);
}

export function digitSum(num: string): number {
  return digitsOf(num).reduce((a, b) => a + b, 0);
}

/** จำนวนหลักที่เป็นเลขคี่ (0–6) */
export function oddCount(num: string): number {
  return digitsOf(num).filter((d) => d % 2 === 1).length;
}

/** จำนวนตัวเลขที่ไม่ซ้ำกันในหมายเลข (1–6) */
export function distinctDigitCount(num: string): number {
  return new Set(num.split("")).size;
}

/** จำนวนหลักที่ "ซ้ำ" = 6 − จำนวนตัวเลขที่ไม่ซ้ำ (0 = ไม่มีเลขซ้ำเลย) */
export function repeatedDigitCount(num: string): number {
  return 6 - distinctDigitCount(num);
}

/** รูปแบบการซ้ำ เช่น "2-1-1-1-1" (ความยาวกลุ่มเรียงจากมากไปน้อย) */
export function repeatPattern(num: string): string {
  const counts = new Map<string, number>();
  for (const c of num) counts.set(c, (counts.get(c) ?? 0) + 1);
  return [...counts.values()].sort((a, b) => b - a).join("-");
}

export const POSITION_NAMES = [
  "หลักแสน",
  "หลักหมื่น",
  "หลักพัน",
  "หลักร้อย",
  "หลักสิบ",
  "หลักหน่วย",
] as const;
