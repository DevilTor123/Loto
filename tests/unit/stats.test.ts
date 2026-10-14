import { describe, expect, it } from "vitest";
import {
  computeAll,
  detectGaps,
  frequencySummary,
  longestAbsent,
  normalizeDraws,
  numberFrequencies,
  oddEvenDistribution,
  percent,
  positionDigitFrequency,
  selectWindow,
  type Draw,
} from "@/lib/stats";

const draws: Draw[] = [
  { drawDate: "2026-10-01", number: "004615" },
  { drawDate: "2026-09-16", number: "123456" },
  { drawDate: "2026-09-01", number: "004615" },
  { drawDate: "2026-08-16", number: "000001" },
  { drawDate: "2026-08-01", number: "123456" },
  { drawDate: "2026-07-16", number: "004615" },
];

describe("percent", () => {
  it("คำนวณ count ÷ total × 100", () => {
    expect(percent(3, 6)).toBe(50);
    expect(percent(1, 3)).toBeCloseTo(33.3333, 3);
    expect(percent(0, 10)).toBe(0);
    expect(percent(5, 0)).toBe(0);
  });
});

describe("การนับความถี่รางวัลที่ 1", () => {
  it("นับจำนวนครั้งถูกต้องและรักษาเลขศูนย์ด้านหน้า", () => {
    const f = numberFrequencies(normalizeDraws(draws));
    expect(f.map((x) => [x.number, x.count])).toEqual([
      ["004615", 3],
      ["123456", 2],
      ["000001", 1],
    ]);
    expect(f[0].number).toHaveLength(6);
    expect(f[0].pct).toBe(50);
    expect(f[2].pct).toBeCloseTo(16.6667, 3);
  });

  it("งวดล่าสุดที่ปรากฏ และจำนวนงวดที่ผ่านไป", () => {
    const f = numberFrequencies(normalizeDraws(draws));
    const byNum = Object.fromEntries(f.map((x) => [x.number, x]));
    expect(byNum["004615"].lastDate).toBe("2026-10-01");
    expect(byNum["004615"].drawsSince).toBe(0);
    expect(byNum["123456"].drawsSince).toBe(1);
    expect(byNum["000001"].drawsSince).toBe(3);
  });

  it("กรณีไม่มีเลขซ้ำ: hasRepeats=false และทุกรายการพบ 1 ครั้ง (ไม่สร้างอันดับปลอม)", () => {
    const unique = normalizeDraws(draws.slice(0, 2));
    const s = frequencySummary(unique);
    expect(s.hasRepeats).toBe(false);
    expect(s.repeated).toHaveLength(0);
    expect(s.items.every((i) => i.count === 1)).toBe(true);
  });

  it("ตัวกรอง N งวดล่าสุดเปลี่ยนผลจริง", () => {
    const all = normalizeDraws(draws);
    const last2 = selectWindow(all, "10").slice(0, 2);
    expect(selectWindow(all, "10")).toHaveLength(6);
    expect(numberFrequencies(last2).every((x) => x.count === 1)).toBe(true);
    const custom = selectWindow(all, "custom", "2026-08-01", "2026-09-01");
    expect(custom.map((d) => d.drawDate)).toEqual(["2026-09-01", "2026-08-16", "2026-08-01"]);
  });

  it("กรองข้อมูลไม่สมบูรณ์ออก", () => {
    const bad = normalizeDraws([...draws, { drawDate: "2026-06-16", number: "4615" }]);
    expect(bad).toHaveLength(6);
  });
});

describe("ความถี่เลข 0–9 ตามตำแหน่ง", () => {
  it("นับแยกตำแหน่ง และรายงานกรณีเสมอ", () => {
    const p = positionDigitFrequency([
      { drawDate: "2026-01-01", number: "012345" },
      { drawDate: "2026-01-16", number: "112345" },
    ]);
    expect(p[0].digits[0].count).toBe(1);
    expect(p[0].digits[1].count).toBe(1);
    expect(p[0].most.digits).toEqual([0, 1]); // เสมอ
    expect(p[0].least.count).toBe(0);
    expect(p[0].least.digits).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    expect(p[1].most).toEqual({ count: 2, digits: [1] });
    expect(p[5].digits[5].pct).toBe(100);
    expect(p.every((x) => x.sampleSize === 2)).toBe(true);
  });
});

describe("เลขคู่/คี่ และเลขที่ไม่ออกมานาน", () => {
  it("นับจำนวนหลักคี่", () => {
    const o = oddEvenDistribution([{ drawDate: "2026-01-01", number: "135790" }]);
    expect(o.buckets.find((b) => b.key === 5)?.count).toBe(1);
    expect(o.oddDigitPct).toBeCloseTo((5 / 6) * 100);
  });
  it("เรียงตามจำนวนงวดที่ผ่านไปมากที่สุด", () => {
    const l = longestAbsent(normalizeDraws(draws));
    expect(l[0]).toMatchObject({ number: "000001", drawsSince: 3, totalCount: 1 });
  });
  it("ตรวจช่องว่างข้อมูล", () => {
    const g = detectGaps(normalizeDraws([...draws, { drawDate: "2026-05-16", number: "999999" }]));
    expect(g).toHaveLength(1);
    expect(g[0].after).toBe("2026-05-16");
  });
});

describe("computeAll", () => {
  it("sampleSize ตรงกับจำนวนงวดในช่วงที่เลือก", () => {
    expect(computeAll(draws, "all").sampleSize).toBe(6);
    expect(computeAll(draws, "custom", "2026-09-01").sampleSize).toBe(3);
    expect(computeAll([], "all").frequency.items).toEqual([]);
  });
});
