import type { ProviderDraw } from "../schemas";

export type { ProviderDraw };

export interface ListResult {
  draws: ProviderDraw[];
  /** จำนวนหน้าทั้งหมดที่แหล่งข้อมูลรายงาน (ถ้าทราบ) */
  totalPages?: number;
  pageUrl: string;
}

/** แหล่งข้อมูลที่แสดงรายการผลย้อนหลังเป็นหน้า ๆ (แหล่งหลัก) */
export interface ListingProvider {
  readonly name: string;
  readonly homepage: string;
  fetchPage(page: number): Promise<ListResult>;
}

/** แหล่งข้อมูลที่ค้นผลรายงวดตามวันที่ได้ (ใช้ยืนยัน และเป็นแหล่งสำรอง) */
export interface DateLookupProvider {
  readonly name: string;
  readonly homepage: string;
  /** คืนค่า null ถ้าวันนั้นไม่มีการออกรางวัล */
  fetchByDate(isoDate: string): Promise<ProviderDraw | null>;
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}
