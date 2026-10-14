import type { Metadata } from "next";
import { ExternalLink, ShieldAlert } from "lucide-react";
import { getStatus } from "@/lib/data";
import { formatThaiDateTime } from "@/lib/thai-date";
import { DISCLAIMER } from "@/lib/copy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GLO } from "@/lib/providers/glo";
import { LOTTERY_CO_TH } from "@/lib/providers/lottery-co-th";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "เกี่ยวกับและวิธีการ",
  description: "แหล่งข้อมูล วิธีอัปเดต วิธีคำนวณความถี่ และข้อจำกัดของสถิติสลากกินแบ่งรัฐบาลใน LOTTO INTELLIGENCE",
};

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <Card id={id}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm leading-relaxed text-muted [&_strong]:text-text">{children}</CardContent>
    </Card>
  );
}

export default async function AboutPage() {
  const status = await getStatus();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-wide md:text-3xl">เกี่ยวกับและวิธีการ</h1>
        <p className="text-sm text-muted">
          ซิงก์ข้อมูลสำเร็จล่าสุด: <span className="text-text">{status.lastSuccessfulSyncAt ? formatThaiDateTime(status.lastSuccessfulSyncAt) : "ยังไม่เคยซิงก์สำเร็จ"}</span>
          {" "}· งวดในฐานข้อมูล {status.totalDraws.toLocaleString("th-TH")} งวด (ยืนยันกับ GLO แล้ว {status.verifiedDraws.toLocaleString("th-TH")} งวด)
        </p>
      </div>

      <div role="note" className="flex gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-5 text-sm text-text">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <p>“{DISCLAIMER}”</p>
      </div>

      <Section title="ข้อมูลมาจากที่ใด">
        <p>
          <strong>แหล่งหลัก:</strong>{" "}
          <a className="text-primary hover:underline" href={LOTTERY_CO_TH.previous} target="_blank" rel="noopener noreferrer">
            {LOTTERY_CO_TH.previous} <ExternalLink className="inline size-3" aria-hidden />
          </a>{" "}
          — หน้ารายการผลย้อนหลัง (robots.txt อนุญาตการเข้าถึงทั้งเว็บ) ระบบอ่านวันที่งวดและรางวัลที่ 1 จากข้อความในหน้า และเก็บลิงก์ผลรายงวดเป็น “ต้นฉบับ”
        </p>
        <p>
          <strong>ยืนยันผล / แหล่งสำรอง:</strong> สำนักงานสลากกินแบ่งรัฐบาล ผ่าน API ที่ประกาศใน{" "}
          <a className="text-primary hover:underline" href={GLO.catalog} target="_blank" rel="noopener noreferrer">
            Data Catalog ของ GLO <ExternalLink className="inline size-3" aria-hidden />
          </a>{" "}
          (<code className="break-all">POST {GLO.resultApi}</code>)
        </p>
        <p>รางวัลประเภทอื่น (เลขหน้า/ท้าย 3 ตัว, ท้าย 2 ตัว) เก็บแยกตารางพร้อมระบุประเภท และ<strong>ไม่ถูกนำมาปน</strong>กับสถิติรางวัลที่ 1</p>
      </Section>

      <Section title="อัปเดตข้อมูลอย่างไร">
        <ul className="list-disc space-y-1 pl-5">
          <li>Scheduled Task ฝั่งเซิร์ฟเวอร์เรียก <code>/api/cron/sync</code> ทุก 30–60 นาที และถี่ขึ้นช่วงบ่ายวันออกรางวัล (ไม่ได้ใช้ setInterval บนหน้าเว็บ)</li>
          <li>อ่านหน้าแรกของแหล่งหลัก หากพบงวดใหม่ ตรวจรูปแบบด้วย Zod (วันที่ถูกต้อง, รางวัลที่ 1 เป็นสตริง 6 หลัก) แล้วยืนยันกับ GLO</li>
          <li>ตรงกัน → “ยืนยันแล้ว” · GLO ไม่ตอบ → บันทึกเป็น “แหล่งเดียว” และยืนยันซ้ำรอบถัดไป · ไม่ตรงกัน → “รอตรวจสอบ” ไม่เลือกเลขเอง และไม่นำไปคำนวณ</li>
          <li>วันที่งวดเป็น Unique Constraint — ซิงก์ซ้ำกี่ครั้งก็ไม่เพิ่มงวดเดิม</li>
          <li>แหล่งหลักล้มเหลว → ค้นผลจาก GLO ตามวันที่ที่อาจมีการออกรางวัล · ทุกแหล่งล้มเหลว → แสดงข้อมูลล่าสุดที่บันทึกไว้พร้อมคำเตือน</li>
          <li>ทุกการเปลี่ยนแปลงถูกบันทึกในหน้า <a className="text-primary hover:underline" href="/sync">ประวัติการซิงก์</a></li>
        </ul>
      </Section>

      <Section title="คำนวณความถี่อย่างไร">
        <p><strong>ความถี่ของหมายเลข</strong> = จำนวนครั้งที่หมายเลขนั้นเป็นรางวัลที่ 1 ÷ จำนวนงวดในช่วงข้อมูลที่เลือก</p>
        <p><strong>เปอร์เซ็นต์ความถี่ที่พบ</strong> = จำนวนครั้งที่พบ ÷ จำนวนงวดที่มีข้อมูล × 100</p>
        <p><strong>ความถี่เลข 0–9 ตามตำแหน่ง</strong> = จำนวนงวดที่ตำแหน่งนั้นเป็นเลข d ÷ จำนวนงวด × 100 (แสดงทุกกรณีเสมอกัน)</p>
        <p><strong>จำนวนงวดที่ผ่านไป</strong> = จำนวนงวดในฐานข้อมูลที่ออกหลังการปรากฏครั้งล่าสุดของหมายเลขนั้น (0 = งวดล่าสุด)</p>
        <p>ใช้เฉพาะงวดที่ข้อมูลสมบูรณ์ งวดที่รอตรวจสอบไม่ถูกนับ และทุกกราฟแสดงจำนวนตัวอย่างที่ใช้คำนวณ</p>
      </Section>

      <Section title="ความถี่ในอดีต ≠ ความน่าจะเป็น">
        <p>
          ความถี่ในอดีตคือ “สิ่งที่เกิดขึ้นแล้ว” ส่วนความน่าจะเป็นคือ “โอกาสของสิ่งที่จะเกิด” หากการออกรางวัลสุ่มอย่างยุติธรรม แต่ละงวดเป็นอิสระต่อกัน
          ทุกหมายเลข 6 หลักมีโอกาส 1 ใน 1,000,000 ไม่ว่าในอดีตจะเคยออกบ่อยหรือไม่เคยออกเลย
        </p>
        <p>
          ด้วยข้อมูลเพียงไม่กี่ร้อยงวด ความแตกต่างของความถี่ระหว่างเลข 0–9 ส่วนใหญ่อยู่ในระดับที่เกิดจากความบังเอิญได้ตามปกติ
          ตัวอย่างเช่น ใน 100 งวด เลขหนึ่งตัวในตำแหน่งหนึ่งคาดว่าจะพบราว 10 ครั้ง แต่พบ 5–15 ครั้งก็ยังเป็นเรื่องปกติ
        </p>
        <p>“เลขที่ไม่ออกมานาน” จึงไม่ได้ “ถึงเวลาออก” และ “เลขที่ออกบ่อย” ก็ไม่ได้ “กำลังมาแรง” (Gambler’s fallacy / Hot-hand fallacy)</p>
      </Section>

      <Section title="ข้อจำกัดของข้อมูลและแบบจำลอง">
        <ul className="list-disc space-y-1 pl-5">
          <li>แหล่งหลักแสดงผลย้อนหลังประมาณตั้งแต่ ธ.ค. 2558 สถิติจึงครอบคลุมเฉพาะช่วงนั้น</li>
          <li>ตัวอ่านหน้าเว็บอาจใช้ไม่ได้หากเว็บต้นทางเปลี่ยนโครงสร้าง — ระบบจะบันทึกเป็นความล้มเหลวและไม่บันทึกข้อมูลที่อ่านไม่ได้</li>
          <li>งวดที่ GLO ยังไม่ได้ยืนยันจะแสดงป้าย “แหล่งเดียว”</li>
          <li>โหมดสุ่ม B และ C เป็นการสาธิตการใช้สถิติ ไม่มีโหมดใดเพิ่มโอกาสถูกรางวัล</li>
        </ul>
      </Section>

      {status.demoMode && (
        <Section id="demo" title="โหมดสาธิต">
          <p>
            เว็บไซต์กำลังรันในโหมดสาธิต: ข้อมูลมาจากฐานข้อมูลแยกที่สร้างด้วยตัวสุ่ม (source = demo-generator) <strong>ไม่ใช่ผลสลากจริง</strong>
            และปิดการซิงก์ไว้เพื่อไม่ให้ข้อมูลปนกัน
          </p>
        </Section>
      )}
    </div>
  );
}
