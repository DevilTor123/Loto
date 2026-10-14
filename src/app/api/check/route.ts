import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse, json, searchParamsObject } from "@/lib/api";
import { normalizeDigits, digitsOf, digitSum, oddCount, repeatPattern } from "@/lib/number";
import { getStatsDraws } from "@/lib/data";
import { positionDigitFrequency } from "@/lib/stats";
import { toIsoDate } from "@/lib/thai-date";

export const dynamic = "force-dynamic";

const q = z.object({
  number: z.string().max(20).transform(normalizeDigits).pipe(z.string().regex(/^\d{6}$/, "กรอกเลขให้ครบ 6 หลัก")),
});

async function prizeHistory(type: "LAST2" | "FRONT3" | "LAST3", value: string) {
  const [drawsWithData, hits] = await Promise.all([
    prisma.prizeResult.groupBy({ by: ["drawId"], where: { prizeType: type } }).then((r) => r.length),
    prisma.prizeResult.findMany({
      where: { prizeType: type, number: value, draw: { status: { not: "CONFLICT" } } },
      select: { draw: { select: { drawDate: true } } },
      orderBy: { draw: { drawDate: "desc" } },
    }),
  ]);
  const dates = [...new Set(hits.map((h) => toIsoDate(h.draw.drawDate)))];
  return { value, drawsWithData, count: dates.length, dates: dates.slice(0, 20) };
}

/** ข้อมูลประวัติของหมายเลข — โอกาสในอนาคตคำนวณฝั่งหน้าเว็บจากโครงสร้างรางวัล (เท่ากันทุกหมายเลข) */
export async function GET(req: Request) {
  try {
    const { number } = q.parse(searchParamsObject(req));
    const { draws } = await getStatsDraws();
    const firstDates = draws.filter((d) => d.number === number).map((d) => d.drawDate);
    const pos = positionDigitFrequency(draws);
    const digits = digitsOf(number);
    const sameProfile = draws.filter(
      (d) => oddCount(d.number) === oddCount(number) && repeatPattern(d.number) === repeatPattern(number),
    ).length;
    const [last2, front3, last3] = await Promise.all([
      prizeHistory("LAST2", number.slice(4)),
      prizeHistory("FRONT3", number.slice(0, 3)),
      prizeHistory("LAST3", number.slice(3)),
    ]);
    return json({
      number,
      totalDraws: draws.length,
      firstPrize: { count: firstDates.length, dates: firstDates },
      last2,
      front3,
      last3,
      positions: digits.map((d, i) => ({ digit: d, count: pos[i]?.digits[d]?.count ?? 0, pct: pos[i]?.digits[d]?.pct ?? 0 })),
      profile: {
        oddCount: oddCount(number),
        digitSum: digitSum(number),
        repeatPattern: repeatPattern(number),
        sameProfileCount: sameProfile,
      },
    });
  } catch (e) {
    return errorResponse(e, "check");
  }
}
