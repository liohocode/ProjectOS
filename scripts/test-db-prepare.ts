// Chuẩn bị DB test riêng: tạo database nếu chưa có → migrate deploy → seed.
// Không dùng `prisma migrate reset` (Prisma chặn lệnh phá dữ liệu khi chạy bởi
// AI agent); seed tự xoá sạch dữ liệu nên chạy lại nhiều lần vẫn an toàn.
import "dotenv/config";
import { execSync } from "node:child_process";
import { Client } from "pg";

function resolveTestUrl(): URL {
  if (process.env.DATABASE_URL_TEST) return new URL(process.env.DATABASE_URL_TEST);
  if (!process.env.DATABASE_URL) throw new Error("Thiếu DATABASE_URL_TEST (hoặc DATABASE_URL để suy ra)");
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = "/meridian_test";
  return url;
}

async function main() {
  const testUrl = resolveTestUrl();
  const dbName = testUrl.pathname.slice(1);
  if (!/^[a-z0-9_]+$/.test(dbName) || !dbName.includes("test")) {
    throw new Error(`Tên DB test "${dbName}" không hợp lệ — phải chứa "test" để tránh đụng DB thật`);
  }

  const adminUrl = new URL(testUrl);
  adminUrl.pathname = "/postgres";
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Đã tạo database ${dbName}`);
  }
  await admin.end();

  const env = { ...process.env, DATABASE_URL: testUrl.toString() };
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  execSync("npx prisma db seed", { stdio: "inherit", env });
  console.log(`DB test sẵn sàng: ${dbName}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
