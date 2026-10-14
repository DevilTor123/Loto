/**
 * Integration tests: ระบบซิงก์ + PostgreSQL จริง (ฐานข้อมูลทดสอบแยก)
 * ต้องมี PostgreSQL และตั้ง TEST_DATABASE_URL (ค่าเริ่มต้น lotto_test บน localhost)
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { runSync } from "@/lib/sync/sync-service";
import { getDataVersion } from "@/lib/meta";
import { isoToDate } from "@/lib/thai-date";
import { FakeGlo, FakeListing, draw, migrate, resetDb, testPrisma } from "./helpers";

const prisma = testPrisma();
const now = () => new Date("2026-10-14T12:00:00Z");

beforeAll(() => migrate());
beforeEach(() => resetDb(prisma));
afterAll(() => prisma.$disconnect());

const page1 = [draw("2026-10-01", "402701"), draw("2026-09-16", "730640"), draw("2026-08-16", "004615")];
const page2 = [draw("2026-08-01", "932479"), draw("2026-07-16", "000123")];

describe("การดึงข้อมูลครั้งแรก", () => {
  it("ดึงทุกหน้าเมื่อฐานข้อมูลว่าง บันทึกครบ และรักษาเลข 0 นำหน้า", async () => {
    const primary = new FakeListing([page1, page2]);
    const glo = new FakeGlo({ "2026-10-01": "402701", "2026-09-16": "730640" });
    const s = await runSync({ trigger: "cli", verifyLimit: 2 }, { prisma, primary, secondary: glo, now });

    expect(s.status).toBe("SUCCESS");
    expect(s.added).toBe(5);
    expect(primary.calls).toEqual([1, 2]);
    const rows = await prisma.lotteryDraw.findMany({ orderBy: { drawDate: "asc" } });
    expect(rows.map((r) => r.firstPrizeNumber)).toEqual(["000123", "932479", "004615", "730640", "402701"]);
    // ตรวจในระดับ SQL ว่าเก็บเป็นข้อความ ไม่ใช่ตัวเลข
    const raw = await prisma.$queryRaw<{ n: string }[]>`SELECT first_prize_number AS n FROM lottery_draws WHERE draw_date = '2026-07-16'`;
    expect(raw[0].n).toBe("000123");
    expect(rows.every((r) => r.sourceUrl.startsWith("https://") && r.fetchedAt)).toBe(true);

    const log = await prisma.syncLog.findUniqueOrThrow({ where: { id: s.syncLogId! } });
    expect(log.status).toBe("SUCCESS");
    expect(log.recordsAdded).toBe(5);
    expect(await prisma.drawChange.count({ where: { syncLogId: log.id, action: "ADDED" } })).toBe(5);
  });

  it("ยืนยันกับ GLO ตามโควตา: ตรงกัน → VERIFIED, ที่เหลือ → SOURCE_ONLY", async () => {
    const glo = new FakeGlo({ "2026-07-16": "000123", "2026-08-01": "932479" });
    await runSync({ trigger: "cli", verifyLimit: 2 }, { prisma, primary: new FakeListing([page1, page2]), secondary: glo, now });
    const verified = await prisma.lotteryDraw.findMany({ where: { status: "VERIFIED" } });
    expect(verified.map((v) => v.firstPrizeNumber).sort()).toEqual(["000123", "932479"]);
    expect(verified.every((v) => v.verifiedSource === "glo.or.th" && v.verifiedAt)).toBe(true);
    expect(await prisma.lotteryDraw.count({ where: { status: "SOURCE_ONLY" } })).toBe(3);
  });
});

describe("การป้องกันข้อมูลซ้ำ", () => {
  it("ซิงก์ซ้ำไม่เพิ่มงวดเดิม และรายงาน NO_CHANGE", async () => {
    const deps = { prisma, primary: new FakeListing([page1, page2]), secondary: new FakeGlo({}), now };
    await runSync({ trigger: "cli", verifyLimit: 0 }, deps);
    const v1 = await getDataVersion(prisma);
    const s2 = await runSync({ trigger: "cli", verifyLimit: 0 }, deps);
    expect(s2.status).toBe("NO_CHANGE");
    expect(s2.added).toBe(0);
    expect(await prisma.lotteryDraw.count()).toBe(5);
    expect(await getDataVersion(prisma)).toBe(v1); // ไม่มีการเปลี่ยนแปลง → แคชสถิติไม่ถูกล้าง
  });

  it("Unique constraint ระดับฐานข้อมูลบน draw_date", async () => {
    const data = {
      drawDate: isoToDate("2026-10-01"),
      firstPrizeNumber: "402701",
      sourceName: "test",
      sourceUrl: "https://example.com",
      fetchedAt: new Date(),
    };
    await prisma.lotteryDraw.create({ data });
    await expect(prisma.lotteryDraw.create({ data: { ...data, firstPrizeNumber: "111111" } })).rejects.toThrow();
  });

  it("งวดใหม่บนหน้าแรก: เพิ่มเฉพาะงวดใหม่ และหยุดอ่านเมื่อเจองวดที่มีอยู่", async () => {
    await runSync({ trigger: "cli", verifyLimit: 0 }, { prisma, primary: new FakeListing([page1, page2]), secondary: new FakeGlo({}), now });
    const v1 = await getDataVersion(prisma);
    const primary = new FakeListing([[draw("2026-10-16", "090807"), ...page1], page2]);
    const s = await runSync({ trigger: "cron", verifyLimit: 0 }, { prisma, primary, secondary: new FakeGlo({}), now });
    expect(s.status).toBe("SUCCESS");
    expect(s.added).toBe(1);
    expect(primary.calls).toEqual([1]);
    expect(await prisma.lotteryDraw.count()).toBe(6);
    expect(await getDataVersion(prisma)).not.toBe(v1);
  });

  it("แหล่งเดียวกันรายงานงวดซ้ำในชุดเดียวด้วยเลขต่างกัน → ไม่บันทึกงวดนั้น", async () => {
    const primary = new FakeListing([[draw("2026-10-01", "402701"), draw("2026-10-01", "999999"), draw("2026-09-16", "730640")]]);
    const s = await runSync({ trigger: "cli", verifyLimit: 0 }, { prisma, primary, secondary: new FakeGlo({}), now });
    expect(s.status).toBe("PARTIAL");
    expect(await prisma.lotteryDraw.count()).toBe(1);
  });
});

describe("ข้อมูลขัดแย้ง", () => {
  it("GLO รายงานต่างจากแหล่งหลัก → CONFLICT ไม่เลือกเลขเอง และไม่นับในสถิติ", async () => {
    const glo = new FakeGlo({ "2026-10-01": "402702" });
    const s = await runSync({ trigger: "cli", verifyLimit: 5 }, { prisma, primary: new FakeListing([page1]), secondary: glo, now });
    expect(s.conflicts).toBe(1);
    const row = await prisma.lotteryDraw.findUniqueOrThrow({ where: { drawDate: isoToDate("2026-10-01") } });
    expect(row.status).toBe("CONFLICT");
    expect(row.conflictNumber).toBe("402702");
    expect(s.message).toContain("รอตรวจสอบ");
  });

  it("งวดที่มีอยู่แล้วถูกรายงานเลขใหม่ → ไม่เขียนทับ แต่ตั้งสถานะ CONFLICT พร้อม audit", async () => {
    await runSync({ trigger: "cli", verifyLimit: 0 }, { prisma, primary: new FakeListing([page1]), secondary: new FakeGlo({}), now });
    const changed = [draw("2026-10-01", "402701"), draw("2026-09-16", "730641"), draw("2026-08-16", "004615")];
    const s = await runSync({ trigger: "cli", verifyLimit: 0, backfill: true }, { prisma, primary: new FakeListing([changed]), secondary: new FakeGlo({}), now });
    expect(s.conflicts).toBe(1);
    const row = await prisma.lotteryDraw.findUniqueOrThrow({ where: { drawDate: isoToDate("2026-09-16") } });
    expect(row.firstPrizeNumber).toBe("730640");
    expect(row.status).toBe("CONFLICT");
    const change = await prisma.drawChange.findFirstOrThrow({ where: { action: "CONFLICT" } });
    expect(change).toMatchObject({ oldNumber: "730640", newNumber: "730641" });
  });
});

describe("กรณีแหล่งข้อมูลล้มเหลว", () => {
  it("แหล่งหลักล้มเหลว → ใช้ GLO เป็นแหล่งสำรอง (PARTIAL) และบันทึกเป็น VERIFIED จาก GLO", async () => {
    await runSync({ trigger: "cli", verifyLimit: 0 }, { prisma, primary: new FakeListing([page1.slice(1)]), secondary: new FakeGlo({}), now });
    const glo = new FakeGlo({ "2026-10-01": "402701" });
    const s = await runSync(
      { trigger: "cron" },
      { prisma, primary: new FakeListing([new Error("HTTP 503")]), secondary: glo, now },
    );
    expect(s.status).toBe("PARTIAL");
    expect(s.added).toBe(1);
    expect(s.attempts[0]).toMatchObject({ source: "lottery.co.th", ok: false });
    expect(glo.calls[0]).toBe("2026-09-17");
    expect(glo.calls).toContain("2026-10-01");
    const row = await prisma.lotteryDraw.findUniqueOrThrow({ where: { drawDate: isoToDate("2026-10-01") } });
    expect(row).toMatchObject({ status: "VERIFIED", sourceName: "glo.or.th", firstPrizeNumber: "402701" });
  });

  it("ทุกแหล่งล้มเหลว → FAILED, ข้อมูลเดิมยังอยู่ และ log มีข้อความผิดพลาด", async () => {
    await runSync({ trigger: "cli", verifyLimit: 0 }, { prisma, primary: new FakeListing([page1]), secondary: new FakeGlo({}), now });
    const s = await runSync(
      { trigger: "cron" },
      { prisma, primary: new FakeListing([new Error("timeout")]), secondary: new FakeGlo(new Error("ECONNREFUSED")), now },
    );
    expect(s.status).toBe("FAILED");
    expect(s.message).toContain("อาจยังไม่เป็นปัจจุบัน");
    expect(await prisma.lotteryDraw.count()).toBe(3);
    const log = await prisma.syncLog.findUniqueOrThrow({ where: { id: s.syncLogId! } });
    expect(log.errorMessage).toContain("timeout");
    expect(log.errorMessage).toContain("ECONNREFUSED");
    expect(log.finishedAt).not.toBeNull();
  });

  it("หน้าที่ 2 ล้มเหลวระหว่าง backfill → เก็บหน้าแรกไว้ และรายงาน PARTIAL", async () => {
    const s = await runSync(
      { trigger: "backfill", backfill: true, verifyLimit: 0 },
      { prisma, primary: new FakeListing([page1, new Error("HTTP 500")]), secondary: new FakeGlo({}), now },
    );
    expect(s.status).toBe("PARTIAL");
    expect(s.added).toBe(3);
  });

  it("GLO ล่มระหว่างยืนยัน → ยังบันทึกจากแหล่งหลักเป็น SOURCE_ONLY และหยุดเรียก GLO", async () => {
    const glo = new FakeGlo(new Error("timeout"));
    const s = await runSync({ trigger: "cli", verifyLimit: 10 }, { prisma, primary: new FakeListing([page1]), secondary: glo, now });
    expect(s.status).toBe("SUCCESS");
    expect(glo.calls).toHaveLength(1);
    expect(await prisma.lotteryDraw.count({ where: { status: "SOURCE_ONLY" } })).toBe(3);
  });

  it("กันการซิงก์ซ้อน และ cooldown หลังซิงก์สำเร็จ", async () => {
    await prisma.syncLog.create({ data: { sourceName: "x", trigger: "cron", status: "RUNNING", startedAt: now() } });
    const s = await runSync({ trigger: "manual" }, { prisma, primary: new FakeListing([page1]), secondary: new FakeGlo({}), now });
    expect(s.status).toBe("SKIPPED");
    await resetDb(prisma);
    await runSync({ trigger: "manual", verifyLimit: 0 }, { prisma, primary: new FakeListing([page1]), secondary: new FakeGlo({}), now });
    const s2 = await runSync(
      { trigger: "manual", cooldownSeconds: 120 },
      { prisma, primary: new FakeListing([page1]), secondary: new FakeGlo({}), now },
    );
    expect(s2.status).toBe("SKIPPED");
  });
});
