import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// T-399 (rv-web) seed: stage Review, giao cho Nam. Test ghi thật xuống DB test rồi trả lại seed.
const TASK_ID = "T-399";

test.afterAll(async () => {
  await withDb((db) => db.query(`UPDATE tasks SET stage = 'Review', "assigneeId" = 'nam' WHERE id = $1`, [TASK_ID]));
});

test("drawer chuyển stage + giao agent ghi xuống DB, reload vẫn còn", async ({ page }) => {
  await page.goto("/rv-web/work");
  await page.waitForLoadState("networkidle");
  const row = page.locator(".trow", { hasText: TASK_ID });
  await row.click();
  const drawer = page.getByRole("dialog");

  await drawer.getByRole("button", { name: "Chuyển stage" }).click();
  await expect(drawer.locator(".drawer-head .tag").first()).toHaveText("Done");
  await expect(row.locator(".c-stage")).toHaveText("Done");

  await drawer.getByRole("button", { name: "Giao cho agent" }).click();
  await drawer.locator(".switcher-dropdown .switcher-item", { hasText: "Atlas" }).click();
  await expect(row.locator(".asg-name")).toHaveText(/Atlas/);
  await expect(drawer.getByRole("alert")).toHaveCount(0);

  await page.reload();
  const reloaded = page.locator(".trow", { hasText: TASK_ID });
  await expect(reloaded.locator(".c-stage")).toHaveText("Done");
  await expect(reloaded.locator(".asg-name")).toHaveText(/Atlas/);
});
