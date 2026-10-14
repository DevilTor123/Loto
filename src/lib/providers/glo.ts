/**
 * Provider: สำนักงานสลากกินแบ่งรัฐบาล (GLO) — ใช้ยืนยันผล และเป็นแหล่งสำรอง
 *
 * Endpoint ที่ตรวจสอบแล้วจาก Data Catalog ทางการของ GLO
 * (https://gdcatalog.glo.or.th/dataset/dataset_c4-9_01 — "API Resource สำหรับแสดงผลการออกรางวัล
 *  สลากกินแบ่งรัฐบาล ตามวันที่ออกสลากกินแบ่งรัฐบาล", สัญญาอนุญาต Creative Commons Non-Commercial):
 *
 *   POST https://www.glo.or.th/api/checking/getLotteryResult
 *   Content-Type: application/json
 *   {"date":"01","month":"03","year":"2024"}
 *
 * ฟิลด์ผลลัพธ์ตามเอกสาร: pdf_url, displayDate, period, first, second, ..., last2, last3f, last3b, near1
 * เลขรางวัลที่ 1 อยู่ที่ response.result.data.first.number[].value
 */
import { z } from "zod";
import { fetchWithRetry } from "../http";
import { providerDrawSchema } from "../schemas";
import type { DateLookupProvider, ProviderDraw } from "./types";
import { ParseError } from "./types";

export const GLO = {
  name: "glo.or.th",
  homepage: "https://www.glo.or.th",
  resultApi: "https://www.glo.or.th/api/checking/getLotteryResult",
  catalog: "https://gdcatalog.glo.or.th/dataset/dataset_c4-9_01",
} as const;

const numberList = z
  .object({ number: z.array(z.object({ value: z.union([z.string(), z.number()]) })).optional() })
  .passthrough()
  .optional();

export const gloResponseSchema = z
  .object({
    response: z
      .object({
        result: z
          .object({
            data: z
              .object({
                first: numberList,
                last2: numberList,
                last3f: numberList,
                last3b: numberList,
              })
              .passthrough()
              .nullable()
              .optional(),
            pdf_url: z.string().nullable().optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

function values(list: z.infer<typeof numberList>, len: number): string[] {
  return (list?.number ?? [])
    .map((n) => String(n.value).trim())
    .filter((v) => v.length === len && /^\d+$/.test(v));
}

export function parseGloResponse(json: unknown, isoDate: string): ProviderDraw | null {
  const parsed = gloResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new ParseError(`รูปแบบข้อมูลจาก GLO ไม่ตรงตามที่คาดไว้: ${parsed.error.issues[0]?.message}`);
  }
  const result = parsed.data.response?.result;
  const data = result?.data;
  if (!data) return null;
  const first = values(data.first, 6);
  if (first.length === 0) return null; // ไม่มีการออกรางวัลในวันนี้
  if (first.length > 1) throw new ParseError(`GLO ส่งรางวัลที่ 1 มากกว่า 1 ค่า (${isoDate})`);
  const last2 = values(data.last2, 2)[0];
  const front3 = values(data.last3f, 3);
  const last3 = values(data.last3b, 3);
  const pdf = result?.pdf_url;
  const candidate = {
    drawDate: isoDate,
    firstPrize: first[0],
    last2,
    front3: front3.length ? front3 : undefined,
    last3: last3.length ? last3 : undefined,
    sourceName: GLO.name,
    sourceUrl: pdf && /^https?:\/\//.test(pdf) ? pdf : `${GLO.homepage}/`,
  };
  const valid = providerDrawSchema.safeParse(candidate);
  if (!valid.success) throw new ParseError(`ข้อมูล GLO ไม่ผ่านการตรวจสอบ: ${valid.error.issues[0]?.message}`);
  return valid.data;
}

export class GloProvider implements DateLookupProvider {
  readonly name = GLO.name;
  readonly homepage = GLO.homepage;

  async fetchByDate(isoDate: string): Promise<ProviderDraw | null> {
    const [year, month, date] = isoDate.split("-");
    const res = await fetchWithRetry(
      GLO.resultApi,
      {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ date, month, year }),
      },
      { minIntervalMs: 1000, retries: 1 },
    );
    const json = await res.json().catch(() => {
      throw new ParseError("GLO ไม่ได้ตอบกลับเป็น JSON");
    });
    return parseGloResponse(json, isoDate);
  }
}
