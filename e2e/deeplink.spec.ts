import { expect, test } from "@playwright/test";

// F14.1 — trạng thái màn work nằm trong URL: `?task=` mở drawer, `?view=timeline` mở timeline.

test("mở URL có ?task= → drawer đúng task; copy link sang tab mới vẫn đúng", async ({ page, context }) => {
  await page.goto("/rv-web/work?task=T-418");
  const drawer = page.getByRole("dialog");
  await expect(drawer.locator("#task-drawer-title")).toHaveText("Viết migration cho trường pháp lý");

  const other = await context.newPage();
  await other.goto(page.url());
  await expect(other.getByRole("dialog").locator("#task-drawer-title")).toHaveText("Viết migration cho trường pháp lý");
  await other.close();
});

test("bấm task → URL có ?task=; Back đóng drawer; nút đóng bỏ ?task= khỏi URL", async ({ page }) => {
  await page.goto("/rv-web/work");
  await page.locator(".trow", { hasText: "T-401" }).click();
  await expect(page).toHaveURL(/\?task=T-401$/);
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/rv-web\/work$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.locator(".trow", { hasText: "T-401" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Đóng" }).click();
  await expect(page).toHaveURL(/\/rv-web\/work$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("?view=timeline mở timeline; đổi view cập nhật URL không thêm lịch sử", async ({ page }) => {
  await page.goto("/rv-web/work?view=timeline");
  await expect(page.locator(".timeline-grid")).toBeVisible();

  await page.locator(".seg-opt", { hasText: "Theo feature" }).click();
  await expect(page).toHaveURL(/\/rv-web\/work$/);
  await page.locator(".seg-opt", { hasText: "Timeline" }).click();
  await expect(page).toHaveURL(/\?view=timeline$/);
  await expect(page.locator(".timeline-grid")).toBeVisible();
});

test("banner block và activity rail mở task qua URL", async ({ page }) => {
  await page.goto("/rv-web/work");
  await page.locator(".banner-block").getByRole("button", { name: "Xem tất cả" }).click();
  await expect(page).toHaveURL(/\?task=T-418$/);

  await page.getByRole("dialog").getByRole("button", { name: "Đóng" }).click();
  await page.locator(".rail-item-link", { hasText: "T-418" }).click();
  await expect(page).toHaveURL(/\?task=T-418$/);
  await expect(page.getByRole("dialog")).toBeVisible();
});
