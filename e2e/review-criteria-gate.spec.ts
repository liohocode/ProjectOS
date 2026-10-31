import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F22.3 — "Chuyển stage" Dev → Review bị chặn khi còn acceptance criterion chưa đạt. T-409 seed ở stage TA.
test.beforeAll(async () => {
  await withDb(async (db) => {
    await db.query(`UPDATE tasks SET stage = 'Dev' WHERE id = 'T-409'`);
    await db.query(`INSERT INTO task_criteria (id, "taskId", text, position) VALUES ('e2e-gate', 'T-409', 'E2E đo p95 trên staging', 1)`);
  });
});
test.afterAll(async () => {
  await withDb(async (db) => {
    await db.query(`DELETE FROM task_criteria WHERE id = 'e2e-gate'`);
    await db.query(`UPDATE tasks SET stage = 'TA' WHERE id = 'T-409'`);
    await db.query(`DELETE FROM task_transitions WHERE "taskId" = 'T-409' AND "toStage" = 'Review'`);
  });
});

test("còn tiêu chí chưa đạt → không sang Review, hiện lý do; tick xong → chuyển được", async ({ page }) => {
  await page.goto("/rv-web/work?task=T-409");
  const drawer = page.getByRole("dialog");
  await drawer.getByRole("button", { name: "Chuyển stage" }).click();
  await expect(drawer.getByRole("alert")).toContainText('Còn 1 tiêu chí chưa đạt: "E2E đo p95 trên staging"');
  await expect(drawer.locator(".drawer-meta-row", { hasText: "Stage" })).toContainText("Dev");

  await drawer.getByRole("checkbox", { name: "E2E đo p95 trên staging" }).check();
  await expect(drawer.getByRole("region", { name: "Tiêu chí hoàn thành" })).toContainText("(1/1)");
  await drawer.getByRole("button", { name: "Chuyển stage" }).click();
  await expect(drawer.locator(".drawer-meta-row", { hasText: "Stage" })).toContainText("Review");
});
