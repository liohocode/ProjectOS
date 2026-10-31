import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F22.4 — liên kết PR / branch / commit trên task. Seed: T-396 có PR + branch; T-409 chưa có liên kết.
test.afterAll(async () => {
  await withDb((db) => db.query(`UPDATE tasks SET "prUrl" = NULL, branch = NULL, "commitSha" = NULL WHERE id = 'T-409'`));
});

test("drawer hiện link PR agent đã báo", async ({ page }) => {
  await page.goto("/rv-web/work?task=T-396");
  const pr = page.getByRole("dialog").getByRole("link", { name: "rever/web#412" });
  await expect(pr).toHaveAttribute("href", "https://github.com/rever/web/pull/412");
  await expect(page.getByRole("dialog").locator(".drawer-meta-row", { hasText: "Branch" })).toContainText("feat/T-396-autosave");
});

test("người nhập link PR / commit ở Sửa → hiện trong drawer; commit sai → báo lỗi", async ({ page }) => {
  await page.goto("/rv-web/work?task=T-409");
  const drawer = page.getByRole("dialog");
  await drawer.getByRole("button", { name: "Sửa" }).click();
  await drawer.getByLabel("Commit").fill("không-phải-hash");
  await drawer.getByRole("button", { name: "Lưu" }).click();
  await expect(drawer.getByRole("alert")).toContainText("Commit phải là mã hash");

  await drawer.getByLabel("Link PR").fill("https://github.com/rever/web/pull/500");
  await drawer.getByLabel("Commit").fill("9F3C2A1D");
  await drawer.getByRole("button", { name: "Lưu" }).click();
  await expect(drawer.getByRole("form", { name: "Sửa task" })).toHaveCount(0);
  await expect(drawer.getByRole("link", { name: "rever/web#500" })).toBeVisible();
  await expect(drawer.locator(".drawer-meta-row", { hasText: "Commit" })).toContainText("9f3c2a1");
});
