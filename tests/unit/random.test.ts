import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildProfiles,
  frequencyNumber,
  matchesProfile,
  patternNumber,
  positionWeights,
  randomInt,
  uniformNumber,
  type RandomSource,
} from "@/lib/random";

afterEach(() => vi.restoreAllMocks());

describe("Mode A: uniform", () => {
  it("ได้สตริง 6 หลักเสมอ และไม่ใช้ Math.random", () => {
    const spy = vi.spyOn(Math, "random");
    for (let i = 0; i < 2000; i++) expect(uniformNumber()).toMatch(/^\d{6}$/);
    expect(spy).not.toHaveBeenCalled();
  });

  it("ใช้ crypto.getRandomValues", () => {
    const spy = vi.spyOn(globalThis.crypto, "getRandomValues");
    uniformNumber();
    expect(spy).toHaveBeenCalled();
  });

  it("รักษาเลขศูนย์ด้านหน้า (ค่าต่ำสุด/สูงสุด)", () => {
    const zero: RandomSource = { fill: (a) => (a.fill(0), a) };
    expect(uniformNumber(zero)).toBe("000000");
    // 999_999 = ค่าสุดท้ายของช่วง
    const max: RandomSource = { fill: (a) => (a.fill(999_999), a) };
    expect(uniformNumber(max)).toBe("999999");
  });

  it("randomInt ใช้ rejection sampling (ไม่มี modulo bias)", () => {
    let call = 0;
    const src: RandomSource = {
      fill: (a) => {
        a[0] = call++ === 0 ? 0xffffffff : 7; // ค่าแรกเกิน limit ต้องถูกทิ้ง
        return a;
      },
    };
    expect(randomInt(1_000_000, src)).toBe(7);
    expect(call).toBe(2);
  });

  it("เลขแต่ละหลักกระจายใกล้เคียงกัน (ตรวจหยาบ)", () => {
    const counts = new Array(10).fill(0);
    for (let i = 0; i < 20000; i++) counts[Number(uniformNumber()[0])]++;
    for (const c of counts) expect(c).toBeGreaterThan(1700);
  });
});

describe("Mode B: historical pattern", () => {
  const history = ["004615", "123456", "000001", "987650", "112233"];
  it("สร้างตารางลักษณะจากประวัติ รวมสัดส่วน 100%", () => {
    const p = buildProfiles(history);
    expect(p.reduce((a, x) => a + x.pct, 0)).toBeCloseTo(100);
  });
  it("หมายเลขที่ได้ตรงกับลักษณะที่เลือก", () => {
    const profiles = buildProfiles(history);
    for (let i = 0; i < 50; i++) {
      const r = patternNumber(profiles);
      expect(r.number).toMatch(/^\d{6}$/);
      expect(r.profile && matchesProfile(r.number, r.profile)).toBe(true);
    }
  });
  it("ไม่มีประวัติ → กลับไปใช้ uniform", () => {
    expect(patternNumber([]).profile).toBeNull();
  });
});

describe("Mode C: frequency experiment", () => {
  const counts = Array.from({ length: 6 }, () => [10, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  it("α = 0 ได้น้ำหนักเท่ากันทุกหลัก (เท่ากับ Mode A)", () => {
    const w = positionWeights(counts, 0);
    expect(w.every((row) => row.every((x) => Math.abs(x - 0.1) < 1e-12))).toBe(true);
  });
  it("α = 1 ใช้สัดส่วนในอดีตล้วน", () => {
    const w = positionWeights(counts, 1);
    expect(w[0][0]).toBe(1);
    expect(frequencyNumber(w)).toBe("000000");
  });
  it("สมมติฐานกลับด้าน ให้น้ำหนักเลขที่พบน้อย", () => {
    const w = positionWeights(counts, 1, "favor-rare");
    expect(w[0][0]).toBeLessThan(1e-6);
    expect(frequencyNumber(w)).not.toContain("0");
  });
  it("น้ำหนักแต่ละตำแหน่งรวมเป็น 1", () => {
    const w = positionWeights([[3, 1, 4, 1, 5, 9, 2, 6, 5, 3], ...counts.slice(1)], 0.37);
    for (const row of w) expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
});

describe("Mode B: ลักษณะที่หายาก", () => {
  it("ยังได้หมายเลขที่ตรงลักษณะแม้ rejection sampling ไม่พบ", () => {
    const profiles = buildProfiles(["000001"]); // คี่ 1, ผลรวม 0–4, รูปแบบ 5-1
    const r = patternNumber(profiles, undefined, 1);
    expect(r.profile).not.toBeNull();
    expect(matchesProfile(r.number, r.profile!)).toBe(true);
  });
});
