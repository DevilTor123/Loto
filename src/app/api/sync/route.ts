import { syncNow } from "@/lib/sync";
import { errorResponse, json } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** ปุ่ม "อัปเดตข้อมูล" — จำกัด 3 ครั้ง / 10 นาที ต่อ IP และมี cooldown หลังซิงก์สำเร็จ */
export async function POST(req: Request) {
  try {
    if (config.demoMode) {
      return json(
        { status: "SKIPPED", message: "โหมดสาธิต: ปิดการซิงก์ เพื่อไม่ให้ข้อมูลสาธิตปนกับข้อมูลจริง" },
        { status: 409 },
      );
    }
    const rl = rateLimit(`sync:${clientKey(req)}`, 3, 10 * 60_000);
    if (!rl.ok) {
      return json(
        { status: "SKIPPED", message: `ขอซิงก์บ่อยเกินไป กรุณารอ ${rl.retryAfter} วินาที` },
        { status: 429, headers: { "retry-after": String(rl.retryAfter) } },
      );
    }
    const summary = await syncNow({ trigger: "manual", cooldownSeconds: config.manualCooldownSeconds });
    return json(summary, { status: summary.status === "FAILED" ? 502 : 200 });
  } catch (e) {
    return errorResponse(e, "sync");
  }
}
