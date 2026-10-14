import { execSync } from "node:child_process";

// Reseed DB test để mỗi lần chạy e2e bắt đầu từ cùng một dữ liệu (test duyệt revision có ghi dữ liệu).
export default function globalSetup() {
  execSync("npx tsx scripts/test-db-prepare.ts", { stdio: "inherit" });
}
