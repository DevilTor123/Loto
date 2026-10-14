/**
 * ชั้นข้อมูลฝั่งเซิร์ฟเวอร์: อ่านฐานข้อมูล + แคชสถิติตาม "เวอร์ชันข้อมูล"
 * สถิติจะคำนวณใหม่เมื่อข้อมูลเปลี่ยน (data_version เปลี่ยน) เท่านั้น
 */
import { prisma } from "./db";
import { getDataVersion } from "./meta";
import { computeAll, type Draw, type WindowKey, type StatsResult } from "./stats";
import { freshness } from "./schedule";
import { toIsoDate } from "./thai-date";
import { config } from "./config";
import { LOTTERY_CO_TH } from "./providers/lottery-co-th";
import { GLO } from "./providers/glo";

let drawsCache: { version: string; draws: Draw[] } | null = null;
const statsCache = new Map<string, StatsResult>();

/** งวดที่ใช้คำนวณสถิติได้ (ไม่รวมงวดที่ข้อมูลขัดแย้ง) เรียงใหม่→เก่า */
export async function getStatsDraws(): Promise<{ version: string; draws: Draw[] }> {
  const version = await getDataVersion(prisma);
  if (drawsCache?.version === version) return drawsCache;
  const rows = await prisma.lotteryDraw.findMany({
    where: { status: { not: "CONFLICT" } },
    select: { drawDate: true, firstPrizeNumber: true },
    orderBy: { drawDate: "desc" },
  });
  drawsCache = { version, draws: rows.map((r) => ({ drawDate: toIsoDate(r.drawDate), number: r.firstPrizeNumber })) };
  statsCache.clear();
  return drawsCache;
}

export async function getStats(window: WindowKey, from?: string, to?: string) {
  const { version, draws } = await getStatsDraws();
  const key = `${version}|${window}|${from ?? ""}|${to ?? ""}`;
  let result = statsCache.get(key);
  if (!result) {
    result = computeAll(draws, window, from, to);
    if (statsCache.size > 60) statsCache.clear();
    statsCache.set(key, result);
  }
  return { version, stats: result };
}

export async function getStatus() {
  const [latest, total, byStatus, lastOk, lastAttempt, lastChange] = await Promise.all([
    prisma.lotteryDraw.findFirst({ where: { status: { not: "CONFLICT" } }, orderBy: { drawDate: "desc" } }),
    prisma.lotteryDraw.count(),
    prisma.lotteryDraw.groupBy({ by: ["status"], _count: true }),
    prisma.syncLog.findFirst({
      where: { status: { in: ["SUCCESS", "NO_CHANGE", "PARTIAL"] } },
      orderBy: { finishedAt: "desc" },
    }),
    prisma.syncLog.findFirst({ where: { status: { not: "SKIPPED" } }, orderBy: { startedAt: "desc" } }),
    prisma.syncLog.findFirst({
      where: { OR: [{ recordsAdded: { gt: 0 } }, { recordsUpdated: { gt: 0 } }] },
      orderBy: { finishedAt: "desc" },
    }),
  ]);
  const counts = Object.fromEntries(byStatus.map((s) => [s.status, s._count])) as Record<string, number>;
  const latestIso = latest ? toIsoDate(latest.drawDate) : null;
  const fresh = freshness(latestIso);

  type Attempt = { source: string; ok: boolean; error?: string };
  const attempts = ((lastAttempt?.details as { attempts?: Attempt[] } | null)?.attempts ?? []) as Attempt[];
  const sourceState = (name: string) => {
    const a = attempts.find((x) => x.source === name);
    if (!lastAttempt) return { state: "unknown" as const, error: null };
    if (!a) return { state: "not-used" as const, error: null };
    return { state: a.ok ? ("ok" as const) : ("error" as const), error: a.error ?? null };
  };

  return {
    demoMode: config.demoMode,
    latestDraw: latest
      ? {
          drawDate: latestIso!,
          number: latest.firstPrizeNumber,
          status: latest.status,
          sourceName: latest.sourceName,
          sourceUrl: latest.sourceUrl,
        }
      : null,
    totalDraws: total,
    usableDraws: total - (counts.CONFLICT ?? 0),
    verifiedDraws: counts.VERIFIED ?? 0,
    sourceOnlyDraws: counts.SOURCE_ONLY ?? 0,
    conflictDraws: counts.CONFLICT ?? 0,
    freshness: fresh,
    lastSuccessfulSyncAt: lastOk?.finishedAt?.toISOString() ?? null,
    lastDataChangeAt: lastChange?.finishedAt?.toISOString() ?? null,
    lastAttempt: lastAttempt
      ? {
          id: lastAttempt.id,
          status: lastAttempt.status,
          startedAt: lastAttempt.startedAt.toISOString(),
          finishedAt: lastAttempt.finishedAt?.toISOString() ?? null,
          errorMessage: lastAttempt.errorMessage,
          message: (lastAttempt.details as { message?: string } | null)?.message ?? null,
        }
      : null,
    sources: [
      { name: LOTTERY_CO_TH.name, role: "แหล่งหลัก", url: LOTTERY_CO_TH.previous, ...sourceState(LOTTERY_CO_TH.name) },
      { name: GLO.name, role: "ยืนยันผล / แหล่งสำรอง", url: GLO.homepage, ...sourceState(GLO.name) },
    ],
  };
}

export type AppStatus = Awaited<ReturnType<typeof getStatus>>;
