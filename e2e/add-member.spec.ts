import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F13.2 — "Thêm thành viên" ở màn team (dự án crm). Ghi thật xuống DB test rồi trả lại.
test.afterAll(async () => {
  await withDb(async (db) => {
    await db.query(`DELETE FROM project_members WHERE "projectId" = 'crm' AND "memberId" = 'agent-vega'`);
    await db.query(`DELETE FROM members WHERE name = 'E2E Lyra'`);
  });
});

test("Từ tổ chức: gán agent có sẵn → hiện trong 'Dự án này'", async ({ page }) => {
  await page.goto("/crm/team");
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".member-list")).not.toContainText("Vega");
  await page.getByRole("link", { name: "Thêm thành viên" }).click();
  const dialog = page.getByRole("dialog", { name: "Thêm thành viên" });
  await dialog.getByLabel("Người / agent").selectOption("agent-vega");
  await dialog.getByRole("button", { name: "Thêm vào dự án" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".member-list")).toContainText("Vega");
});

test("Tạo mới agent → hiện trong danh sách và trong picker 'Giao cho agent' ở màn work", async ({ page }) => {
  await page.goto("/crm/team?new=1");
  await page.waitForLoadState("networkidle");
  const dialog = page.getByRole("dialog", { name: "Thêm thành viên" });
  await dialog.getByText("Tạo mới").click();
  await dialog.getByLabel("Loại").selectOption("agent");
  await dialog.getByLabel("Tên").fill("E2E Lyra");
  await dialog.getByLabel("Vai trò").fill("QA agent");
  await dialog.getByLabel("Skills").fill("Testing, Playwright");
  await expect(dialog.getByLabel("Email Google")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Thêm vào dự án" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".member-list")).toContainText("E2E Lyra");

  await page.goto("/crm/work");
  await page.waitForLoadState("networkidle");
  await page.locator(".trow").first().click();
  const drawer = page.getByRole("dialog");
  await drawer.getByRole("button", { name: "Giao cho agent" }).click();
  await expect(drawer.locator(".switcher-dropdown .switcher-item", { hasText: "E2E Lyra" })).toBeVisible();
});
