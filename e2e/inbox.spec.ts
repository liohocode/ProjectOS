import { expect, test } from "@playwright/test";
import { withDb } from "./db";
import { E2E_NAM_STORAGE_STATE } from "./env";

// F25.2 — inbox "Cần tôi xử lý" ở rv-web (seed): 2 revision chờ duyệt, T-396 + T-399 ở Review, T-402 + T-418 bị block.
test.afterAll(async () => {
  await withDb(async (db) => {
    await db.query(`UPDATE tasks SET stage = 'Review', status = 'Chờ review' WHERE id IN ('T-396', 'T-399')`);
  });
});

test.describe("thành viên thường", () => {
  test.use({ storageState: E2E_NAM_STORAGE_STATE });
  test("chỉ thấy task bị block, không có việc cần duyệt", async ({ page }) => {
    await page.goto("/rv-web/inbox");
    await expect(page.getByRole("link", { name: /Cần tôi xử lý/ })).toContainText("2");
    await expect(page.getByRole("region", { name: "Task bị block" })).toContainText("T-418");
    await expect(page.getByRole("region", { name: "Task chờ review" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Revision chờ duyệt" })).toHaveCount(0);
  });
});

test("lead thấy mọi việc chờ ở một chỗ, duyệt tại chỗ → badge giảm", async ({ page }) => {
  await page.goto("/rv-web/inbox");
  const nav = page.getByRole("link", { name: /Cần tôi xử lý/ });
  await expect(nav).toContainText("6");
  await expect(page.getByRole("region", { name: "Revision chờ duyệt" }).locator(".revision-item")).toHaveCount(2);
  await expect(page.getByRole("region", { name: "Task bị block" })).toContainText("T-402");

  const review = page.getByRole("region", { name: "Task chờ review" });
  const item = review.locator(".inbox-item", { hasText: "T-399" });
  await item.getByRole("button", { name: "Duyệt → Done" }).click();
  await expect(review).not.toContainText("T-399");
  await expect(nav).toContainText("5");

  // Mở task từ inbox → drawer ở màn work.
  await review.getByRole("link", { name: /T-396/ }).click();
  await expect(page).toHaveURL(/\/rv-web\/work\?task=T-396$/);
  await expect(page.getByRole("dialog")).toContainText("T-396");
});
