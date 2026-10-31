import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F21.8 — phụ thuộc giữa task trong drawer. T-409 (TA) chờ T-401 (Dev, chưa Done).
test.afterAll(async () => {
  await withDb((db) => db.query(`DELETE FROM task_dependencies WHERE "taskId" = 'T-409'`));
});

test("thêm phụ thuộc → hàng task hiện 'chờ', task kia hiện 'đang chờ task này'; bỏ được", async ({ page }) => {
  await page.goto("/rv-web/work?task=T-409");
  const deps = page.getByRole("dialog").getByRole("region", { name: "Phụ thuộc" });
  await deps.getByLabel("Thêm task phụ thuộc").selectOption({ value: "T-401" });
  await deps.getByRole("button", { name: "Thêm" }).click();
  await expect(deps.getByRole("link", { name: /T-401/ })).toBeVisible();
  await expect(page.locator(".trow", { hasText: "T-409" })).toContainText("chờ T-401");

  await page.goto("/rv-web/work?task=T-401");
  await expect(page.getByRole("dialog").getByRole("region", { name: "Phụ thuộc" })).toContainText("Đang chờ task này");

  await page.goto("/rv-web/work?task=T-409");
  await page.getByRole("dialog").getByRole("button", { name: "Bỏ phụ thuộc T-401" }).click();
  await expect(page.locator(".trow", { hasText: "T-409" })).not.toContainText("chờ T-401");
});
