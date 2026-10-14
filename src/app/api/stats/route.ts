import { getStats } from "@/lib/data";
import { errorResponse, json, searchParamsObject } from "@/lib/api";
import { statsQuerySchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const q = statsQuerySchema.parse(searchParamsObject(req));
    const { version, stats } = await getStats(q.window, q.from, q.to);
    return json({ version, ...stats }, { headers: { etag: `"${version}-${q.window}-${q.from ?? ""}-${q.to ?? ""}"` } });
  } catch (e) {
    return errorResponse(e, "stats");
  }
}
