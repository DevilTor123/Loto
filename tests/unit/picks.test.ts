import { describe, expect, it } from "vitest";
import { hotCold, topDigitsNumber } from "@/lib/stats/picks";

describe("hotCold", () => {
  const rows = [
    { drawDate: "2026-10-01", numbers: ["12"] },
    { drawDate: "2026-09-16", numbers: ["34"] },
    { drawDate: "2026-09-01", numbers: ["12"] },
    { drawDate: "2026-08-16", numbers: ["56"] },
  ];
  it("นับความถี่และเรียงจากบ่อยสุด", () => {
    const r = hotCold(rows, 2, 3);
    expect(r.sampleSize).toBe(4);
    expect(r.frequent[0]).toMatchObject({ value: "12", count: 2, lastSeen: "2026-10-01", drawsSince: 0 });
    expect(r.neverSeen).toBe(97);
  });
  it("เลขไม่ออกนานเรียงตามจำนวนงวดที่ห่าง", () => {
    const r = hotCold(rows, 2, 2);
    expect(r.absent.map((x) => x.value)).toEqual(["56", "34"]);
    expect(r.absent[0].drawsSince).toBe(3);
  });
  it("นับ 2 ชุดในงวดเดียวเป็นครั้งเดียวถ้าเลขซ้ำ และเก็บเลขศูนย์นำหน้า", () => {
    const r = hotCold([{ drawDate: "2026-10-01", numbers: ["007", "007"] }], 3);
    expect(r.frequent[0]).toMatchObject({ value: "007", count: 1 });
  });
  it("ไม่มีข้อมูล", () => {
    const r = hotCold([], 2);
    expect(r.frequent).toEqual([]);
    expect(r.neverSeen).toBe(100);
  });
});

describe("topDigitsNumber", () => {
  it("รวมหลักที่ออกบ่อยสุดของแต่ละตำแหน่ง เป็นสตริง 6 หลัก", () => {
    const r = topDigitsNumber([
      { drawDate: "2026-10-01", number: "012345" },
      { drawDate: "2026-09-16", number: "012999" },
      { drawDate: "2026-09-01", number: "882345" },
    ]);
    expect(r?.number).toBe("012345");
  });
  it("ว่างเมื่อไม่มีข้อมูล", () => expect(topDigitsNumber([])).toBeNull());
});
