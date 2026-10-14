/**
 * กำหนดการออกรางวัล: ปกติวันที่ 1 และ 16 ของเดือน ประกาศผลช่วงบ่าย (เวลาไทย)
 * บางงวดเลื่อน (เช่น 2, 17, 30 ธ.ค.) — ใช้ระยะผ่อนผันก่อนเตือนว่าข้อมูลเก่า
 */
import { isoFromParts } from "./thai-date";

const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;
/** ถือว่าผลควรประกาศครบแล้วหลัง 16:30 น. เวลาไทย */
const RESULT_READY_MINUTES = 16 * 60 + 30;
/** ระยะผ่อนผันสำหรับงวดที่อาจเลื่อนวัน */
export const STALE_GRACE_DAYS = 2;

export function bangkokToday(now: Date = new Date()): string {
  return new Date(now.getTime() + BKK_OFFSET_MS).toISOString().slice(0, 10);
}

function bangkokMinutesOfDay(now: Date): number {
  const b = new Date(now.getTime() + BKK_OFFSET_MS);
  return b.getUTCHours() * 60 + b.getUTCMinutes();
}

/** งวดปกติ (วันที่ 1 หรือ 16) ล่าสุดที่ควรประกาศผลแล้ว ณ เวลา now */
export function expectedLatestDrawDate(now: Date = new Date()): string {
  const today = bangkokToday(now);
  const [y, m, d] = today.split("-").map(Number);
  const afterResult = bangkokMinutesOfDay(now) >= RESULT_READY_MINUTES;
  if (d > 16 || (d === 16 && afterResult)) return isoFromParts(y, m, 16);
  if (d > 1 || (d === 1 && afterResult)) return isoFromParts(y, m, 1);
  // ก่อนผลงวดวันที่ 1 ออก → งวดวันที่ 16 ของเดือนก่อน
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  return isoFromParts(py, pm, 16);
}

function addDays(iso: string, days: number): string {
  const t = new Date(`${iso}T00:00:00Z`).getTime() + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

export type Freshness = "fresh" | "awaiting" | "stale" | "empty";

/**
 * fresh    = มีงวดล่าสุดตามกำหนดแล้ว
 * awaiting = ถึงกำหนดแล้วแต่ยังไม่พบผล และยังอยู่ในระยะผ่อนผัน (งวดอาจเลื่อน)
 * stale    = เลยระยะผ่อนผันแล้วยังไม่มีงวดใหม่ → เตือนผู้ใช้
 */
export function freshness(latestDrawDate: string | null, now: Date = new Date()): {
  state: Freshness;
  expected: string;
} {
  const expected = expectedLatestDrawDate(now);
  if (!latestDrawDate) return { state: "empty", expected };
  if (latestDrawDate >= expected) return { state: "fresh", expected };
  // ยอมรับงวดที่เลื่อนไป 1–2 วันก่อนกำหนด (เช่น 30 ธ.ค. แทน 1 ม.ค.)
  if (latestDrawDate >= addDays(expected, -3)) return { state: "fresh", expected };
  const graceEnd = addDays(expected, STALE_GRACE_DAYS);
  return { state: bangkokToday(now) <= graceEnd ? "awaiting" : "stale", expected };
}

/**
 * วันที่ที่อาจมีการออกรางวัล ระหว่าง (afterIso, untilIso] — ใช้กับแหล่งสำรองที่ค้นได้ทีละวัน
 * แต่ละครึ่งเดือนมีรายการวันที่เรียงตามความน่าจะเป็น หากพบผลแล้วจะข้ามวันที่ที่เหลือของครึ่งนั้น
 */
export function candidateDrawGroups(afterIso: string, untilIso: string): string[][] {
  const groups: string[][] = [];
  const [ay, am] = afterIso.split("-").map(Number);
  let y = ay;
  let m = am;
  for (let guard = 0; guard < 240; guard++) {
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    const firstHalf = [
      isoFromParts(y, m, 1),
      isoFromParts(y, m, 2),
      isoFromParts(y, m, 3),
      isoFromParts(prevY, prevM, 30),
      isoFromParts(prevY, prevM, 31),
    ];
    const secondHalf = [isoFromParts(y, m, 16), isoFromParts(y, m, 17), isoFromParts(y, m, 15)];
    for (const g of [firstHalf, secondHalf]) {
      const valid = g.filter(
        (d) => d > afterIso && d <= untilIso && !Number.isNaN(new Date(`${d}T00:00:00Z`).getTime()) &&
          new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d,
      );
      if (valid.length) groups.push(valid);
    }
    if (isoFromParts(y, m, 1) > untilIso) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return groups;
}

export { addDays };
