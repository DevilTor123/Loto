import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse, json } from "@/lib/api";
import { savedNumberInputSchema } from "@/lib/schemas";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await prisma.savedNumber.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
    return json({ items });
  } catch (e) {
    return errorResponse(e, "saved.get");
  }
}

export async function POST(req: Request) {
  try {
    const rl = rateLimit(`saved:${clientKey(req)}`, 60, 60_000);
    if (!rl.ok) return json({ error: "ส่งคำขอบ่อยเกินไป" }, { status: 429 });
    const body = savedNumberInputSchema.parse(await req.json());
    const item = await prisma.savedNumber.upsert({
      where: { number: body.number },
      create: { number: body.number, label: body.label || null },
      update: body.label ? { label: body.label } : {},
    });
    return json({ item }, { status: 201 });
  } catch (e) {
    return errorResponse(e, "saved.post");
  }
}

const delSchema = z.object({ number: z.string().regex(/^\d{6}$/) });

export async function DELETE(req: Request) {
  try {
    const { number } = delSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
    await prisma.savedNumber.deleteMany({ where: { number } });
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e, "saved.delete");
  }
}
