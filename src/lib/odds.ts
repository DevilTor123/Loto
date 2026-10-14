/**
 * โอกาสถูกรางวัลของหมายเลข 6 หลัก ต่อ 1 งวด — คำนวณจากโครงสร้างรางวัลของสลากกินแบ่งรัฐบาล
 * โดยสมมติว่าการออกรางวัลสุ่มอย่างยุติธรรม (ทุกหมายเลขโอกาสเท่ากัน)
 *
 * ผลลัพธ์ "เท่ากันทุกหมายเลข" — สถิติย้อนหลังไม่ได้เปลี่ยนตัวเลขเหล่านี้
 */

export interface PrizeOdds {
  key: string;
  label: string;
  /** จำนวนรางวัล (จำนวนหมายเลขที่ออก) ต่องวด */
  draws: number;
  /** จำนวนหมายเลขที่เป็นไปได้ของรางวัลนั้น */
  space: number;
  /** โอกาส (0–1) ที่หมายเลขนี้ถูกรางวัลประเภทนี้อย่างน้อย 1 รางวัล */
  probability: number;
  /** "1 ใน N" */
  oneIn: number;
}

/** โอกาสที่หมายเลขเดียวตรงกับหมายเลขที่ออก k ตัว (ไม่ซ้ำกัน) จากทั้งหมด n แบบ = k / n */
function distinctDraws(k: number, n: number) {
  return k / n;
}

/** โอกาสตรงกับอย่างน้อย 1 จาก k ครั้งที่สุ่มแยกกัน (อาจซ้ำกันได้) = 1 − (1 − 1/n)^k */
function independentDraws(k: number, n: number) {
  return 1 - (1 - 1 / n) ** k;
}

const PRIZES: { key: string; label: string; draws: number; space: number; independent?: boolean }[] = [
  { key: "first", label: "รางวัลที่ 1", draws: 1, space: 1_000_000 },
  { key: "near1", label: "รางวัลข้างเคียงรางวัลที่ 1", draws: 2, space: 1_000_000 },
  { key: "second", label: "รางวัลที่ 2", draws: 5, space: 1_000_000 },
  { key: "third", label: "รางวัลที่ 3", draws: 10, space: 1_000_000 },
  { key: "fourth", label: "รางวัลที่ 4", draws: 50, space: 1_000_000 },
  { key: "fifth", label: "รางวัลที่ 5", draws: 100, space: 1_000_000 },
  { key: "front3", label: "เลขหน้า 3 ตัว", draws: 2, space: 1_000, independent: true },
  { key: "last3", label: "เลขท้าย 3 ตัว", draws: 2, space: 1_000, independent: true },
  { key: "last2", label: "เลขท้าย 2 ตัว", draws: 1, space: 100 },
];

export function prizeOdds(): PrizeOdds[] {
  return PRIZES.map((p) => {
    const probability = p.independent ? independentDraws(p.draws, p.space) : distinctDraws(p.draws, p.space);
    return { key: p.key, label: p.label, draws: p.draws, space: p.space, probability, oneIn: 1 / probability };
  });
}

/**
 * โอกาสถูกอย่างน้อย 1 รางวัล (ประมาณ)
 * รางวัลที่ 1–5 และข้างเคียงไม่ซ้ำกัน จึงบวกกันได้ตรง ๆ
 * ส่วนเลขหน้า/ท้าย 3 ตัว และท้าย 2 ตัว คิดแยกกันแบบอิสระ
 */
export function anyPrizeProbability(): number {
  const odds = prizeOdds();
  const sixDigit = odds.filter((o) => o.space === 1_000_000).reduce((a, o) => a + o.probability, 0);
  const partial = odds.filter((o) => o.space !== 1_000_000);
  const noneOfPartial = partial.reduce((a, o) => a * (1 - o.probability), 1);
  return 1 - (1 - sixDigit) * noneOfPartial;
}

/** แสดง % แบบไม่ปัดจนกลายเป็น 0 */
export function formatProbability(p: number): string {
  const pct = p * 100;
  if (pct >= 1) return `${pct.toFixed(2)}%`;
  if (pct >= 0.01) return `${pct.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}%`;
  return `${pct.toFixed(6).replace(/0+$/, "").replace(/\.$/, "")}%`;
}
