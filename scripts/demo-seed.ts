/**
 * สร้างข้อมูล "สาธิต" ในฐานข้อมูลแยก — ไม่ใช่ผลสลากจริง
 *   DEMO_MODE=true DATABASE_URL=.../lotto_demo npm run demo:seed
 *
 * ป้องกันการปนกับข้อมูลจริง:
 *   - ต้องตั้ง DEMO_MODE=true
 *   - ชื่อฐานข้อมูลใน DATABASE_URL ต้องมีคำว่า "demo"
 *   - ทุกงวดมี source_name = "demo-generator" และ source_url ชี้ไปหน้า About
 * หมายเลขสร้างด้วย crypto.getRandomValues แบบเท่ากันทุกหมายเลข
 */
import { PrismaClient } from "@prisma/client";
import { randomInt, uniformNumber } from "../src/lib/random";
import { isoToDate } from "../src/lib/thai-date";

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const dbName = new URL(url).pathname.slice(1);
  if (process.env.DEMO_MODE !== "true" || !/demo/i.test(dbName)) {
    console.error("ปฏิเสธ: ต้องตั้ง DEMO_MODE=true และใช้ฐานข้อมูลที่ชื่อมีคำว่า demo");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  await prisma.$transaction([
    prisma.drawChange.deleteMany(),
    prisma.syncLog.deleteMany(),
    prisma.prizeResult.deleteMany(),
    prisma.lotteryDraw.deleteMany(),
  ]);

  // วันที่งวดตามกำหนดปกติ (1 และ 16) ย้อนหลัง ~10 ปี
  const dates: string[] = [];
  for (let y = 2016; y <= 2026; y++)
    for (let m = 1; m <= 12; m++)
      for (const d of [1, 16]) {
        const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        if (iso <= "2026-10-01") dates.push(iso);
      }

  const numbers = dates.map(() => uniformNumber());
  // ใส่หมายเลขซ้ำ 3 คู่ เพื่อสาธิตการแสดงผล "หมายเลขที่ปรากฏซ้ำ"
  numbers[20] = numbers[150];
  numbers[60] = numbers[200];
  numbers[90] = numbers[230];

  const now = new Date();
  const log = await prisma.syncLog.create({
    data: {
      sourceName: "demo-generator",
      trigger: "cli",
      status: "SUCCESS",
      finishedAt: now,
      recordsAdded: dates.length,
      details: { attempts: [], message: "สร้างข้อมูลสาธิต (ไม่ใช่ผลจริง)" },
    },
  });
  for (let i = 0; i < dates.length; i++) {
    await prisma.lotteryDraw.create({
      data: {
        drawDate: isoToDate(dates[i]),
        firstPrizeNumber: numbers[i],
        status: "SOURCE_ONLY",
        sourceName: "demo-generator",
        sourceUrl: "http://localhost:3000/about#demo",
        fetchedAt: now,
        // เลขหน้า/ท้าย 3 ตัว (2 ชุด) และเลขท้าย 2 ตัว — สุ่มเช่นกัน
        prizes: {
          create: [
            ...[0, 1].map((position) => ({ prizeType: "FRONT3" as const, position, number: String(randomInt(1000)).padStart(3, "0") })),
            ...[0, 1].map((position) => ({ prizeType: "LAST3" as const, position, number: String(randomInt(1000)).padStart(3, "0") })),
            { prizeType: "LAST2" as const, position: 0, number: String(randomInt(100)).padStart(2, "0") },
          ],
        },
      },
    });
  }
  await prisma.drawChange.create({
    data: {
      syncLogId: log.id,
      drawDate: isoToDate(dates.at(-1)!),
      action: "ADDED",
      newNumber: numbers.at(-1)!,
      sourceName: "demo-generator",
      note: `สร้างข้อมูลสาธิต ${dates.length} งวด`,
    },
  });
  await prisma.appMeta.upsert({
    where: { key: "data_version" },
    create: { key: "data_version", value: `${Date.now()}` },
    update: { value: `${Date.now()}` },
  });
  console.log(`seeded ${dates.length} DEMO draws into ${dbName}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
