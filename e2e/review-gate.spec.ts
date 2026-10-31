import { expect, test } from "@playwright/test";
import { withDb } from "./db";
import { E2E_NAM_STORAGE_STATE } from "./env";

// F22.2 — cổng review: T-396 (agent, stage Review trong seed) và T-399 (người) chờ duyệt ở rv-web.
test.afterAll(async () => {
  await withDb(async (db) => {
    await db.query(`UPDATE tasks SET stage = 'Review', status = 'Chờ review' WHERE id IN ('T-396', 'T-399')`);
    await db.query(`DELETE FROM task_comments WHERE body LIKE 'Trả lại sau review: E2E%'`);
  });
});

test.describe("thành viên thường", () => {
  test.use({ storageState: E2E_NAM_STORAGE_STATE });
  test("thấy danh sách chờ review nhưng không có nút duyệt trong drawer", async ({ page }) => {
    await page.goto("/rv-web/work");
    const queue = page.getByRole("region", { name: "Task chờ review" });
    await expect(queue).toContainText("T-396");
    await queue.getByText("T-396").click();
    await expect(page.getByRole("dialog").getByRole("button", { name: "Duyệt → Done" })).toHaveCount(0);
  });
});

test("lead trả lại kèm lý do → task về Dev + bình luận; duyệt task còn lại → Done", async ({ page }) => {
  await page.goto("/rv-web/work");
  const queue = page.getByRole("region", { name: "Task chờ review" });
  await queue.getByText("T-396").click();
  const drawer = page.getByRole("dialog");
  await drawer.getByRole("button", { name: "Trả lại" }).click();
  await drawer.getByLabel("Lý do trả lại").fill("E2E thiếu test lưu nháp khi mất mạng");
  await drawer.getByRole("button", { name: "Trả lại" }).click();
  await expect(drawer.locator(".drawer-section", { hasText: "Bình luận" })).toContainText("E2E thiếu test lưu nháp khi mất mạng");
  await expect(drawer.getByRole("button", { name: "Duyệt → Done" })).toHaveCount(0);
  await expect(queue).not.toContainText("T-396");

  await page.goto("/rv-web/work?task=T-399");
  await page.getByRole("dialog").getByRole("button", { name: "Duyệt → Done" }).click();
  await expect(page.getByRole("region", { name: "Task chờ review" })).toHaveCount(0);
});
