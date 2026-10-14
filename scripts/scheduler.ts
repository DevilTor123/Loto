/**
 * Scheduled worker สำหรับเซิร์ฟเวอร์ที่รันต่อเนื่อง (VPS / Docker) — ใช้แทน Cron ภายนอกได้
 *   npm run scheduler
 *
 * - ตรวจทุก SYNC_INTERVAL_MINUTES (ค่าเริ่มต้น 45 นาที)
 * - วันออกรางวัล (1, 2, 16, 17, 30 ธ.ค.) ช่วง 14:30–18:30 น. เวลาไทย ตรวจถี่ขึ้นทุก 10 นาที
 * ทำงานฝั่งเซิร์ฟเวอร์เท่านั้น (ไม่ใช่ setInterval บนหน้าเว็บ)
 */
import { syncNow } from "../src/lib/sync";

const BASE_MINUTES = Number(process.env.SYNC_INTERVAL_MINUTES ?? 45);
const DRAW_DAY_MINUTES = 10;

function inDrawWindow(now = new Date()): boolean {
  const b = new Date(now.getTime() + 7 * 3600_000);
  const day = b.getUTCDate();
  const month = b.getUTCMonth() + 1;
  const minutes = b.getUTCHours() * 60 + b.getUTCMinutes();
  const drawDay = [1, 2, 16, 17].includes(day) || (month === 12 && day === 30);
  return drawDay && minutes >= 14 * 60 + 30 && minutes <= 18 * 60 + 30;
}

async function tick() {
  try {
    const s = await syncNow({ trigger: "cron" });
    console.log(new Date().toISOString(), s.status, s.message);
  } catch (e) {
    console.error(new Date().toISOString(), "sync error", e);
  }
  const next = inDrawWindow() ? DRAW_DAY_MINUTES : BASE_MINUTES;
  setTimeout(tick, next * 60_000);
}

console.log(`scheduler started: every ${BASE_MINUTES} min (draw window: ${DRAW_DAY_MINUTES} min)`);
void tick();
