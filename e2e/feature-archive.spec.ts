import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F21.10 — lưu trữ / khôi phục feature (rv-web FEAT-126: chưa giao, không có task), đổi thứ tự ưu tiên (FEAT-119 lên trên FEAT-118).
test.afterAll(async () => {
  await withDb(async (db) => {
    await db.query(`UPDATE features SET "archivedAt" = NULL, position = NULL WHERE "projectId" = 'rv-web'`);
  });
});

test("lưu trữ feature có xác nhận → biến khỏi màn work; khôi phục từ trang chi tiết", async ({ page }) => {
  await page.goto("/rv-web/work/features/FEAT-126");
  await page.getByRole("button", { name: "Lưu trữ" }).click();
  await page.getByRole("region", { name: "Lưu trữ feature" }).getByRole("button", { name: "Lưu trữ" }).click();
  await expect(page.getByRole("status")).toContainText("Feature đã lưu trữ");

  await page.goto("/rv-web/work");
  await expect(page.locator("#feature-FEAT-126")).toHaveCount(0);

  await page.goto("/rv-web/work/features/FEAT-126");
  await page.getByRole("button", { name: "Khôi phục" }).click();
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.goto("/rv-web/work");
  await expect(page.locator("#feature-FEAT-126")).toHaveCount(1);
});

test("đưa feature lên đầu danh sách", async ({ page }) => {
  await page.goto("/rv-web/work");
  const ids = async () => page.locator(".feature-section").evaluateAll((els) => els.map((e) => e.id));
  const before = await ids();
  await page.getByRole("button", { name: "Đưa FEAT-119 lên" }).click();
  await expect.poll(ids).toEqual([before[1], before[0], ...before.slice(2)]);
});
