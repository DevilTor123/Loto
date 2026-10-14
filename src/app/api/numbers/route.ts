import { getStatsDraws } from "@/lib/data";
import { positionDigitFrequency } from "@/lib/stats";
import { errorResponse, json } from "@/lib/api";

export const dynamic = "force-dynamic";

/** ข้อมูลประกอบการสุ่ม: ประวัติรางวัลที่ 1 + ความถี่เลขตามตำแหน่ง */
export async function GET() {
  try {
    const { version, draws } = await getStatsDraws();
    const positions = positionDigitFrequency(draws).map((p) => p.digits.map((d) => d.count));
    return json({ version, sampleSize: draws.length, draws, positionCounts: positions });
  } catch (e) {
    return errorResponse(e, "numbers");
  }
}
