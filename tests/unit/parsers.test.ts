import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parsePreviousPage, pageUrl } from "@/lib/providers/lottery-co-th";
import { parseGloResponse } from "@/lib/providers/glo";
import { ParseError } from "@/lib/providers/types";
import { beYearToCe, formatThaiDate, parseThaiDate } from "@/lib/thai-date";
import { candidateDrawGroups, expectedLatestDrawDate, freshness } from "@/lib/schedule";

const html = readFileSync(path.join(__dirname, "../fixtures/previous-page.html"), "utf8");

describe("วันที่ภาษาไทย", () => {
  it("แปลงปี พ.ศ. 2 และ 4 หลัก", () => {
    expect(beYearToCe(69)).toBe(2026);
    expect(beYearToCe(2558)).toBe(2015);
    expect(parseThaiDate("1 ตุลาคม 69")).toBe("2026-10-01");
    expect(parseThaiDate("30 ธันวาคม 2558")).toBe("2015-12-30");
    expect(parseThaiDate("31 กุมภาพันธ์ 69")).toBeNull();
    expect(parseThaiDate("hello")).toBeNull();
    expect(formatThaiDate("2026-10-01")).toBe("1 ตุลาคม 2569");
  });
});

describe("lottery.co.th parser", () => {
  const res = parsePreviousPage(html, pageUrl(1));

  it("แยกงวดได้ครบ และไม่หยิบข้อความใน <script>", () => {
    expect(res.draws.map((d) => [d.drawDate, d.firstPrize])).toEqual([
      ["2026-10-01", "402701"],
      ["2026-09-16", "730640"],
      ["2026-08-16", "004615"],
      ["2016-01-17", "304371"],
      ["2015-12-01", "915350"],
    ]);
    expect(res.totalPages).toBe(11);
  });

  it("เก็บเลขเป็นสตริงพร้อมเลข 0 นำหน้า", () => {
    const d = res.draws.find((x) => x.drawDate === "2026-08-16")!;
    expect(d.firstPrize).toBe("004615");
    expect(typeof d.firstPrize).toBe("string");
  });

  it("ลิงก์ต้นฉบับรายงวด (และใช้ URL หน้ารายการเมื่อไม่มีลิงก์)", () => {
    expect(res.draws[0].sourceUrl).toBe("https://www.lottery.co.th/lotto/1-10-69");
    expect(res.draws[1].sourceUrl).toBe("https://www.lottery.co.th/lotto/16-09-69");
    expect(res.draws[4].sourceUrl).toBe("https://www.lottery.co.th/previous");
  });

  it("แยกรางวัลอื่นแบบระบุประเภท เมื่อรูปแบบครบเท่านั้น", () => {
    expect(res.draws[0]).toMatchObject({ last2: "11", last3: ["111", "222"], front3: ["333", "444"] });
    expect(res.draws[4].last2).toBeUndefined();
  });

  it("หน้าที่โครงสร้างเปลี่ยน → ParseError", () => {
    expect(() => parsePreviousPage("<html><body>maintenance</body></html>", pageUrl(1))).toThrow(ParseError);
  });
});

describe("GLO parser", () => {
  const body = {
    response: {
      result: {
        pdf_url: "https://www.glo.or.th/x.pdf",
        data: {
          first: { number: [{ value: "004615" }] },
          last2: { number: [{ value: "33" }] },
          last3f: { number: [{ value: "123" }, { value: "456" }] },
          last3b: { number: [{ value: "789" }, { value: "012" }] },
        },
      },
    },
  };
  it("อ่านรางวัลที่ 1 และรักษาเลข 0 นำหน้า", () => {
    const d = parseGloResponse(body, "2026-08-16")!;
    expect(d.firstPrize).toBe("004615");
    expect(d.sourceUrl).toBe("https://www.glo.or.th/x.pdf");
    expect(d.front3).toEqual(["123", "456"]);
  });
  it("วันที่ไม่มีการออกรางวัล → null", () => {
    expect(parseGloResponse({ response: { result: { data: null } } }, "2026-08-15")).toBeNull();
    expect(parseGloResponse({ response: { result: { data: { first: { number: [] } } } } }, "2026-08-15")).toBeNull();
  });
  it("ค่ารางวัลที่ 1 ผิดรูปแบบ → ไม่บันทึก", () => {
    const bad = { response: { result: { data: { first: { number: [{ value: 4615 }] } } } } };
    expect(parseGloResponse(bad, "2026-08-16")).toBeNull();
  });
});

describe("กำหนดการและความสดของข้อมูล", () => {
  it("งวดที่ควรมีผลแล้ว", () => {
    expect(expectedLatestDrawDate(new Date("2026-10-14T12:00:00Z"))).toBe("2026-10-01");
    // 16 ต.ค. 15:00 น. ไทย = ยังไม่ประกาศ
    expect(expectedLatestDrawDate(new Date("2026-10-16T08:00:00Z"))).toBe("2026-10-01");
    expect(expectedLatestDrawDate(new Date("2026-10-16T10:00:00Z"))).toBe("2026-10-16");
    expect(expectedLatestDrawDate(new Date("2026-01-01T03:00:00Z"))).toBe("2025-12-16");
  });
  it("สถานะ fresh / awaiting / stale", () => {
    const now = new Date("2026-10-14T12:00:00Z");
    expect(freshness("2026-10-01", now).state).toBe("fresh");
    expect(freshness("2026-09-16", now).state).toBe("stale");
    expect(freshness("2026-09-16", new Date("2026-10-02T03:00:00Z")).state).toBe("awaiting");
    expect(freshness("2025-12-30", new Date("2026-01-05T03:00:00Z")).state).toBe("fresh");
    expect(freshness(null, now).state).toBe("empty");
  });
  it("วันที่ผู้สมัครสำหรับแหล่งสำรอง", () => {
    const g = candidateDrawGroups("2026-09-16", "2026-10-14");
    expect(g[0][0]).toBe("2026-09-17");
    expect(g.flat()).toContain("2026-10-01");
    expect(g.flat().every((d) => d > "2026-09-16" && d <= "2026-10-14")).toBe(true);
  });
});
