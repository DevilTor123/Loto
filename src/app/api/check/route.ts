import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse, json, searchParamsObject } from "@/lib/api";
import { normalizeDigits, digitsOf, digitSum, oddCount, repeatPattern } from "@/lib/number";
import { getStatsDraws } from "@/lib/data";
import { positionDigitFrequency } from "@/lib/stats";
import { toIsoDate } from "@/lib/thai-date";

export const dynamic = "force-dynamic";

const WIDTH = { full: 6, last2: 2, last3: 3, front3: 3 } as const;
type CheckType = keyof typeof WIDTH;
type PrizeKind = "LAST2" | "FRONT3" | "LAST3";
const KIND: Record<Exclude<CheckType, "full">, PrizeKind> = { last2: "LAST2", last3: "LAST3", front3: "FRONT3" };

const q = z
  .object({
    type: z.enum(["full", "last2", "last3", "front3"]).default("full"),
    number: z.string().max(20).transform(normalizeDigits),
  })
  .superRefine((v, ctx) => {
    const w = WIDTH[v.type];
    if (!new RegExp(`^\\d{${w}}$`).test(v.number)) ctx.addIssue({ code: "custom", path: ["number"], message: `กรอกเลขให้ครบ ${w} หลัก` });
  });

async function prizeHistory(type: PrizeKind, value: string) {
  const [drawDates, hits] = await Promise.all([
    prisma.lotteryDraw.findMany({
      where: { status: { not: "CONFLICT" }, prizes: { some: { prizeType: type } } },
      select: { drawDate: true },
      orderBy: { drawDate: "desc" },
    }),
    prisma.prizeResult.findMany({
      where: { prizeType: type, number: value, draw: { status: { not: "CONFLICT" } } },
      select: { draw: { select: { drawDate: true } } },
      orderBy: { draw: { drawDate: "desc" } },
    }),
  ]);
  const dates = [...new Set(hits.map((h) => toIsoDate(h.draw.drawDate)))];
  const all = drawDates.map((d) => toIsoDate(d.drawDate));
  const drawsSince = dates.length ? all.indexOf(dates[0]) : null;
  return { value, drawsWithData: all.length, count: dates.length, drawsSince, dates: dates.slice(0, 60) };
}

/** ข้อมูลประวัติของหมายเลข — โอกาสในอนาคตคำนวณฝั่งหน้าเว็บจากโครงสร้างรางวัล (เท่ากันทุกหมายเลข) */
export async function GET(req: Request) {
  try {
    const { type, number } = q.parse(searchParamsObject(req));
    const { draws } = await getStatsDraws();

    if (type !== "full") {
      // เทียบกับเลขท้าย/หน้าของรางวัลที่ 1 ด้วย (เป็นข้อมูลประกอบ)
      const part = (n: string) => (type === "front3" ? n.slice(0, 3) : n.slice(6 - WIDTH[type]));
      const firstDates = draws.filter((d) => part(d.number) === number).map((d) => d.drawDate);
      return json({
        type,
        number,
        totalDraws: draws.length,
        prize: await prizeHistory(KIND[type], number),
        firstPrizePart: { count: firstDates.length, dates: firstDates.slice(0, 60) },
      });
    }

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
      type,
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
