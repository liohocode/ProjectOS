import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";
import { E2E_AUTH_SECRET, E2E_BASE_URL, E2E_GOOGLE_CLIENT_ID, E2E_PORT, E2E_STORAGE_STATE } from "./e2e/env";

// E2E chạy trên bản build production (cổng 3100) trỏ vào DB test, để không
// đụng dev server (cổng 3000) và DB dev. Global setup reseed DB test trước khi chạy.
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
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    // F15.3: đăng nhập sẵn Trung Hiếu (e2e/auth.setup.ts) → mọi spec mặc định đã đăng nhập.
    // Spec cần trạng thái chưa đăng nhập tự đặt `test.use({ storageState: { cookies: [], origins: [] } })`.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, storageState: E2E_STORAGE_STATE },
    },
  ],
  webServer: {
    // Tạo/migrate/reseed DB test TRƯỚC khi start server: Playwright khởi động webServer trước globalSetup,
    // nên nếu DB test chưa tồn tại (CI, máy mới clone) server sẽ lỗi ngay khi được probe.
    // `npm start` = server.js của bản standalone — cùng cách container production chạy (F19.2).
    command: "npx tsx scripts/test-db-prepare.ts && npm run build && npm start",
    url: `${E2E_BASE_URL}/login`, // trang duy nhất không cần đăng nhập
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: testDbUrl,
      PORT: String(E2E_PORT),
      HOSTNAME: "0.0.0.0",
      // Đăng nhập (F15.2): giá trị giả cố định — e2e không gọi Google thật, chỉ kiểm tra URL chuyển hướng.
      BETTER_AUTH_SECRET: E2E_AUTH_SECRET,
      BETTER_AUTH_URL: E2E_BASE_URL,
      GOOGLE_CLIENT_ID: E2E_GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: "e2e-google-client-secret",
      // F29.2: khoá chủ mã hoá API key — giá trị giả cố định chỉ cho e2e.
      MERIDIAN_ENCRYPTION_KEY: "ZTJlLW1lcmlkaWFuLWVuY3J5cHRpb24ta2V5LTMyYnk=",
    },
  },
});
