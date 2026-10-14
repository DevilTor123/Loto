import { getStatus } from "@/lib/data";
import { errorResponse, json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await getStatus());
  } catch (e) {
    return errorResponse(e, "status");
  }
}
