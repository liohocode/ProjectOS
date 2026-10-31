import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F21.9 — trang chi tiết feature. Seed: FEAT-118 có mục tiêu / phạm vi / ghi chú; FEAT-119 chưa có.
test.afterAll(async () => {
  await withDb((db) => db.query(`UPDATE features SET goal = NULL, scope = NULL, notes = NULL WHERE id = 'FEAT-119'`));
});

test("mở từ màn work → thấy mục tiêu, phạm vi, task, ghi chú; task mở drawer", async ({ page }) => {
  await page.goto("/rv-web/work");
  await page.getByRole("link", { name: "Listing rework" }).click();
  await expect(page).toHaveURL(/\/rv-web\/work\/features\/FEAT-118$/);
  await expect(page.getByRole("region", { name: "Mục tiêu" }).locator("strong")).toHaveText("dưới 3 phút");
  await expect(page.getByRole("region", { name: "Quyết định / ghi chú" })).toContainText("ADR-11");
  await page.getByRole("region", { name: "Task của feature" }).getByRole("link", { name: /T-396/ }).click();
  await expect(page).toHaveURL(/\/rv-web\/work\?task=T-396$/);
});

test("tech lead sửa nội dung → hiện markdown", async ({ page }) => {
  await page.goto("/rv-web/work/features/FEAT-119");
  await page.getByRole("button", { name: "Sửa nội dung" }).click();
  await page.getByLabel("Mục tiêu (markdown)").fill("Bộ lọc trả kết quả **dưới 300ms**");
  await page.getByLabel("Quyết định / ghi chú (markdown)").fill("- Cache ở Redis");
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(page.getByRole("region", { name: "Mục tiêu" }).locator("strong")).toHaveText("dưới 300ms");
  await expect(page.getByRole("region", { name: "Quyết định / ghi chú" }).getByRole("listitem")).toHaveText("Cache ở Redis");
});

test("F28.1: trang chi tiết hiện phase + phụ thuộc; đổi phase", async ({ page }) => {
  await page.goto("/rv-web/work/features/FEAT-120");
  const deps = page.getByRole("region", { name: "Phụ thuộc feature" });
  await expect(deps.getByRole("link", { name: /FEAT-118/ })).toBeVisible();
  await page.getByLabel("Phase của feature").selectOption({ label: "1 · Đăng tin mới" });
  await expect(page.getByLabel("Phase của feature")).toHaveValue(/.+/);
  await page.reload();
  await expect(page.getByLabel("Phase của feature").locator("option:checked")).toHaveText("1 · Đăng tin mới");
  await page.getByLabel("Phase của feature").selectOption({ label: "2 · Tìm kiếm & agent" });
  await expect(page.getByLabel("Phase của feature").locator("option:checked")).toHaveText("2 · Tìm kiếm & agent");
});
