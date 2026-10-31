import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F21.5 — người bình luận trong drawer, xen kẽ với bình luận agent gửi qua MCP (F16.4).
test.beforeAll(async () => {
  await withDb((db) =>
    db.query(`INSERT INTO task_comments (id, "taskId", "authorId", body, "createdAt") VALUES ('e2e-agent-q', 'T-407', 'agent-vega', 'e2e: dùng TTL 5 phút được không?', NOW() - INTERVAL '1 minute')`),
  );
});
test.afterAll(async () => {
  await withDb((db) => db.query(`DELETE FROM task_comments WHERE body LIKE 'e2e:%' AND "taskId" = 'T-407'`));
});

test("người trả lời bình luận agent → hiện đúng thứ tự, ô nhập trống lại", async ({ page }) => {
  await page.goto("/rv-web/work?task=T-407");
  const comments = page.getByRole("region", { name: "Bình luận" });
  await comments.getByLabel("Viết bình luận").fill("e2e: được, nhớ thêm test hết hạn");
  await comments.getByRole("button", { name: "Gửi" }).click();
  await expect(comments.locator(".drawer-comment").last()).toContainText("e2e: được, nhớ thêm test hết hạn");
  await expect(comments.locator(".drawer-comment").last()).toContainText("Trung Hiếu");
  const bodies = await comments.locator(".drawer-comment-body").allTextContents();
  expect(bodies.indexOf("e2e: dùng TTL 5 phút được không?")).toBe(bodies.length - 2);
  await expect(comments.getByLabel("Viết bình luận")).toHaveValue("");
});
