import { execFileSync } from "node:child_process";
import type { BrowserContext } from "@playwright/test";
import { E2E_AUTH_SECRET, E2E_BASE_URL } from "./env";

// F15.3 — mọi trang cần đăng nhập. E2E không đi qua Google: e2e/create-session.ts tạo session thật
// cho member trên DB test (cùng secret với server e2e), ở đây nạp cookie vào context.
type SessionCookie = { name: string; value: string; domain: string; path: string; httpOnly?: boolean; secure?: boolean; sameSite?: "Lax" | "Strict" | "None"; expires?: number };

/** Mỗi lần gọi tạo một session mới (đăng xuất session này không ảnh hưởng session khác). */
export async function signInAs(context: BrowserContext, memberId: string): Promise<void> {
  const out = execFileSync("npx", ["tsx", "e2e/create-session.ts", memberId], {
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL_TEST,
      BETTER_AUTH_SECRET: E2E_AUTH_SECRET,
      BETTER_AUTH_URL: E2E_BASE_URL,
    },
    encoding: "utf8",
  });
  const cookies = JSON.parse(out) as SessionCookie[];
  await context.addCookies(cookies.map((c) => ({ ...c, sameSite: c.sameSite ?? "Lax" })));
}
