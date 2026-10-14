import { z } from "zod";
import { isValidIsoDate } from "./thai-date";
import { normalizeDigits } from "./number";

/** วันที่งวด YYYY-MM-DD (ค.ศ.) ที่มีอยู่จริงในปฏิทิน และอยู่ในช่วงที่สมเหตุสมผล */
export const isoDateSchema = z
  .string()
  .refine(isValidIsoDate, "รูปแบบวันที่ต้องเป็น YYYY-MM-DD และเป็นวันที่มีอยู่จริง")
  .refine((s) => s >= "1990-01-01", "วันที่เก่าเกินไป");

export const sixDigitSchema = z
  .string()
  .regex(/^\d{6}$/, "หมายเลขต้องเป็นตัวเลข 6 หลัก (สตริง)");

/** ข้อมูลงวดที่ provider ส่งมา — ต้องผ่านก่อนบันทึกลงฐานข้อมูล */
export const providerDrawSchema = z.object({
  drawDate: isoDateSchema,
  firstPrize: sixDigitSchema,
  last2: z.string().regex(/^\d{2}$/).optional(),
  front3: z.array(z.string().regex(/^\d{3}$/)).max(2).optional(),
  last3: z.array(z.string().regex(/^\d{3}$/)).max(2).optional(),
  sourceName: z.string().min(1).max(64),
  sourceUrl: z.string().url(),
});
export type ProviderDraw = z.infer<typeof providerDrawSchema>;

export const windowSchema = z.enum(["all", "10", "30", "50", "100", "custom"]);
export type StatsWindow = z.infer<typeof windowSchema>;

export const statsQuerySchema = z
  .object({
    window: windowSchema.default("all"),
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
  })
  .refine((q) => !(q.from && q.to) || q.from <= q.to, "วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด");

export const drawsQuerySchema = z.object({
  q: z
    .string()
    .max(20)
    .optional()
    .transform((v) => (v ? normalizeDigits(v) : undefined)),
  year: z.coerce.number().int().min(1990).max(2200).optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
});

export const savedNumberInputSchema = z.object({
  number: z
    .string()
    .transform(normalizeDigits)
    .pipe(sixDigitSchema),
  label: z.string().trim().max(80).optional(),
});
