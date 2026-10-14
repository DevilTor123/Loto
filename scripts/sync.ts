/**
 * ซิงก์จาก command line
 *   npm run sync              — ตรวจงวดใหม่
 *   npm run sync -- --backfill — ดึงย้อนหลังทุกหน้า (ครั้งแรก)
 */
import { syncNow } from "../src/lib/sync";
import { prisma } from "../src/lib/db";

async function main() {
  if (process.env.DEMO_MODE === "true") {
    console.error("DEMO_MODE=true — ไม่ซิงก์ข้อมูลจริงลงฐานข้อมูลสาธิต");
    process.exit(1);
  }
  const backfill = process.argv.includes("--backfill");
  const verifyArg = process.argv.find((a) => a.startsWith("--verify="));
  const summary = await syncNow({
    trigger: backfill ? "backfill" : "cli",
    backfill,
    verifyLimit: verifyArg ? Number(verifyArg.split("=")[1]) : undefined,
  });
  console.log(JSON.stringify(summary, null, 2));
  await prisma.$disconnect();
  process.exit(summary.status === "FAILED" ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
