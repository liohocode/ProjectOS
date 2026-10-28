import { expect, test } from "@playwright/test";
import { withDb } from "./db";
import { E2E_STORAGE_STATE } from "./env";

// F15.3 — chặn route khi chưa đăng nhập, quay lại đúng trang sau đăng nhập, chỉ thành viên xem được dự án.

test.describe("chưa đăng nhập", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("mở trang trong app → về /login, nhớ trang đang mở", async ({ page }) => {
    await page.goto("/rv-web/docs?doc=prd-listing");
    await expect(page).toHaveURL(/\/login\?from=%2Frv-web%2Fdocs%3Fdoc%3Dprd-listing$/);
    await expect(page.locator(".login-card h4")).toHaveText("Đăng nhập");
  });

  test("cookie session giả lọt proxy nhưng bị server chặn → về /login", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "better-auth.session_token", value: "gia-mao.chu-ky-sai", url: baseURL! }]);
    await page.goto("/rv-web/work");
    await expect(page).toHaveURL(/\/login/);
  });

  test("server action không chạy được khi chưa đăng nhập (không ghi DB)", async ({ request }) => {
    // Gọi thẳng trang có action bằng POST không cookie → proxy chuyển hướng, không tới action.
    const res = await request.post("/rv-web/work", { maxRedirects: 0, data: {} });
    expect(res.status()).toBe(307);
    expect(res.headers().location).toContain("/login");
  });
});

test("đăng nhập xong quay lại đúng trang đã mở", async ({ browser }) => {
  // Chưa đăng nhập: mở /crm/docs → /login?from=/crm/docs.
  const anon = await browser.newContext({ storageState: { cookies: [], origins: [] } }); // newContext kế thừa storageState của project
  const page = await anon.newPage();
  await page.goto("/crm/docs");
  await expect(page).toHaveURL(/\/login\?from=%2Fcrm%2Fdocs$/);
  // Giả lập Google đã đăng nhập xong (cùng cookie phiên của auth.setup) rồi tải lại /login.
  const { cookies } = await (await browser.newContext({ storageState: E2E_STORAGE_STATE })).storageState();
  await anon.addCookies(cookies);
  await page.reload();
  await page.getByRole("link", { name: "Vào Meridian" }).click();
  await expect(page).toHaveURL(/\/crm\/docs$/);
  await anon.close();
});

test.describe("thành viên dự án", () => {
  const PRIVATE = "e2e-private";
  test.beforeAll(async () => {
    await withDb((db) =>
      db.query(
        `INSERT INTO projects (id, code, name, status, "desc") VALUES ($1, 'PV', 'Dự án riêng (e2e)', 'Đang chạy', 'Trung Hiếu không thuộc dự án')
         ON CONFLICT (id) DO NOTHING`,
        [PRIVATE],
      ),
    );
  });
  test.afterAll(async () => {
    await withDb((db) => db.query("DELETE FROM projects WHERE id = $1", [PRIVATE]));
  });

  test("dự án mình không thuộc → 404, switcher không liệt kê", async ({ page }) => {
    const res = await page.goto(`/${PRIVATE}/work`);
    expect(res?.status()).toBe(404);
    await expect(page.locator(".not-found-project", { hasText: "Dự án riêng" })).toHaveCount(0);

    await page.goto("/rv-web/work");
    await page.locator(".switcher-btn").click();
    await expect(page.getByText("Dự án riêng (e2e)")).toHaveCount(0);
  });
});
