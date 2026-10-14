import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse, json, searchParamsObject } from "@/lib/api";
import { toIsoDate } from "@/lib/thai-date";

export const dynamic = "force-dynamic";

const q = z.object({ page: z.coerce.number().int().min(1).max(5000).default(1) });

export async function GET(req: Request) {
  try {
    const { page } = q.parse(searchParamsObject(req));
    const pageSize = 20;
    const [total, logs] = await Promise.all([
      prisma.syncLog.count(),
      prisma.syncLog.findMany({
        orderBy: { startedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { changes: { orderBy: { drawDate: "desc" }, take: 100 } },
      }),
    ]);
    return json({
      total,
      page,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      items: logs.map((l) => ({
        id: l.id,
        sourceName: l.sourceName,
        trigger: l.trigger,
        startedAt: l.startedAt.toISOString(),
        finishedAt: l.finishedAt?.toISOString() ?? null,
        status: l.status,
        recordsAdded: l.recordsAdded,
        recordsUpdated: l.recordsUpdated,
        recordsConflict: l.recordsConflict,
        errorMessage: l.errorMessage,
        details: l.details,
        changes: l.changes.map((c) => ({
          id: c.id,
          drawDate: toIsoDate(c.drawDate),
          action: c.action,
          oldNumber: c.oldNumber,
          newNumber: c.newNumber,
          sourceName: c.sourceName,
          sourceUrl: c.sourceUrl,
          note: c.note,
        })),
      })),
    });
  } catch (e) {
    return errorResponse(e, "sync-logs");
  }
}
