import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

// E2E chạy trên bản build production (cổng 3100) trỏ vào DB test, để không
// đụng dev server (cổng 3000) và DB dev. Global setup reseed DB test trước khi chạy.
const PORT = 3100;
const testDbUrl = process.env.DATABASE_URL_TEST;
if (!testDbUrl || !new URL(testDbUrl).pathname.includes("test")) {
  throw new Error("Thiếu DATABASE_URL_TEST trỏ tới DB test — xem .env.example");
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    // Tạo/migrate/reseed DB test TRƯỚC khi start server: Playwright khởi động webServer trước globalSetup,
    // nên nếu DB test chưa tồn tại (CI, máy mới clone) server sẽ lỗi ngay khi được probe.
    // `npm start` = server.js của bản standalone — cùng cách container production chạy (F19.2).
    command: "npx tsx scripts/test-db-prepare.ts && npm run build && npm start",
    url: `http://localhost:${PORT}/rv-web/work`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: { DATABASE_URL: testDbUrl, PORT: String(PORT), HOSTNAME: "0.0.0.0" },
  },
});
