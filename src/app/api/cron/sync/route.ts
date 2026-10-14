import { timingSafeEqual } from "node:crypto";
import { syncNow } from "@/lib/sync";
import { errorResponse, json } from "@/lib/api";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // ใช้ได้กับ Vercel แผนฟรี (Hobby)

function authorized(req: Request): boolean {
  if (!config.cronSecret) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${config.cronSecret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Endpoint สำหรับ Scheduled Task (Vercel Cron / GitHub Actions / cron ภายนอก)
 * ต้องส่ง Authorization: Bearer $CRON_SECRET
 */
async function handle(req: Request) {
  if (!authorized(req)) return json({ error: "unauthorized" }, { status: 401 });
  if (config.demoMode) return json({ status: "SKIPPED", message: "demo mode" });
  try {
    const backfill = new URL(req.url).searchParams.get("backfill") === "1";
    const summary = await syncNow({ trigger: backfill ? "backfill" : "cron", backfill });
    return json(summary, { status: summary.status === "FAILED" ? 502 : 200 });
  } catch (e) {
    return errorResponse(e, "cron.sync");
  }
}

export const GET = handle; // Vercel Cron เรียกด้วย GET
export const POST = handle;
