import { prisma } from "../db";
import { LotteryCoThProvider } from "../providers/lottery-co-th";
import { GloProvider } from "../providers/glo";
import { runSync, type SyncOptions } from "./sync-service";

/** ซิงก์ด้วย provider จริงและฐานข้อมูลหลัก */
export function syncNow(opts: SyncOptions) {
  return runSync(opts, { prisma, primary: new LotteryCoThProvider(), secondary: new GloProvider() });
}
