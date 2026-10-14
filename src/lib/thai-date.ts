/** วันที่ภาษาไทย / พ.ศ. — วันที่งวดภายในระบบเก็บเป็น "YYYY-MM-DD" (ค.ศ.) */

export const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
] as const;

export const THAI_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
] as const;

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(iso: string): boolean {
  if (!ISO_DATE_RE.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isoFromParts(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** ปี พ.ศ. 2 หลักหรือ 4 หลัก → ค.ศ. (เช่น 69 → 2026, 2558 → 2015) */
export function beYearToCe(beYear: number): number {
  const be = beYear < 100 ? 2500 + beYear : beYear;
  return be - 543;
}

/**
 * แปลงข้อความวันที่ภาษาไทย เช่น "1 ตุลาคม 69", "30 ธันวาคม 2558" → "2026-10-01"
 * คืนค่า null หากรูปแบบไม่ถูกต้อง
 */
export function parseThaiDate(text: string): string | null {
  const m = text.trim().match(/(\d{1,2})\s+([ก-๙.]+)\s+(\d{4}|\d{2})(?!\d)/);
  if (!m) return null;
  const day = Number(m[1]);
  const monthName = m[2];
  let monthIdx = THAI_MONTHS.findIndex((n) => n === monthName);
  if (monthIdx < 0) monthIdx = THAI_MONTHS_SHORT.findIndex((n) => n === monthName);
  if (monthIdx < 0) return null;
  const year = beYearToCe(Number(m[3]));
  const iso = isoFromParts(year, monthIdx + 1, day);
  return isValidIsoDate(iso) ? iso : null;
}

/** "2026-10-01" → "1 ตุลาคม 2569" */
export function formatThaiDate(iso: string, short = false): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const months = short ? THAI_MONTHS_SHORT : THAI_MONTHS;
  return `${d} ${months[m - 1]} ${y + 543}`;
}

/** วันเวลาแบบไทย (โซนเวลา Asia/Bangkok) */
export function formatThaiDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isoToDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}
