import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import type { DateLookupProvider, ListingProvider, ListResult, ProviderDraw } from "@/lib/providers/types";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://lotto:lotto@localhost:5432/lotto_test?schema=public";

let migrated = false;
export function migrate() {
  if (migrated) return;
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "pipe",
  });
  migrated = true;
}

export function testPrisma() {
  return new PrismaClient({ datasourceUrl: TEST_DATABASE_URL });
}

export async function resetDb(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(
    `TRUNCATE draw_changes, sync_logs, prize_results, lottery_draws, saved_numbers, app_meta RESTART IDENTITY CASCADE`,
  );
}

export function draw(drawDate: string, firstPrize: string, sourceName = "lottery.co.th"): ProviderDraw {
  return {
    drawDate,
    firstPrize,
    sourceName,
    sourceUrl: sourceName === "glo.or.th" ? "https://www.glo.or.th/" : `https://www.lottery.co.th/lotto/${drawDate}`,
  };
}

/** แหล่งหลักจำลอง — pages[i] คือรายการของหน้า i+1 หรือ Error เพื่อจำลองความล้มเหลว */
export class FakeListing implements ListingProvider {
  readonly name = "lottery.co.th";
  readonly homepage = "https://www.lottery.co.th/previous";
  calls: number[] = [];
  constructor(public pages: (ProviderDraw[] | Error)[]) {}
  async fetchPage(page: number): Promise<ListResult> {
    this.calls.push(page);
    const p = this.pages[page - 1];
    if (!p) throw new Error(`page ${page} not found`);
    if (p instanceof Error) throw p;
    return { draws: p, totalPages: this.pages.length, pageUrl: `${this.homepage}/page/${page}` };
  }
}

export class FakeGlo implements DateLookupProvider {
  readonly name = "glo.or.th";
  readonly homepage = "https://www.glo.or.th";
  calls: string[] = [];
  constructor(public results: Record<string, string> | Error) {}
  async fetchByDate(iso: string): Promise<ProviderDraw | null> {
    this.calls.push(iso);
    if (this.results instanceof Error) throw this.results;
    const n = this.results[iso];
    return n ? draw(iso, n, "glo.or.th") : null;
  }
}
