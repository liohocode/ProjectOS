// Chuẩn bị DB test một lần trước toàn bộ integration test: tạo DB nếu thiếu,
// migrate deploy, seed lại dữ liệu mẫu (xem scripts/test-db-prepare.ts).
import { execSync } from "node:child_process";

export default function setup() {
  if (process.env.SKIP_TEST_DB_PREPARE === "1") return;
  execSync("npx tsx scripts/test-db-prepare.ts", { stdio: "inherit" });
}
