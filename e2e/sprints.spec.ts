import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F21.3 — sprint ở rv-web. Seed: một sprint "Sprint 14" (hiện tại), mọi task thuộc sprint đó.
test.afterAll(async () => {
  await withDb(async (db) => {
    const seed = `(SELECT id FROM sprints WHERE "projectId" = 'rv-web' AND name = 'Sprint 14')`;
    await db.query(`UPDATE projects SET "currentSprintId" = ${seed} WHERE id = 'rv-web'`);
    await db.query(`UPDATE tasks SET "sprintId" = ${seed} WHERE id = 'T-409'`);
    await db.query(`DELETE FROM sprints WHERE name = 'E2E Sprint 15'`);
  });
});

test("tạo sprint mới làm hiện tại → header đổi; xếp task vào sprint → lọc 'Sprint hiện tại' chỉ còn task đó", async ({ page }) => {
  await page.goto("/rv-web/work");
  await page.getByRole("link", { name: "Sprint", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Sprint" });
  await expect(dialog.getByRole("listitem").filter({ hasText: "Sprint 14" })).toContainText("Hiện tại");
  await dialog.getByLabel("Tên sprint").fill("E2E Sprint 15");
  await dialog.getByLabel("Bắt đầu").fill("2026-08-27");
  await dialog.getByLabel("Kết thúc").fill("2026-09-09");
  await dialog.getByRole("button", { name: "Tạo sprint" }).click();
  await expect(dialog.getByRole("listitem").filter({ hasText: "E2E Sprint 15" })).toContainText("Hiện tại");
  await expect(page.locator(".header-context")).toContainText("E2E Sprint 15 · 27/08–09/09");
  await dialog.getByRole("button", { name: "Đóng" }).click();

  await page.goto("/rv-web/work?task=T-409");
  const drawer = page.getByRole("dialog");
  await drawer.getByLabel("Sprint").selectOption({ label: "E2E Sprint 15 · 27/08–09/09 (hiện tại)" });
  await expect(drawer.getByLabel("Sprint")).toHaveValue(/.+/);

  await page.goto("/rv-web/work?sprint=current");
  await expect(page.locator(".trow")).toHaveCount(1);
  await expect(page.locator(".trow")).toContainText("T-409");
  await page.goto("/rv-web/work?sprint=none");
  await expect(page.locator(".trow")).toHaveCount(0);
});
