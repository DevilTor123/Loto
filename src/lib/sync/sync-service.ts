/**
 * ระบบซิงก์ข้อมูล: แหล่งหลัก → (ล้มเหลว) แหล่งสำรอง → (ล้มเหลว) ใช้ข้อมูลเดิมพร้อมคำเตือน
 *
 * กฎสำคัญ
 *  - ไม่เพิ่มงวดซ้ำ: draw_date เป็น Unique Constraint และตรวจซ้ำก่อนบันทึก
 *  - ไม่เขียนทับหมายเลขเดิมเงียบ ๆ: หากแหล่งข้อมูลขัดแย้ง ให้สถานะ CONFLICT (รอตรวจสอบ)
 *  - ทุกงวดผ่าน Zod ก่อนบันทึก และบันทึก source_url / fetched_at / verified_source
 *  - ทุกการเปลี่ยนแปลงบันทึกใน draw_changes เพื่อให้ตรวจย้อนหลังได้
 */
import type { PrismaClient, LotteryDraw, PrizeType } from "@prisma/client";
import { providerDrawSchema, type ProviderDraw } from "../schemas";
import type { DateLookupProvider, ListingProvider } from "../providers/types";
import { bumpDataVersion } from "../meta";
import { bangkokToday, candidateDrawGroups, addDays } from "../schedule";
import { isoToDate, toIsoDate } from "../thai-date";
import { logger } from "../logger";

export type SyncTrigger = "cron" | "manual" | "cli" | "backfill";

export interface SyncOptions {
  trigger: SyncTrigger;
  /** ดึงทุกหน้าของแหล่งหลัก (ใช้ครั้งแรก) */
  backfill?: boolean;
  /** จำนวนงวดสูงสุดที่จะยืนยันกับ GLO ต่อการซิงก์ 1 ครั้ง */
  verifyLimit?: number;
  /** ข้ามการซิงก์ถ้าซิงก์สำเร็จภายใน N วินาทีที่ผ่านมา (กันกดซ้ำ) */
  cooldownSeconds?: number;
}

export interface SyncDeps {
  prisma: PrismaClient;
  primary: ListingProvider;
  secondary: DateLookupProvider;
  now?: () => Date;
}

interface SourceAttempt {
  source: string;
  ok: boolean;
  pages?: number;
  draws?: number;
  error?: string;
  durationMs: number;
}

export interface SyncSummary {
  syncLogId: number | null;
  status: "SUCCESS" | "NO_CHANGE" | "PARTIAL" | "FAILED" | "SKIPPED";
  added: number;
  updated: number;
  conflicts: number;
  verified: number;
  attempts: SourceAttempt[];
  message: string;
}

const MAX_PAGES = 40;
const STALE_RUNNING_MINUTES = 10;

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

export async function runSync(opts: SyncOptions, deps: SyncDeps): Promise<SyncSummary> {
  const { prisma, primary, secondary } = deps;
  const now = deps.now ?? (() => new Date());
  const verifyLimit = opts.verifyLimit ?? Number(process.env.VERIFY_MAX_PER_RUN ?? 12);

  // ---- กันการซิงก์ซ้อนกัน / กดซ้ำถี่เกินไป ----
  const running = await prisma.syncLog.findFirst({
    where: {
      status: "RUNNING",
      startedAt: { gt: new Date(now().getTime() - STALE_RUNNING_MINUTES * 60_000) },
    },
  });
  if (running) {
    return skipped("มีการซิงก์อื่นกำลังทำงานอยู่ กรุณาลองใหม่ภายหลัง");
  }
  if (opts.cooldownSeconds) {
    const recent = await prisma.syncLog.findFirst({
      where: {
        status: { in: ["SUCCESS", "NO_CHANGE"] },
        finishedAt: { gt: new Date(now().getTime() - opts.cooldownSeconds * 1000) },
      },
    });
    if (recent) return skipped("เพิ่งซิงก์สำเร็จไปเมื่อสักครู่ ข้อมูลยังเป็นชุดล่าสุดที่ตรวจพบ");
  }

  const log = await prisma.syncLog.create({
    data: { sourceName: primary.name, trigger: opts.trigger, status: "RUNNING", startedAt: now() },
  });

  const attempts: SourceAttempt[] = [];
  const counters = { added: 0, updated: 0, conflicts: 0, verified: 0 };
  let primaryOk = false;
  let secondaryOk = false;
  let fatal: string | null = null;

  try {
    const existing = await prisma.lotteryDraw.findMany({ select: { drawDate: true } });
    const known = new Set(existing.map((d) => toIsoDate(d.drawDate)));
    const fullFetch = Boolean(opts.backfill) || known.size === 0;

    // ---- 1) แหล่งหลัก ----
    let incoming: ProviderDraw[] = [];
    const t0 = Date.now();
    let pages = 0;
    try {
      let totalPages = MAX_PAGES;
      for (let page = 1; page <= totalPages; page++) {
        let res;
        try {
          res = await primary.fetchPage(page);
        } catch (e) {
          if (page === 1) throw e;
          // หน้าถัด ๆ ไปล้มเหลว: เก็บเท่าที่ได้ และบันทึกข้อผิดพลาด
          attempts.push({ source: primary.name, ok: false, error: `หน้า ${page}: ${errMsg(e)}`, durationMs: 0 });
          break;
        }
        pages++;
        if (res.totalPages) totalPages = Math.min(res.totalPages, MAX_PAGES);
        incoming.push(...res.draws);
        // โหมดปกติ: หยุดเมื่อเจองวดที่มีอยู่แล้ว (งวดใหม่อยู่หน้าแรกเสมอ)
        if (!fullFetch && res.draws.some((d) => known.has(d.drawDate))) break;
      }
      primaryOk = true;
      attempts.unshift({ source: primary.name, ok: true, pages, draws: incoming.length, durationMs: Date.now() - t0 });
    } catch (e) {
      attempts.unshift({ source: primary.name, ok: false, error: errMsg(e), durationMs: Date.now() - t0 });
      logger.warn("sync.primary_failed", { error: errMsg(e) });
      incoming = [];
    }

    // ---- 2) แหล่งสำรอง เมื่อแหล่งหลักล้มเหลว ----
    if (!primaryOk) {
      const t1 = Date.now();
      try {
        const latest = [...known].sort().at(-1) ?? addDays(bangkokToday(now()), -120);
        const groups = candidateDrawGroups(latest, bangkokToday(now()));
        let found = 0;
        let lookups = 0;
        for (const group of groups) {
          for (const date of group) {
            lookups++;
            const draw = await secondary.fetchByDate(date);
            if (draw) {
              incoming.push(draw);
              found++;
              break;
            }
          }
        }
        secondaryOk = true;
        attempts.push({ source: secondary.name, ok: true, pages: lookups, draws: found, durationMs: Date.now() - t1 });
      } catch (e) {
        attempts.push({ source: secondary.name, ok: false, error: errMsg(e), durationMs: Date.now() - t1 });
        logger.warn("sync.secondary_failed", { error: errMsg(e) });
      }
    }

    // ---- 3) ตรวจสอบและบันทึก (จากเก่าไปใหม่) ----
    const byDate = new Map<string, ProviderDraw>();
    for (const d of incoming) {
      const v = providerDrawSchema.safeParse(d);
      if (!v.success) {
        attempts.push({ source: d.sourceName, ok: false, error: `ข้อมูลไม่ผ่านการตรวจสอบ (${d.drawDate})`, durationMs: 0 });
        continue;
      }
      const prev = byDate.get(v.data.drawDate);
      if (prev && prev.firstPrize !== v.data.firstPrize) {
        // แหล่งเดียวกันรายงาน 2 ค่าในงวดเดียว → ไม่บันทึก
        attempts.push({ source: d.sourceName, ok: false, error: `ข้อมูลซ้ำแต่ไม่ตรงกันในงวด ${d.drawDate}`, durationMs: 0 });
        byDate.delete(v.data.drawDate);
        continue;
      }
      byDate.set(v.data.drawDate, v.data);
    }
    const ordered = [...byDate.values()].sort((a, b) => a.drawDate.localeCompare(b.drawDate));

    let verifyBudget = verifyLimit;
    let gloReachable = true;
    for (const draw of ordered) {
      const current = await prisma.lotteryDraw.findUnique({ where: { drawDate: isoToDate(draw.drawDate) } });
      if (!current) {
        // งวดใหม่: ยืนยันกับ GLO (ถ้ามาจากแหล่งอื่น และยังมีโควตา)
        let status: "VERIFIED" | "SOURCE_ONLY" | "CONFLICT" = draw.sourceName === secondary.name ? "VERIFIED" : "SOURCE_ONLY";
        let verifiedSource: string | null = draw.sourceName === secondary.name ? secondary.name : null;
        let conflictNumber: string | null = null;
        let note: string | undefined;
        if (status === "SOURCE_ONLY" && gloReachable && verifyBudget > 0) {
          verifyBudget--;
          const check = await verifyWith(secondary, draw.drawDate, draw.firstPrize);
          if (check.kind === "error") {
            gloReachable = false;
            note = `ยืนยันกับ ${secondary.name} ไม่ได้: ${check.error}`;
          } else if (check.kind === "match") {
            status = "VERIFIED";
            verifiedSource = secondary.name;
            counters.verified++;
          } else if (check.kind === "mismatch") {
            status = "CONFLICT";
            conflictNumber = check.number;
            note = `${secondary.name} รายงาน ${check.number}`;
          } else {
            note = `${secondary.name} ไม่พบผลของวันที่นี้`;
          }
        }
        const fetchedAt = now();
        await prisma.$transaction(async (tx) => {
          const created = await tx.lotteryDraw.create({
            data: {
              drawDate: isoToDate(draw.drawDate),
              firstPrizeNumber: draw.firstPrize,
              status,
              sourceName: draw.sourceName,
              sourceUrl: draw.sourceUrl,
              verifiedSource,
              verifiedAt: verifiedSource ? fetchedAt : null,
              conflictNumber,
              conflictSource: conflictNumber ? secondary.name : null,
              fetchedAt,
            },
          });
          const prizes = prizeRows(draw);
          if (prizes.length) {
            await tx.prizeResult.createMany({
              data: prizes.map((p) => ({ ...p, drawId: created.id })),
              skipDuplicates: true,
            });
          }
          await tx.drawChange.create({
            data: {
              syncLogId: log.id,
              drawDate: isoToDate(draw.drawDate),
              action: status === "CONFLICT" ? "CONFLICT" : "ADDED",
              newNumber: draw.firstPrize,
              sourceName: draw.sourceName,
              sourceUrl: draw.sourceUrl,
              note,
            },
          });
        });
        counters.added++;
        if (status === "CONFLICT") counters.conflicts++;
        continue;
      }

      if (current.firstPrizeNumber === draw.firstPrize) {
        // ข้อมูลตรงกัน: ถ้ามาจากอีกแหล่ง ให้ถือเป็นการยืนยัน
        if (current.status === "SOURCE_ONLY" && draw.sourceName !== current.sourceName) {
          await markVerified(prisma, log.id, current, draw.sourceName);
          counters.verified++;
          counters.updated++;
        }
        continue;
      }

      // ข้อมูลไม่ตรงกับที่บันทึกไว้ → รอตรวจสอบ ไม่เขียนทับ
      if (current.status !== "CONFLICT" || current.conflictNumber !== draw.firstPrize) {
        await prisma.$transaction([
          prisma.lotteryDraw.update({
            where: { id: current.id },
            data: { status: "CONFLICT", conflictNumber: draw.firstPrize, conflictSource: draw.sourceName },
          }),
          prisma.drawChange.create({
            data: {
              syncLogId: log.id,
              drawDate: current.drawDate,
              action: "CONFLICT",
              oldNumber: current.firstPrizeNumber,
              newNumber: draw.firstPrize,
              sourceName: draw.sourceName,
              sourceUrl: draw.sourceUrl,
              note: "แหล่งข้อมูลรายงานหมายเลขต่างจากที่บันทึกไว้ — รอตรวจสอบ",
            },
          }),
        ]);
        counters.updated++;
        counters.conflicts++;
      }
    }

    // ---- 4) ทยอยยืนยันงวดเก่าที่ยังมาจากแหล่งเดียว ----
    if (gloReachable && verifyBudget > 0 && (primaryOk || secondaryOk)) {
      const backlog = await prisma.lotteryDraw.findMany({
        where: { status: "SOURCE_ONLY", sourceName: { not: secondary.name } },
        orderBy: { drawDate: "desc" },
        take: verifyBudget,
      });
      for (const draw of backlog) {
        const iso = toIsoDate(draw.drawDate);
        const check = await verifyWith(secondary, iso, draw.firstPrizeNumber);
        if (check.kind === "error") break;
        if (check.kind === "match") {
          await markVerified(prisma, log.id, draw, secondary.name);
          counters.verified++;
          counters.updated++;
        } else if (check.kind === "mismatch") {
          await prisma.$transaction([
            prisma.lotteryDraw.update({
              where: { id: draw.id },
              data: { status: "CONFLICT", conflictNumber: check.number, conflictSource: secondary.name },
            }),
            prisma.drawChange.create({
              data: {
                syncLogId: log.id,
                drawDate: draw.drawDate,
                action: "CONFLICT",
                oldNumber: draw.firstPrizeNumber,
                newNumber: check.number,
                sourceName: secondary.name,
                note: "GLO รายงานหมายเลขต่างกัน — รอตรวจสอบ",
              },
            }),
          ]);
          counters.updated++;
          counters.conflicts++;
        }
      }
    }

    if (counters.added + counters.updated > 0) await bumpDataVersion(prisma);
  } catch (e) {
    fatal = errMsg(e);
    logger.error("sync.fatal", { error: fatal });
  }

  // ---- 5) สรุปผล ----
  let status: SyncSummary["status"];
  let message: string;
  const changed = counters.added + counters.updated;
  const errorsInAttempts = attempts.filter((a) => !a.ok);
  if (fatal || (!primaryOk && !secondaryOk)) {
    status = "FAILED";
    message = fatal
      ? `เกิดข้อผิดพลาดระหว่างซิงก์: ${fatal}`
      : "เชื่อมต่อแหล่งข้อมูลไม่ได้ทุกแหล่ง — แสดงข้อมูลล่าสุดที่บันทึกไว้ ซึ่งอาจยังไม่เป็นปัจจุบัน";
  } else if (!primaryOk || errorsInAttempts.length > 0) {
    status = "PARTIAL";
    message = `${!primaryOk ? "แหล่งหลักล้มเหลว ใช้แหล่งสำรองแทน" : "ซิงก์ได้บางส่วน"} — เพิ่ม ${counters.added} งวด, แก้ไข/ยืนยัน ${counters.updated} งวด`;
  } else if (changed > 0) {
    status = "SUCCESS";
    message = `เพิ่ม ${counters.added} งวดใหม่, ยืนยัน/แก้ไข ${counters.updated} งวด`;
  } else {
    status = "NO_CHANGE";
    message = "ตรวจสอบแหล่งข้อมูลแล้ว ยังไม่มีงวดใหม่";
  }
  if (counters.conflicts > 0) message += ` (พบข้อมูลขัดแย้ง ${counters.conflicts} งวด — รอตรวจสอบ)`;

  await prisma.syncLog.update({
    where: { id: log.id },
    data: {
      status,
      finishedAt: now(),
      sourceName: primaryOk ? primary.name : secondaryOk ? secondary.name : primary.name,
      recordsAdded: counters.added,
      recordsUpdated: counters.updated,
      recordsConflict: counters.conflicts,
      errorMessage:
        status === "FAILED" || status === "PARTIAL"
          ? [fatal, ...errorsInAttempts.map((a) => `${a.source}: ${a.error}`)].filter(Boolean).join(" | ")
          : null,
      details: { attempts, verified: counters.verified, message } as object,
    },
  });
  logger.info("sync.done", { status, ...counters });
  return { syncLogId: log.id, status, ...counters, attempts, message };
}

function skipped(message: string): SyncSummary {
  return { syncLogId: null, status: "SKIPPED", added: 0, updated: 0, conflicts: 0, verified: 0, attempts: [], message };
}

type VerifyResult =
  | { kind: "match" }
  | { kind: "mismatch"; number: string }
  | { kind: "missing" }
  | { kind: "error"; error: string };

async function verifyWith(provider: DateLookupProvider, iso: string, expected: string): Promise<VerifyResult> {
  try {
    const r = await provider.fetchByDate(iso);
    if (!r) return { kind: "missing" };
    return r.firstPrize === expected ? { kind: "match" } : { kind: "mismatch", number: r.firstPrize };
  } catch (e) {
    return { kind: "error", error: errMsg(e) };
  }
}

async function markVerified(prisma: PrismaClient, syncLogId: number, draw: LotteryDraw, source: string) {
  const at = new Date();
  await prisma.$transaction([
    prisma.lotteryDraw.update({
      where: { id: draw.id },
      data: { status: "VERIFIED", verifiedSource: source, verifiedAt: at },
    }),
    prisma.drawChange.create({
      data: {
        syncLogId,
        drawDate: draw.drawDate,
        action: "VERIFIED",
        oldNumber: draw.firstPrizeNumber,
        newNumber: draw.firstPrizeNumber,
        sourceName: source,
        note: `ยืนยันตรงกับ ${source}`,
      },
    }),
  ]);
}

function prizeRows(d: ProviderDraw): { prizeType: PrizeType; number: string; position: number }[] {
  const rows: { prizeType: PrizeType; number: string; position: number }[] = [];
  if (d.last2) rows.push({ prizeType: "LAST2", number: d.last2, position: 0 });
  d.front3?.forEach((n, i) => rows.push({ prizeType: "FRONT3", number: n, position: i }));
  d.last3?.forEach((n, i) => rows.push({ prizeType: "LAST3", number: n, position: i }));
  return rows;
}
