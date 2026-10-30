import { expect, test } from "@playwright/test";
import { E2E_NAM_STORAGE_STATE } from "./env";
import { signInAs } from "./session";

// F15.6 — UI theo quyền: Nguyễn Nam (thành viên thường của rv-web, không phải tech lead).
test.describe("thành viên thường", () => {
  test.use({ storageState: E2E_NAM_STORAGE_STATE });

  test("không thấy nút Duyệt / Từ chối / Sửa tài liệu; vẫn xem được thay đổi", async ({ page }) => {
    await page.goto("/rv-web/docs?doc=mcp-spec");
    const block = page.locator(".revision-block");
    await expect(block.getByRole("button", { name: "Xem thay đổi" })).toBeVisible();
    await expect(block.getByRole("button", { name: "Duyệt" })).toHaveCount(0);
    await expect(block.getByRole("button", { name: "Từ chối" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Sửa" })).toHaveCount(0);
  });

  test("nút chính của tech lead bị khoá; nút của thành viên vẫn dùng được", async ({ page }) => {
    await page.goto("/rv-web/portfolio");
    await expect(page.getByRole("button", { name: "Dự án mới" })).toBeDisabled();
    await expect(page.getByRole("button", { name: /^Lưu trữ / })).toHaveCount(0);

    await page.goto("/rv-web/team");
    await expect(page.getByRole("button", { name: "Thêm thành viên" })).toBeDisabled();
    await page.locator(".member-list").getByText("Atlas", { exact: true }).click();
    await expect(page.getByRole("button", { name: "Gỡ khỏi dự án" })).toHaveCount(0);
    await expect(page.locator(".team-aside").getByRole("button", { name: "Sửa" })).toHaveCount(0);

    await page.goto("/rv-web/mcp");
    await expect(page.getByRole("button", { name: "Kết nối server" })).toBeDisabled();

    await page.goto("/rv-web/work");
    await expect(page.getByRole("link", { name: "Task mới" })).toBeVisible();
  });
});

test("footer hiện người đăng nhập; Đăng xuất → về /login, trang trong app đòi đăng nhập lại", async ({ browser }) => {
  // Session riêng (không dùng storageState chung) — đăng xuất thu hồi session này.
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  await signInAs(context, "nam");
  const page = await context.newPage();
  await page.goto("/rv-web/work");
  const account = page.getByRole("button", { name: "Tài khoản: Nguyễn Nam" });
  await expect(account).toContainText("Nguyễn Nam");
  await account.click();
  await page.getByRole("menuitem", { name: "Đăng xuất" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/rv-web/work");
  await expect(page).toHaveURL(/\/login/);
  await context.close();
});
