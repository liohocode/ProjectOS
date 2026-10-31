import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F24.2 — task agent đề xuất (MCP `tasks_create`) hiện ở trang feature + inbox; lead duyệt → task thật.
const TITLE = "E2E Nhập file CSV khách hàng";
const REJECTED = "E2E Viết lại bộ lọc";

test.beforeAll(async () => {
  await withDb(async (db) => {
    await db.query(
      `INSERT INTO task_proposals (id, "featureId", "proposedById", title, description, size, criteria)
       VALUES ('e2e-tp-1', 'FEAT-304', 'agent-bao', $1, 'Đọc **CSV**, báo dòng lỗi', 'M', ARRAY['Báo đúng số dòng lỗi', 'Có integration test']),
              ('e2e-tp-2', 'FEAT-304', 'agent-bao', $2, NULL, NULL, ARRAY[]::text[])`,
      [TITLE, REJECTED],
    );
  });
});

test.afterAll(async () => {
  await withDb(async (db) => {
    await db.query(`DELETE FROM tasks WHERE title = $1`, [TITLE]);
    await db.query(`DELETE FROM task_proposals WHERE id IN ('e2e-tp-1', 'e2e-tp-2')`);
  });
});

test("trang feature hiện task đề xuất; duyệt ở inbox → task thật kèm tiêu chí; từ chối cần lý do", async ({ page }) => {
  await page.goto("/crm/work/features/FEAT-304");
  const section = page.getByRole("region", { name: "Task đề xuất — chờ duyệt" });
  await expect(section).toContainText(TITLE);
  await expect(section).toContainText("Báo đúng số dòng lỗi");
  await expect(section.locator("strong", { hasText: "CSV" })).toBeVisible();

  await page.goto("/crm/inbox");
  const inbox = page.getByRole("region", { name: "Task đề xuất — chờ duyệt" });
  const row = inbox.locator(".proposal-row", { hasText: TITLE });
  await row.getByRole("button", { name: "Duyệt" }).click();
  await expect(inbox.locator(".proposal-row", { hasText: TITLE })).toHaveCount(0);

  const other = inbox.locator(".proposal-row", { hasText: REJECTED });
  await other.getByRole("button", { name: "Từ chối" }).click();
  await other.getByLabel("Lý do từ chối").fill("Trùng việc đã có");
  await other.getByRole("button", { name: "Từ chối task" }).click();
  await expect(page.getByRole("region", { name: "Task đề xuất — chờ duyệt" })).toHaveCount(0);

  await page.goto("/crm/work/features/FEAT-304");
  const task = page.locator(".feature-task", { hasText: TITLE });
  await expect(task).toBeVisible();
  await task.click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toContainText("Có integration test");
});
