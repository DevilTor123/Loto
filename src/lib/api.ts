import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "./logger";

export function json<T>(data: T, init?: ResponseInit & { cacheSeconds?: number }) {
  const headers = new Headers(init?.headers);
  if (init?.cacheSeconds) {
    headers.set("cache-control", `public, s-maxage=${init.cacheSeconds}, stale-while-revalidate=${init.cacheSeconds * 4}`);
  } else if (!headers.has("cache-control")) {
    headers.set("cache-control", "no-store");
  }
  return NextResponse.json(data, { ...init, headers });
}

export function errorResponse(e: unknown, where: string) {
  if (e instanceof ZodError) {
    return json({ error: "ข้อมูลที่ส่งมาไม่ถูกต้อง", issues: e.issues.map((i) => i.message) }, { status: 400 });
  }
  logger.error(`api.${where}`, { error: e instanceof Error ? e.message : String(e) });
  return json({ error: "เกิดข้อผิดพลาดภายในระบบ" }, { status: 500 });
}

export function searchParamsObject(req: Request) {
  return Object.fromEntries(new URL(req.url).searchParams.entries());
}
