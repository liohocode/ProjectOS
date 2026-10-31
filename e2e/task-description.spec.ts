import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F21.7 — mô tả markdown, cỡ, mã kế hoạch, "Cần quyết định". Seed: T-396 có mô tả (bảng), T-418 cần quyết định; T-409 chưa có.
test.afterAll(async () => {
  await withDb((db) => db.query(`UPDATE tasks SET description = NULL, size = NULL, code = NULL, "needsDecision" = false WHERE id = 'T-409'`));
});

test("drawer hiện mô tả markdown mẫu; hàng task hiện nhãn Cần quyết định", async ({ page }) => {
  await page.goto("/rv-web/work?task=T-396");
  const desc = page.getByRole("region", { name: "Mô tả task" });
  await expect(desc.getByRole("table")).toContainText("Mất mạng");
  await expect(page.locator(".trow", { hasText: "T-418" })).toContainText("Cần quyết định");
});

test("sửa mô tả, cỡ, mã, cần quyết định → hiện trong drawer và hàng task", async ({ page }) => {
  await page.goto("/rv-web/work?task=T-409");
  const drawer = page.getByRole("dialog");
  await drawer.getByRole("button", { name: "Sửa" }).click();
  await drawer.getByLabel("Mô tả (markdown)").fill("Đo **p95** trên staging\n\n- bộ lọc giá\n- bộ lọc khu vực");
  await drawer.getByLabel("Cỡ").selectOption("M");
  await drawer.getByLabel("Mã trong kế hoạch").fill("F99.1");
  await drawer.getByLabel("Cần người quyết định (agent không tự làm)").check();
  await drawer.getByRole("button", { name: "Lưu", exact: true }).click();

  const desc = drawer.getByRole("region", { name: "Mô tả task" });
  await expect(desc.locator("strong")).toHaveText("p95");
  await expect(desc.getByRole("listitem")).toHaveCount(2);
  await expect(drawer.locator(".drawer-head")).toContainText("F99.1");
  await expect(drawer.locator(".drawer-head")).toContainText("Cần quyết định");
  await expect(page.locator(".trow", { hasText: "T-409" })).toContainText("F99.1");
});
