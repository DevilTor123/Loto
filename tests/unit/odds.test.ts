import { describe, expect, it } from "vitest";
import { anyPrizeProbability, formatProbability, prizeOdds } from "@/lib/odds";

describe("โอกาสถูกรางวัล", () => {
  const odds = Object.fromEntries(prizeOdds().map((o) => [o.key, o]));

  it("รางวัลที่ 1 = 1 ใน 1,000,000 = 0.0001%", () => {
    expect(odds.first.probability).toBe(1e-6);
    expect(odds.first.oneIn).toBe(1_000_000);
    expect(formatProbability(odds.first.probability)).toBe("0.0001%");
  });

  it("รางวัลอื่นตามจำนวนรางวัลต่องวด", () => {
    expect(odds.fifth.probability).toBeCloseTo(100 / 1e6, 12);
    expect(odds.last2.probability).toBe(0.01);
    expect(formatProbability(odds.last2.probability)).toBe("1.00%");
    expect(odds.last3.probability).toBeCloseTo(1 - 0.999 ** 2, 12);
  });

  it("โอกาสถูกอย่างน้อย 1 รางวัล ≈ 1.41%", () => {
    expect(anyPrizeProbability()).toBeGreaterThan(0.0139);
    expect(anyPrizeProbability()).toBeLessThan(0.0142);
  });

  it("แสดงตัวเลขเล็กไม่ปัดเป็น 0", () => {
    expect(formatProbability(2e-6)).toBe("0.0002%");
    expect(formatProbability(0.0001)).toBe("0.01%");
  });
});
