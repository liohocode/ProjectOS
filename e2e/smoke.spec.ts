import { expect, test } from "@playwright/test";

const SCREEN_TITLES: Record<string, string> = {
  portfolio: "Tất cả dự án đang phát triển",
  docs: "Docs gắn feature và kho tri thức",
  work: "Feature · Task · Timeline",
  team: "Dev và AI coding agents",
  mcp: "Kết nối MCP cho agent",
};

test("/ chuyển về màn Feature & Task của dự án mặc định", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/rv-web\/work$/);
  await expect(page.locator("header h4")).toHaveText(SCREEN_TITLES.work);
});

for (const [screen, title] of Object.entries(SCREEN_TITLES)) {
  test(`màn ${screen} render đúng tiêu đề và sidebar`, async ({ page }) => {
    await page.goto(`/rv-web/${screen}`);
    await expect(page.locator("header h4")).toHaveText(title);
    await expect(page.locator(".nav-item.is-active")).toHaveCount(1);
    await expect(page.locator(".switcher-name")).toHaveText("Rever Web v3");
  });
}

test("mở task drawer của task bị block", async ({ page }) => {
  await page.goto("/rv-web/work");
  await page.locator(".trow", { hasText: "T-418" }).click();
  const drawer = page.locator(".drawer-panel");
  await expect(drawer).toBeVisible();
  await expect(drawer.locator(".drawer-warning")).toContainText("ADR-11");
  await drawer.getByRole("button", { name: "Đóng" }).click();
  await expect(drawer).toBeHidden();
});

test("đổi dự án qua switcher giữ nguyên màn", async ({ page }) => {
  await page.goto("/rv-web/team");
  await page.locator(".switcher-btn").click();
  await page.locator(".switcher-item", { hasText: "Rever Mobile App" }).click();
  await expect(page).toHaveURL(/\/rv-app\/team$/);
  await expect(page.locator(".switcher-name")).toHaveText("Rever Mobile App");
});

test("duyệt revision ghi xuống DB", async ({ page }) => {
  await page.goto("/rv-web/docs?doc=prd-listing");
  const strip = page.locator(".kb-strip");
  await expect(strip).toContainText("Revision chờ duyệt 2");

  const approve = page.getByRole("button", { name: "Duyệt" });
  await expect(approve).toHaveCount(1);
  await approve.click();

  // Sau revalidatePath trang render lại: revision hết chờ → nút biến mất, số đếm giảm.
  // (Chưa có dòng "Đã duyệt bởi …" — làm ở F12.4.)
  await expect(approve).toHaveCount(0);
  await expect(strip).toContainText("Revision chờ duyệt 1");

  await page.reload();
  await expect(page.getByRole("button", { name: "Duyệt" })).toHaveCount(0);
  await expect(page.locator(".kb-strip")).toContainText("Revision chờ duyệt 1");
});
