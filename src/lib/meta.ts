import type { PrismaClient, Prisma } from "@prisma/client";

const DATA_VERSION_KEY = "data_version";

type Db = PrismaClient | Prisma.TransactionClient;

/** เวอร์ชันข้อมูล — เปลี่ยนเมื่อมีงวดเพิ่ม/แก้ไข ใช้เป็นกุญแจแคชสถิติ */
export async function getDataVersion(db: Db): Promise<string> {
  const row = await db.appMeta.findUnique({ where: { key: DATA_VERSION_KEY } });
  return row?.value ?? "0";
}

export async function bumpDataVersion(db: Db): Promise<string> {
  const value = `${Date.now()}`;
  await db.appMeta.upsert({
    where: { key: DATA_VERSION_KEY },
    create: { key: DATA_VERSION_KEY, value },
    update: { value },
  });
  return value;
}
