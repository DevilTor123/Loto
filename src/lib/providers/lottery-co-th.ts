/**
 * Provider: https://www.lottery.co.th/previous (แหล่งหลัก)
 *
 * ตรวจสอบแล้ว (ต.ค. 2026):
 *  - robots.txt: "User-agent: * / Allow: /" — อนุญาตการเข้าถึงทั้งเว็บ
 *  - หน้า /previous แสดงรายการงวดพร้อมหัวข้อ "ผลสลากกินแบ่งรัฐบาล <วัน> <เดือน> <ปี พ.ศ.>"
 *    ตามด้วยตาราง รางวัลที่ 1 | 2 ตัว | เลขท้าย 3 ตัว | เลขหน้า 3 ตัว
 *  - แบ่งหน้าเป็น /previous/page/N พร้อมข้อความ "หน้า X จาก Y"
 *  - ลิงก์ผลรายงวด: /lotto/D-MM-YY (ปี พ.ศ. 2 หลัก) — งวดเก่าบางงวดไม่มีลิงก์
 *  - ปีเขียนได้ทั้ง 2 หลัก ("69") และ 4 หลัก ("2558")
 *
 * ตัวแยกข้อมูลอ่านจาก "ข้อความ" ของหน้า (ไม่ผูกกับ class CSS) เพื่อให้ทนต่อการเปลี่ยนดีไซน์
 * หากแยกงวดไม่ได้เลย จะโยน ParseError เพื่อให้ระบบสลับไปแหล่งสำรองและบันทึก log
 */
import * as cheerio from "cheerio";
import { fetchWithRetry } from "../http";
import { parseThaiDate } from "../thai-date";
import { providerDrawSchema } from "../schemas";
import { ParseError, type ListResult, type ListingProvider, type ProviderDraw } from "./types";

export const LOTTERY_CO_TH = {
  name: "lottery.co.th",
  base: "https://www.lottery.co.th",
  previous: "https://www.lottery.co.th/previous",
} as const;

export function pageUrl(page: number): string {
  return page <= 1 ? LOTTERY_CO_TH.previous : `${LOTTERY_CO_TH.previous}/page/${page}`;
}

const HEADING = "ผลสลากกินแบ่งรัฐบาล";

/** HTML → ข้อความที่คั่นแต่ละองค์ประกอบด้วยช่องว่าง/ขึ้นบรรทัด */
export function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe, form").remove();
  $("br").replaceWith("\n");
  $("p, div, li, tr, h1, h2, h3, h4, h5, h6, section, article, table, thead, tbody").each(
    (_, el) => {
      $(el).prepend("\n").append("\n");
    },
  );
  $("td, th, span, a, strong, em, b, i").each((_, el) => {
    $(el).prepend(" ").append(" ");
  });
  return $("body").text().replace(/[ \t ]+/g, " ");
}

function collectDrawLinks(html: string): Map<string, string> {
  const $ = cheerio.load(html);
  const map = new Map<string, string>();
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href") ?? "";
    const m = href.match(/\/lotto\/(\d{1,2})-(\d{1,2})-(\d{2,4})/);
    if (!m) return;
    const iso = parseThaiDateNumeric(Number(m[1]), Number(m[2]), Number(m[3]));
    if (!iso) return;
    const abs = new URL(href, LOTTERY_CO_TH.base);
    abs.hash = "";
    if (!map.has(iso)) map.set(iso, abs.toString());
  });
  return map;
}

function parseThaiDateNumeric(d: number, m: number, beYear: number): string | null {
  const months = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  ];
  if (m < 1 || m > 12) return null;
  return parseThaiDate(`${d} ${months[m - 1]} ${beYear}`);
}

/** แยกเลขรางวัลจากข้อความของ 1 งวด */
function parseSegment(segment: string) {
  // เริ่มอ่านตัวเลขหลังป้าย "รางวัลที่ 1" (ถ้ามี) เพื่อไม่ให้หยิบเลขอื่นมาแทน
  const labelIdx = segment.indexOf("รางวัลที่ 1");
  let body = labelIdx >= 0 ? segment.slice(labelIdx + "รางวัลที่ 1".length) : segment;
  // ตัดหัวตารางที่เหลือออก (มีเลข "2" และ "3" ในป้าย)
  body = body.replace(/2\s*ตัว|เลขท้าย\s*3\s*ตัว|เลขหน้า\s*3\s*ตัว|เลขท้าย\s*2\s*ตัว/g, " ");
  const tokens = body.match(/(?<!\d)\d+(?!\d)/g) ?? [];
  const firstIdx = tokens.findIndex((t) => t.length === 6);
  if (firstIdx < 0) return null;
  const firstPrize = tokens[firstIdx];
  const rest = tokens.slice(firstIdx + 1, firstIdx + 6);
  // เก็บรางวัลอื่นเฉพาะเมื่อรูปแบบครบตรงตามตาราง (2 ตัว, 3 ตัว x4) เท่านั้น
  const shapeOk =
    rest.length === 5 && rest[0].length === 2 && rest.slice(1).every((t) => t.length === 3);
  return {
    firstPrize,
    last2: shapeOk ? rest[0] : undefined,
    last3: shapeOk ? [rest[1], rest[2]] : undefined,
    front3: shapeOk ? [rest[3], rest[4]] : undefined,
  };
}

export function parsePreviousPage(html: string, url: string): ListResult {
  const text = htmlToText(html);
  const links = collectDrawLinks(html);
  const draws: ProviderDraw[] = [];
  const seen = new Set<string>();

  const parts = text.split(HEADING).slice(1);
  for (const part of parts) {
    const drawDate = parseThaiDate(part.slice(0, 40));
    if (!drawDate || seen.has(drawDate)) continue;
    // ตัดส่วนท้ายที่เป็นลิงก์ของงวดถัดไปออก
    const nextLink = part.search(/ตรวจหวย\s*งวด/);
    const segment = nextLink > 0 ? part.slice(0, nextLink) : part;
    const parsed = parseSegment(segment.replace(/^\s*\d{1,2}\s+[ก-๙.]+\s+(?:\d{4}|\d{2})/, " "));
    if (!parsed) continue;
    const candidate = {
      drawDate,
      ...parsed,
      sourceName: LOTTERY_CO_TH.name,
      sourceUrl: links.get(drawDate) ?? url,
    };
    const valid = providerDrawSchema.safeParse(candidate);
    if (!valid.success) continue;
    seen.add(drawDate);
    draws.push(valid.data);
  }

  const pm = text.match(/หน้า\s*(\d+)\s*จาก\s*(\d+)/);
  const totalPages = pm ? Number(pm[2]) : undefined;

  if (draws.length === 0) {
    throw new ParseError(
      `ไม่พบข้อมูลงวดในหน้า ${url} — โครงสร้างหน้าเว็บอาจเปลี่ยนไป กรุณาตรวจสอบตัวแยกข้อมูล`,
    );
  }
  return { draws, totalPages, pageUrl: url };
}

export class LotteryCoThProvider implements ListingProvider {
  readonly name = LOTTERY_CO_TH.name;
  readonly homepage = LOTTERY_CO_TH.previous;

  async fetchPage(page: number): Promise<ListResult> {
    const url = pageUrl(page);
    const res = await fetchWithRetry(url, { headers: { accept: "text/html" } }, { minIntervalMs: 1500 });
    const html = await res.text();
    return parsePreviousPage(html, url);
  }
}
