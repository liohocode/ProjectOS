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

const NEW_TASK_TITLE = "E2E: task tạo từ dialog";

test.describe("Task mới (dialog điều khiển bằng URL)", () => {
  test.afterAll(async () => {
    await withDb((db) => db.query("DELETE FROM tasks WHERE title = $1", [NEW_TASK_TITLE]));
  });

  test("nút ở header mở dialog qua ?new=1; Esc đóng và bỏ query", async ({ page }) => {
    await page.goto("/rv-web/work");
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: "Task mới" }).click();
    await expect(page).toHaveURL(/\?new=1$/);
    const dialog = page.getByRole("dialog", { name: "Task mới" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Tiêu đề")).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/rv-web\/work$/);
  });

  test("tạo task → đóng dialog, task xuất hiện đúng feature, reload vẫn còn", async ({ page }) => {
    await page.goto("/rv-web/work?new=1");
    await page.waitForLoadState("networkidle");
    const dialog = page.getByRole("dialog", { name: "Task mới" });
    await dialog.getByLabel("Tiêu đề").fill(NEW_TASK_TITLE);
    await dialog.getByLabel("Feature").selectOption("FEAT-119");
    await dialog.getByLabel("Stage").selectOption("Dev");
    await dialog.getByLabel("Người/agent thực hiện").selectOption("agent-vega");
    await dialog.getByLabel("Ước lượng (điểm)").fill("5");
    await dialog.getByRole("button", { name: "Tạo task" }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/rv-web\/work$/);
    const section = page.locator(".feature-section", { hasText: "FEAT-119" });
    const row = section.locator(".trow", { hasText: NEW_TASK_TITLE });
    await expect(row).toBeVisible();
    await expect(row.locator(".c-est")).toHaveText("5đ");

    await page.reload();
    await expect(page.locator(".trow", { hasText: NEW_TASK_TITLE })).toHaveCount(1);
  });
});
