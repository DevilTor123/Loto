// ใช้ตอน build บน Vercel: รัน migration เมื่อมี DATABASE_URL เท่านั้น
// ทำให้ deploy ครั้งแรก (ก่อนเชื่อมฐานข้อมูล) build ผ่าน และหน้าเว็บจะแจ้งว่ายังเชื่อมฐานข้อมูลไม่ได้
// Neon บน Vercel ตั้ง DATABASE_URL (ผ่าน pooler) และ DATABASE_URL_UNPOOLED — migration ควรใช้แบบ unpooled
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.warn("[migrate] DATABASE_URL ยังไม่ได้ตั้งค่า — ข้าม prisma migrate deploy");
} else {
  // Neon อาจกำลังปลุกฐานข้อมูล (cold start) หรือติด advisory lock ชั่วคราว — ลองซ้ำก่อนยอมให้ build ล้ม
  for (let attempt = 1; ; attempt++) {
    try {
      execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
      break;
    } catch (e) {
      if (attempt >= 4) throw e;
      console.warn(`[migrate] ล้มเหลว (ครั้งที่ ${attempt}) — ลองใหม่ใน ${attempt * 5} วินาที`);
      await new Promise((r) => setTimeout(r, attempt * 5000));
    }
  }
}
