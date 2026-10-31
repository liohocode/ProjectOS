import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F20.2 — tech lead sửa hồ sơ thành viên, cấp quyền tech lead trên UI.
test.afterAll(async () => {
  await withDb((db) => db.query(`UPDATE members SET "isTechLead" = false, role = 'Frontend' WHERE id = 'linh'`));
});

test("cấp tech lead cho Trần Mỹ Linh → panel hiện nhãn Tech lead", async ({ page }) => {
  await page.goto("/rv-web/team");
  await page.locator(".member-list").getByText("Trần Mỹ Linh", { exact: true }).click();
  const panel = page.locator(".team-aside");
  await expect(panel).not.toContainText("Tech lead");
  await panel.getByRole("button", { name: "Sửa hồ sơ Trần Mỹ Linh" }).click();
  const dialog = page.getByRole("dialog", { name: "Sửa thành viên Trần Mỹ Linh" });
  await dialog.getByLabel(/Tech lead —/).check();
  await dialog.getByRole("button", { name: "Lưu" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(panel.locator(".panel-header")).toContainText("Tech lead");
});
