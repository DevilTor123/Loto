# LOTTO INTELLIGENCE

เว็บไซต์ส่วนตัวสำหรับวิเคราะห์สถิติ **รางวัลที่ 1** สลากกินแบ่งรัฐบาลไทยย้อนหลังจากข้อมูลจริง และสุ่มหมายเลข 6 หลัก

> สถิติย้อนหลังใช้เพื่อศึกษาข้อมูลเท่านั้น ไม่สามารถรับประกันผลรางวัลในอนาคต หากการออกรางวัลเป็นการสุ่มอย่างยุติธรรม แต่ละหมายเลข 6 หลักมีโอกาสถูกรางวัลที่ 1 เท่ากับ 1 ใน 1,000,000 หรือ 0.0001% ต่อหนึ่งงวด

## ความสามารถ

| หน้า | รายละเอียด |
|---|---|
| `/` แดชบอร์ด | สถานะข้อมูล (งวดล่าสุด, จำนวนงวด, ซิงก์ล่าสุด, สถานะแหล่งข้อมูล, ปุ่มอัปเดต/ดูต้นฉบับ, คำเตือนข้อมูลเก่า), เลขที่ออกบ่อย (ทั้งหมด/10/30/50/100/ช่วงวันที่), เลข 0–9 ตามตำแหน่ง (กราฟ + ตาราง + กรณีเสมอ), เลขที่ไม่ออกมานาน |
| `/history` | ตารางผลรางวัลที่ 1, ค้นหาหมายเลข (รองรับเลขไทย ๐–๙), เลือกปี/ช่วงวันที่, pagination, แหล่งข้อมูลและปุ่มเปิดผลต้นฉบับ |
| `/statistics` | แนวโน้มรายปี, ความถี่ 0–9 แยกหลัก, การกระจายผลรวม, คู่/คี่, หมายเลขที่ซ้ำ, รูปแบบเลขซ้ำ, คู่เลขร่วม, เปรียบเทียบ 10/30/50/100 งวด, ช่วงข้อมูลที่อาจขาดหาย |
| `/random` | สุ่ม 1/5/10/20 หมายเลข 3 โหมด (A สุ่มเท่ากัน, B ตามลักษณะในอดีต, C ทดลองน้ำหนักความถี่ + เปรียบเทียบ 3 สมมติฐาน), คัดลอก, คัดลอกทั้งหมด, รายการโปรด, ประวัติของแต่ละหมายเลข |
| `/sync` | ประวัติการซิงก์: แหล่งที่ติดต่อ, ผลลัพธ์, ข้อผิดพลาด, งวดที่เพิ่ม/ยืนยัน/ขัดแย้ง |
| `/about` | แหล่งข้อมูล วิธีอัปเดต สูตรคำนวณ ความถี่ ≠ ความน่าจะเป็น ข้อจำกัด และวันที่ซิงก์ล่าสุด |

## เทคโนโลยี

Next.js 15 (App Router, TypeScript) · Tailwind CSS v4 · คอมโพเนนต์สไตล์ shadcn/ui (Radix) · Recharts · Lucide · PostgreSQL + Prisma · Zod · Vitest

## แหล่งข้อมูล (ตรวจสอบแล้ว ต.ค. 2026)

| แหล่ง | บทบาท | วิธีดึง | หมายเหตุ |
|---|---|---|---|
| [lottery.co.th/previous](https://www.lottery.co.th/previous) | หลัก | อ่าน HTML หน้า `/previous` และ `/previous/page/N` | `robots.txt`: `User-agent: * / Allow: /` · ไม่มี API · ข้อมูลย้อนหลังถึง ธ.ค. 2558 (11 หน้า) · ปีเขียนทั้งแบบ 2 และ 4 หลัก |
| [GLO](https://www.glo.or.th) | ยืนยันผล + สำรอง | `POST https://www.glo.or.th/api/checking/getLotteryResult` body `{"date":"01","month":"10","year":"2026"}` | endpoint ประกาศใน [Data Catalog ของ GLO](https://gdcatalog.glo.or.th/dataset/dataset_c4-9_01) สัญญาอนุญาต CC Non-Commercial |

Frontend ไม่เรียกเว็บต้นทางโดยตรง — ทุกคำขอผ่าน backend (`src/lib/http.ts`) ที่มี timeout, retry แบบ exponential backoff, เคารพ `Retry-After`, เว้นระยะคำขอต่อโดเมน และ log แบบ JSON

ตัวอ่าน lottery.co.th อ่านจาก “ข้อความ” ของหน้า (หัวข้อ `ผลสลากกินแบ่งรัฐบาล <วันที่>` + ตาราง) ไม่ผูกกับ class CSS หากอ่านไม่ได้เลยจะโยน `ParseError` → ระบบสลับไป GLO และบันทึก log

## โครงสร้างโปรเจกต์

```
prisma/
  schema.prisma              # ตาราง + enum + index + unique
  migrations/                # migration SQL
scripts/
  sync.ts                    # npm run sync / sync:backfill
  scheduler.ts               # worker ซิงก์ตามเวลา (self-host)
  demo-seed.ts               # สร้างข้อมูลสาธิตในฐานข้อมูลแยก
src/
  app/                       # หน้าเว็บ + API routes
    api/status|stats|numbers|draws|sync|cron/sync|sync-logs|saved
  components/                # UI (dashboard, history, statistics, random, sync, ui/*)
  lib/
    providers/               # lottery-co-th.ts, glo.ts (แยกตามแหล่ง)
    sync/sync-service.ts     # ลำดับ: หลัก → สำรอง → ข้อมูลเดิม + ยืนยัน + audit
    stats/index.ts           # โมดูลวิเคราะห์ (ฟังก์ชันบริสุทธิ์ แยกจาก UI)
    random/index.ts          # crypto.getRandomValues + โหมด A/B/C
    schemas.ts               # Zod
    http.ts, schedule.ts, data.ts, ...
tests/
  unit/                      # ความถี่, เลข 0 นำหน้า, เปอร์เซ็นต์, parser, การสุ่ม, กำหนดการ
  integration/               # sync + PostgreSQL จริง, กันข้อมูลซ้ำ, ข้อมูลขัดแย้ง, แหล่งล้มเหลว, HTTP retry/timeout
  fixtures/previous-page.html
.github/workflows/scheduled-sync.yml
vercel.json · Dockerfile · docker-compose.yml · .env.example
```

## ฐานข้อมูล

| ตาราง | คอลัมน์สำคัญ |
|---|---|
| `lottery_draws` | `draw_date` (DATE, **UNIQUE**), `first_prize_number` (VARCHAR(6)), `status` (VERIFIED / SOURCE_ONLY / CONFLICT), `source_name`, `source_url`, `verified_source`, `verified_at`, `conflict_number`, `conflict_source`, `fetched_at`, `created_at`, `updated_at` |
| `prize_results` | รางวัลอื่นแยกประเภท: `prize_type` (LAST2 / FRONT3 / LAST3), `number`, `position` — unique (`draw_id`, `prize_type`, `position`) |
| `sync_logs` | `source_name`, `trigger`, `started_at`, `finished_at`, `status`, `records_added`, `records_updated`, `records_conflict`, `error_message`, `details` (JSON) |
| `draw_changes` | audit ต่องวด: ADDED / UPDATED / VERIFIED / CONFLICT, เลขเดิม/ใหม่, แหล่ง, หมายเหตุ |
| `saved_numbers` | `number` (VARCHAR(6), unique), `label`, `created_at` |
| `app_meta` | `data_version` — เปลี่ยนเมื่อข้อมูลงวดเปลี่ยน ใช้เป็นกุญแจแคชสถิติ |

หมายเลขทุกช่องเก็บเป็นข้อความ จึงไม่มีทางเสียเลข 0 นำหน้า

## กฎคุณภาพข้อมูล

1. Zod ตรวจวันที่ (มีจริงในปฏิทิน) และรางวัลที่ 1 (`^\d{6}$` เป็นสตริง) ก่อนบันทึก
2. งวดใหม่ถูกยืนยันกับ GLO: ตรงกัน → `VERIFIED` · GLO ไม่ตอบ → `SOURCE_ONLY` (ยืนยันซ้ำรอบถัดไป ทีละ `VERIFY_MAX_PER_RUN` งวด) · ไม่ตรง → `CONFLICT`
3. งวดที่มีอยู่แล้วถ้าแหล่งใดรายงานเลขต่าง **ไม่เขียนทับ** แต่ตั้ง `CONFLICT` พร้อมบันทึกทั้งสองค่า
4. งวด `CONFLICT` แสดงเป็น “รอตรวจสอบ” และไม่นำไปคำนวณสถิติ
5. `draw_date` เป็น unique — ซิงก์ซ้ำไม่เพิ่มงวดเดิม
6. ทุกการซิงก์บันทึกใน `sync_logs` + `draw_changes`

## ติดตั้งและรันในเครื่อง

ต้องมี Node.js 20+ และ PostgreSQL 14+

```bash
npm install                        # รัน prisma generate ให้อัตโนมัติ
cp .env.example .env               # แก้ DATABASE_URL และ CRON_SECRET
npm run db:migrate                 # สร้างตาราง
npm run sync:backfill              # ดึงย้อนหลังทุกหน้า + ยืนยันกับ GLO (ใช้เวลาหลายนาที)
npm run dev                        # http://localhost:3000
```

ซิงก์ด้วยมือ: `npm run sync` หรือกดปุ่ม “อัปเดตข้อมูล” (จำกัด 3 ครั้ง/10 นาที/IP และ cooldown หลังซิงก์สำเร็จ)

### โหมดสาธิต (ไม่ใช่ข้อมูลจริง)

ใช้ทดสอบหน้าตาเมื่อยังเชื่อมต่อแหล่งข้อมูลไม่ได้ — ต้องใช้ฐานข้อมูลแยกที่ชื่อมีคำว่า `demo`

```bash
export DEMO_MODE=true DATABASE_URL="postgresql://.../lotto_demo?schema=public"
npm run db:migrate && npm run demo:seed && npm run dev
```

ทุกหน้าจะมีแถบเตือน “โหมดสาธิต — ไม่ใช่ผลสลากจริง” ปิดการซิงก์ และตั้ง `noindex`

## ทดสอบ

```bash
npm run test:unit                  # ไม่ต้องใช้ฐานข้อมูล
# integration ต้องมี PostgreSQL: ค่าเริ่มต้น postgresql://lotto:lotto@localhost:5432/lotto_test
TEST_DATABASE_URL="postgresql://..." npm run test:integration
npm test                           # ทั้งหมด
npm run typecheck && npm run lint
```

ครอบคลุม: การนับความถี่, การรักษาเลขศูนย์ด้านหน้า (ระดับฟังก์ชัน, parser, API, SQL), การป้องกันข้อมูลซ้ำ (ตรรกะ + unique constraint), การคำนวณเปอร์เซ็นต์, กรณีเสมอ, กรณีไม่มีเลขซ้ำ, การสุ่ม (crypto, ไม่ใช้ Math.random, rejection sampling), parser ทั้งสองแหล่ง, retry/timeout/rate limit, แหล่งหลักล้ม → สำรอง, ทุกแหล่งล้ม → ข้อมูลเดิม + log, ข้อมูลขัดแย้ง

## Deploy

### แบบฟรีทั้งหมด (แนะนำ): Vercel Hobby + Neon Free + GitHub Actions

1. Push โค้ดขึ้น GitHub repo ของคุณ
2. vercel.com → Add New Project → Import repo นั้น
3. ในหน้าโปรเจกต์ Vercel → Storage → เลือก **Neon** (Postgres แผนฟรี) → Connect — Vercel จะตั้ง `DATABASE_URL` ให้เอง
4. Settings → Environment Variables: เพิ่ม `CRON_SECRET` (สุ่มยาว ๆ) และ `NEXT_PUBLIC_SITE_URL` (URL ที่ Vercel ให้) → Redeploy
   (สคริปต์ `vercel-build` รัน `prisma migrate deploy` ให้อัตโนมัติ)
5. GitHub repo → Settings → Secrets and variables → Actions: เพิ่ม `SITE_URL` และ `CRON_SECRET` (ค่าเดียวกับข้อ 4)
6. GitHub → Actions → “Scheduled lottery sync” → Run workflow → ติ๊ก backfill เพื่อดึงข้อมูลย้อนหลังครั้งแรก
7. เปิดหน้า `/sync` บนเว็บ ตรวจว่าซิงก์สำเร็จ หลังจากนั้น workflow จะเรียกทุก 30 นาทีเอง (และ Vercel Cron อีกวันละครั้ง)


### ตัวเลือก 1: Vercel + PostgreSQL ที่โฮสต์ (Neon / Supabase / Vercel Postgres)

1. Push โปรเจกต์ขึ้น GitHub แล้ว Import ใน Vercel
2. ตั้ง Environment Variables: `DATABASE_URL`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL` (และ `SITE_PASSWORD` ถ้าต้องการล็อกเว็บ)
3. Build command ใช้ค่าเริ่มต้น (`npm run build`) — รัน migration ครั้งแรกจากเครื่องตัวเอง: `DATABASE_URL=... npm run db:migrate`
4. ดึงข้อมูลย้อนหลังครั้งแรก: `DATABASE_URL=... npm run sync:backfill` จากเครื่องตัวเอง (หรือ GitHub Actions → Run workflow → backfill)
5. Scheduled update:
   - `vercel.json` มี Vercel Cron เรียก `/api/cron/sync` วันละครั้ง 16:40 น. เวลาไทย (แผน Hobby รันได้วันละครั้ง) — Vercel ส่ง `Authorization: Bearer $CRON_SECRET` ให้อัตโนมัติ
   - แผน Pro เปลี่ยน schedule เป็น `*/30 * * * *` ได้
   - หรือใช้ **GitHub Actions** (`.github/workflows/scheduled-sync.yml`) ทุก 30 นาที + ทุก 10 นาทีช่วงบ่ายวันออกรางวัล — ตั้ง Repository secrets `SITE_URL` และ `CRON_SECRET`
   - หรือบริการภายนอก เช่น cron-job.org: เรียก `GET https://<โดเมน>/api/cron/sync` พร้อม header `Authorization: Bearer <CRON_SECRET>` ทุก 30–60 นาที

### ตัวเลือก 2: VPS / Docker

```bash
cp .env.example .env    # ตั้ง CRON_SECRET, POSTGRES_PASSWORD
docker compose up -d --build
docker compose exec web npx tsx scripts/sync.ts --backfill --verify=500
```

service `scheduler` รัน `scripts/scheduler.ts` ซิงก์ทุก `SYNC_INTERVAL_MINUTES` (ค่าเริ่มต้น 45) และทุก 10 นาทีช่วง 14:30–18:30 น. วันออกรางวัล — เป็น worker ฝั่งเซิร์ฟเวอร์ ไม่ใช่ `setInterval` บนหน้าเว็บ

## ความปลอดภัย

- Secrets อยู่ใน environment variables เท่านั้น ไม่มีค่าใดส่งไป frontend (ไม่มีตัวแปร `NEXT_PUBLIC_` ที่เป็นความลับ)
- `/api/cron/sync` ตรวจ `CRON_SECRET` ด้วย `timingSafeEqual`; ไม่ตั้งค่า = ปิดใช้งาน
- ทุก input ผ่าน Zod ฝั่งเซิร์ฟเวอร์, ช่องค้นหาตัดเหลือเฉพาะตัวเลข (แปลงเลขไทย), query ผ่าน Prisma (parameterized) ป้องกัน SQL injection
- Rate limit ในหน่วยความจำสำหรับ `/api/sync` และ `/api/saved` (deploy หลาย instance ควรเปลี่ยนเป็น Redis/Upstash)
- สถิติแคชตาม `data_version` — คำนวณใหม่เฉพาะเมื่อข้อมูลเปลี่ยน

## ข้อจำกัดที่ทราบ

- ตัวอ่าน lottery.co.th ทดสอบกับ fixture ที่สร้างตามโครงสร้างหน้าจริง (ตรวจ ต.ค. 2026) แต่ยังไม่ได้รันกับ HTML จริงจากเครื่องที่ใช้พัฒนา เพราะเครือข่ายของสภาพแวดล้อมพัฒนาบล็อกทั้งสองโดเมน **ให้รัน `npm run sync:backfill` ครั้งแรกแล้วตรวจหน้า `/sync`** หากขึ้น ParseError ให้แก้ `src/lib/providers/lottery-co-th.ts`
- รูปแบบ JSON ตอบกลับของ GLO อ้างอิงจากเอกสาร Data Catalog และตัวอย่างโค้ดสาธารณะ ตัว parser ตรวจด้วย Zod และจะรายงานข้อผิดพลาดแทนการเดาค่า
- การตัดสินกรณี `CONFLICT` ต้องทำโดยผู้ดูแล (แก้ในฐานข้อมูลแล้วตั้ง status เป็น VERIFIED)
