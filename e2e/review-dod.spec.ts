import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F22.6 — Definition of Done. Seed: crm có 3 mục DoD, T-620 ở Review.
test.afterAll(async () => {
  await withDb(async (db) => {
    await db.query(`UPDATE tasks SET stage = 'Review', status = 'Chờ review' WHERE id = 'T-620'`);
    await db.query(`DELETE FROM task_transitions WHERE "taskId" = 'T-620' AND note LIKE 'DoD:%'`);
  });
});

test("nút Duyệt khoá tới khi tick đủ DoD; Roadmap hiện DoD của dự án", async ({ page }) => {
  await page.goto("/crm/roadmap");
  await expect(page.getByRole("region", { name: "Definition of Done" })).toContainText("PR đã review");

  await page.goto("/crm/work?task=T-620");
  const drawer = page.getByRole("dialog");
  const approve = drawer.getByRole("button", { name: "Duyệt → Done" });
  await expect(approve).toBeDisabled();
  for (const item of ["Có test cho thay đổi", "PR đã review", "Cập nhật tài liệu liên quan"]) await drawer.getByLabel(item).check();
  await expect(approve).toBeEnabled();
  await approve.click();
  await expect(drawer.locator(".drawer-meta-row", { hasText: "Stage" })).toContainText("Done");
});
