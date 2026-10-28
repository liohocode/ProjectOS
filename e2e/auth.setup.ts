import { execFileSync } from "node:child_process";
import { test as setup } from "@playwright/test";
import { E2E_AUTH_SECRET, E2E_BASE_URL, E2E_STORAGE_STATE } from "./env";

// F15.3 — mọi trang cần đăng nhập. E2E không đi qua Google: e2e/create-session.ts tạo session thật
// cho Trung Hiếu trên DB test (cùng secret với server e2e), ở đây nạp cookie và lưu thành storageState.
setup("đăng nhập Trung Hiếu", async ({ context }) => {
  const out = execFileSync("npx", ["tsx", "e2e/create-session.ts"], {
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL_TEST,
      BETTER_AUTH_SECRET: E2E_AUTH_SECRET,
      BETTER_AUTH_URL: E2E_BASE_URL,
    },
    encoding: "utf8",
  });
  const cookies = JSON.parse(out) as { name: string; value: string; domain: string; path: string; httpOnly?: boolean; secure?: boolean; sameSite?: "Lax" | "Strict" | "None"; expires?: number }[];
  await context.addCookies(cookies.map((c) => ({ ...c, sameSite: c.sameSite ?? "Lax" })));
  await context.storageState({ path: E2E_STORAGE_STATE });
});
