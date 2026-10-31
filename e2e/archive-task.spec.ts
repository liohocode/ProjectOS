import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F21.4 — lưu trữ / khôi phục task từ drawer. T-409 seed: chưa lưu trữ, không chạy.
test.afterAll(async () => {
  await withDb((db) => db.query(`UPDATE tasks SET "archivedAt" = NULL WHERE id = 'T-409'`));
});

test("lưu trữ có xác nhận → ẩn khỏi list; mở bằng link thấy banner, khôi phục → về list", async ({ page }) => {
  await page.goto("/rv-web/work?task=T-409");
  const drawer = page.getByRole("dialog");
  await drawer.getByRole("button", { name: "Lưu trữ" }).click();
  const confirm = drawer.getByRole("region", { name: "Lưu trữ task" });
  await expect(confirm).toContainText("Lưu trữ T-409?");
  await confirm.getByRole("button", { name: "Lưu trữ" }).click();
  await expect(drawer.getByRole("status")).toContainText("Task đã lưu trữ");
  await expect(page.locator(".trow", { hasText: "T-409" })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText("Task đã lưu trữ");
  await page.getByRole("dialog").getByRole("button", { name: "Khôi phục" }).click();
  await expect(page.locator(".trow", { hasText: "T-409" })).toHaveCount(1);
  await expect(page.getByRole("dialog").getByRole("status")).toHaveCount(0);
});
