import { describe, expect, it } from "vitest";
import {
  digitSum,
  distinctDigitCount,
  normalizeDigits,
  oddCount,
  repeatPattern,
  toSixDigit,
} from "@/lib/number";
import { savedNumberInputSchema, sixDigitSchema } from "@/lib/schemas";

describe("การรักษาเลขศูนย์ด้านหน้า", () => {
  it("toSixDigit เติม 0 ด้านหน้าเสมอ", () => {
    expect(toSixDigit(0)).toBe("000000");
    expect(toSixDigit(123)).toBe("000123");
    expect(toSixDigit(12345)).toBe("012345");
    expect(toSixDigit(900007)).toBe("900007");
    expect(toSixDigit(999999)).toBe("999999");
  });

  it("ปฏิเสธค่านอกช่วง", () => {
    expect(() => toSixDigit(-1)).toThrow();
    expect(() => toSixDigit(1_000_000)).toThrow();
    expect(() => toSixDigit(1.5)).toThrow();
  });

  it("schema ยอมรับเฉพาะสตริง 6 หลัก", () => {
    expect(sixDigitSchema.safeParse("004615").success).toBe(true);
    expect(sixDigitSchema.safeParse("4615").success).toBe(false);
    expect(sixDigitSchema.safeParse(4615).success).toBe(false);
    expect(sixDigitSchema.safeParse("12345a").success).toBe(false);
  });
});

describe("normalizeDigits (รองรับเลขไทย)", () => {
  it("แปลงเลขไทยเป็นเลขอารบิก", () => {
    expect(normalizeDigits("๐๐๔๖๑๕")).toBe("004615");
    expect(normalizeDigits("๑2๓4๕6")).toBe("123456");
  });
  it("ตัดอักขระอื่นออก รวมถึงความพยายาม SQL injection", () => {
    expect(normalizeDigits("12' OR 1=1 --")).toBe("1211");
    expect(normalizeDigits(" 00 46-15 ")).toBe("004615");
  });
  it("savedNumberInputSchema แปลงเลขไทยแล้วตรวจ 6 หลัก", () => {
    expect(savedNumberInputSchema.parse({ number: "๐๑๒๓๔๕" }).number).toBe("012345");
    expect(savedNumberInputSchema.safeParse({ number: "12345" }).success).toBe(false);
  });
});

describe("ลักษณะตัวเลข", () => {
  it("คำนวณผลรวม เลขคี่ และเลขซ้ำ", () => {
    expect(digitSum("004615")).toBe(16);
    expect(oddCount("135790")).toBe(5);
    expect(distinctDigitCount("112233")).toBe(3);
    expect(repeatPattern("000123")).toBe("3-1-1-1");
    expect(repeatPattern("123456")).toBe("1-1-1-1-1-1");
  });
});
