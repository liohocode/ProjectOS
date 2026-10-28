import { expect, test } from "@playwright/test";
import { E2E_GOOGLE_CLIENT_ID } from "./env";

// F15.2 — không gọi Google thật: kiểm tra trang /login và URL Better Auth chuyển sang Google.
// Client ID/secret giả đặt trong playwright.config.ts (webServer.env).

// Các test ở đây xem /login khi CHƯA đăng nhập.
test.use({ storageState: { cookies: [], origins: [] } });

test("trang /login có nút đăng nhập Google", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator(".login-card h4")).toHaveText("Đăng nhập");
  await expect(page.getByRole("button", { name: "Đăng nhập bằng Google" })).toBeEnabled();
  await expect(page.locator(".login-error")).toHaveCount(0);
});

test("bị từ chối → /login hiện lý do bằng tiếng Việt", async ({ page }) => {
  await page.goto("/login?error=not_a_member&error_description=la%40gmail.com");
  await expect(page.locator(".login-error")).toContainText("chưa được mời vào Meridian");

  await page.goto("/login?error=state_mismatch");
  await expect(page.locator(".login-error")).toContainText("Đăng nhập không thành công");
});

test("bắt đầu đăng nhập → chuyển sang Google với callback đúng và quay về trang cũ", async ({ request, baseURL }) => {
  const res = await request.post("/api/auth/sign-in/social", {
    headers: { origin: baseURL! },
    data: { provider: "google", callbackURL: "/crm/docs", errorCallbackURL: "/login?from=%2Fcrm%2Fdocs" },
  });
  expect(res.ok()).toBe(true);
  const { url } = (await res.json()) as { url: string };
  const google = new URL(url);
  expect(google.host).toBe("accounts.google.com");
  expect(google.searchParams.get("client_id")).toBe(E2E_GOOGLE_CLIENT_ID);
  expect(google.searchParams.get("redirect_uri")).toBe(`${baseURL}/api/auth/callback/google`);
  expect(google.searchParams.get("prompt")).toBe("select_account");
});

test("từ chối callbackURL trỏ ra ngoài (chống open redirect)", async ({ request, baseURL }) => {
  const res = await request.post("/api/auth/sign-in/social", {
    headers: { origin: baseURL! },
    data: { provider: "google", callbackURL: "https://evil.example.com/" },
  });
  expect(res.status()).toBe(403);
});
