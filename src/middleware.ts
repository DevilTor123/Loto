import { NextResponse, type NextRequest } from "next/server";

/**
 * (ไม่บังคับ) ป้องกันเว็บส่วนตัวด้วย Basic Auth เมื่อกำหนด SITE_PASSWORD
 * ยกเว้น /api/cron/* ซึ่งใช้ CRON_SECRET แยกต่างหาก
 */
export function middleware(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password || req.nextUrl.pathname.startsWith("/api/cron/")) return NextResponse.next();
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const [, pass] = atob(header.slice(6)).split(":");
    if (pass === password) return NextResponse.next();
  }
  return new NextResponse("ต้องยืนยันตัวตน", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="LOTTO INTELLIGENCE", charset="UTF-8"' },
  });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
