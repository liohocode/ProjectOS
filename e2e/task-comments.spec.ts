import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F16.4 — bình luận agent ghi qua MCP (tasks_comment) hiện ở mục "Bình luận" của task drawer.
test.beforeAll(async () => {
  await withDb((db) =>
    db.query(`INSERT INTO task_comments (id, "taskId", "authorId", body) VALUES ('e2e-comment', 'T-405', 'agent-atlas', 'e2e: đã chạy xong test bộ lọc, chờ review')`),
  );
});
test.afterAll(async () => {
  await withDb((db) => db.query(`DELETE FROM task_comments WHERE id = 'e2e-comment'`));
});

test("drawer task hiện bình luận của agent", async ({ page }) => {
  await page.goto("/rv-web/work?task=T-405");
  const comments = page.getByRole("dialog").locator(".drawer-section", { hasText: "Bình luận" });
  await expect(comments).toContainText("Atlas");
  await expect(comments).toContainText("e2e: đã chạy xong test bộ lọc, chờ review");
});
