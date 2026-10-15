import { Client } from "pg";

// Truy cập trực tiếp DB test cho spec cần chuẩn bị / trả lại dữ liệu (luôn DATABASE_URL_TEST, không bao giờ DB dev).
export async function withDb<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const db = new Client({ connectionString: process.env.DATABASE_URL_TEST });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}
