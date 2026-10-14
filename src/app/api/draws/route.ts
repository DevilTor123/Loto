import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { errorResponse, json, searchParamsObject } from "@/lib/api";
import { drawsQuerySchema } from "@/lib/schemas";
import { isoToDate, toIsoDate } from "@/lib/thai-date";

export const dynamic = "force-dynamic";

const PRIZE_LABEL = { LAST2: "เลขท้าย 2 ตัว", FRONT3: "เลขหน้า 3 ตัว", LAST3: "เลขท้าย 3 ตัว" } as const;

export async function GET(req: Request) {
  try {
    const q = drawsQuerySchema.parse(searchParamsObject(req));
    const where: Prisma.LotteryDrawWhereInput = {};
    const and: Prisma.LotteryDrawWhereInput[] = [];
    if (q.q) {
      // ค้นหาตรงตัว 6 หลัก หรือบางส่วน (ขึ้นต้น/ลงท้าย/มีอยู่) — ใช้ Prisma (parameterized) ป้องกัน SQL injection
      and.push(q.q.length === 6 ? { firstPrizeNumber: q.q } : { firstPrizeNumber: { contains: q.q } });
    }
    if (q.year) {
      and.push({ drawDate: { gte: isoToDate(`${q.year}-01-01`), lte: isoToDate(`${q.year}-12-31`) } });
    }
    if (q.from) and.push({ drawDate: { gte: isoToDate(q.from) } });
    if (q.to) and.push({ drawDate: { lte: isoToDate(q.to) } });
    if (and.length) where.AND = and;

    const [total, rows, years] = await Promise.all([
      prisma.lotteryDraw.count({ where }),
      prisma.lotteryDraw.findMany({
        where,
        orderBy: { drawDate: "desc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { prizes: { orderBy: [{ prizeType: "asc" }, { position: "asc" }] } },
      }),
      prisma.$queryRaw<{ y: number }[]>`SELECT DISTINCT EXTRACT(YEAR FROM draw_date)::int AS y FROM lottery_draws ORDER BY y DESC`,
    ]);

    return json({
      total,
      page: q.page,
      pageSize: q.pageSize,
      pages: Math.max(1, Math.ceil(total / q.pageSize)),
      query: q.q ?? null,
      years: years.map((r) => r.y),
      items: rows.map((r) => ({
        id: r.id,
        drawDate: toIsoDate(r.drawDate),
        number: r.firstPrizeNumber,
        status: r.status,
        sourceName: r.sourceName,
        sourceUrl: r.sourceUrl,
        verifiedSource: r.verifiedSource,
        conflictNumber: r.conflictNumber,
        conflictSource: r.conflictSource,
        fetchedAt: r.fetchedAt.toISOString(),
        otherPrizes: r.prizes.map((p) => ({ type: p.prizeType, label: PRIZE_LABEL[p.prizeType], number: p.number })),
      })),
    });
  } catch (e) {
    return errorResponse(e, "draws");
  }
}
