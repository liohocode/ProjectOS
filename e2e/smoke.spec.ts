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

test("feature chưa giao hiện ở list view; timeline vẽ từ DB", async ({ page }) => {
  await page.goto("/rv-web/work");
  const planned = page.locator(".feature-section", { hasText: "FEAT-126" });
  await expect(planned.locator(".trow-empty")).toContainText("Chưa có task");
  await expect(planned.locator(".avatar-none")).toBeVisible();

  await page.locator(".seg-opt", { hasText: "Timeline" }).click();
  await expect(page.locator(".timeline-bar")).toHaveCount(5);
  await expect(page.locator(".timeline-bar.kind-none")).toHaveText("Chưa bắt đầu");
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
  // Skeleton loading (docs/loading.tsx) dùng lại class .kb-strip để giữ bố cục → lọc theo chữ của strip thật.
  const strip = page.locator(".kb-strip", { hasText: "KHO TRI THỨC" });
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
  await expect(strip).toContainText("Revision chờ duyệt 1");
});

test("dự án không tồn tại → trang 404 có danh sách dự án để chọn", async ({ page }) => {
  const res = await page.goto("/khong-ton-tai/work");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Không tìm thấy dự án hoặc trang này" })).toBeVisible();
  await page.locator(".not-found-project", { hasText: "Rever Mobile App" }).click();
  await expect(page).toHaveURL(/\/rv-app\/work$/);
});
