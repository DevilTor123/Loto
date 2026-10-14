/** ค่าตั้งค่าจาก Environment Variables (ฝั่งเซิร์ฟเวอร์เท่านั้น) */
export const config = {
  /** โหมดสาธิต: ใช้ฐานข้อมูลแยก ที่มีข้อมูลที่สร้างขึ้นเอง ไม่ใช่ผลสลากจริง */
  demoMode: process.env.DEMO_MODE === "true",
  cronSecret: process.env.CRON_SECRET ?? "",
  /** วินาทีขั้นต่ำระหว่างการกด "อัปเดตข้อมูล" ที่สำเร็จ */
  manualCooldownSeconds: Number(process.env.MANUAL_SYNC_COOLDOWN_SECONDS ?? 120),
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};
