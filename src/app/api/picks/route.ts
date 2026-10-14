import { prisma } from "@/lib/db";
import { errorResponse, json } from "@/lib/api";
import { getStatsDraws } from "@/lib/data";
import { hotCold, topDigitsNumber, type PrizeDraw } from "@/lib/stats/picks";
import { toIsoDate } from "@/lib/thai-date";

export const dynamic = "force-dynamic";

async function prizeDraws(type: "LAST2" | "FRONT3" | "LAST3"): Promise<PrizeDraw[]> {
  const rows = await prisma.prizeResult.findMany({
    where: { prizeType: type, draw: { status: { not: "CONFLICT" } } },
    select: { number: true, draw: { select: { drawDate: true } } },
    orderBy: [{ draw: { drawDate: "desc" } }, { position: "asc" }],
  });
  const byDate = new Map<string, string[]>();
  for (const r of rows) {
    const d = toIsoDate(r.draw.drawDate);
    byDate.set(d, [...(byDate.get(d) ?? []), r.number]);
  }
  return [...byDate].map(([drawDate, numbers]) => ({ drawDate, numbers }));
}

/** เลขน่าจับตาตามสถิติในอดีต — ไม่ใช่การทำนาย */
export async function GET() {
  try {
    const { version, draws } = await getStatsDraws();
    const [l2, f3, l3] = await Promise.all([prizeDraws("LAST2"), prizeDraws("FRONT3"), prizeDraws("LAST3")]);
    return json(
      {
        version,
        totalDraws: draws.length,
        first: topDigitsNumber(draws),
        firstSuffix2: hotCold(draws.map((d) => ({ drawDate: d.drawDate, numbers: [d.number.slice(4)] })), 2),
        last2: hotCold(l2, 2),
        front3: hotCold(f3, 3),
        last3: hotCold(l3, 3),
      },
      { headers: { etag: `"picks-${version}"` } },
    );
  } catch (e) {
    return errorResponse(e, "picks");
  }
}
