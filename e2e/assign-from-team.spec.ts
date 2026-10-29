import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F13.3 — "Giao task" ở panel thành viên. T-401 (rv-web) seed giao cho Linh; trả lại sau.
let seed: { assigneeId: string; current: string };

test.beforeAll(async () => {
  seed = await withDb(async (db) => {
    const task = (await db.query(`SELECT "assigneeId" FROM tasks WHERE id = 'T-401'`)).rows[0];
    const nam = (await db.query(`SELECT current FROM members WHERE id = 'nam'`)).rows[0];
    return { assigneeId: task.assigneeId, current: nam.current };
  });
});

test.afterAll(async () => {
  await withDb(async (db) => {
    await db.query(`UPDATE tasks SET "assigneeId" = $1 WHERE id = 'T-401'`, [seed.assigneeId]);
    await db.query(`UPDATE members SET current = $1 WHERE id = 'nam'`, [seed.current]);
  });
});

test("giao task từ panel → cột 'Đang làm' của thành viên và task ở màn work cập nhật", async ({ page }) => {
  await page.goto("/rv-web/team");
  await page.waitForLoadState("networkidle");
  const row = page.locator(".mrow", { hasText: "Nam" });
  await row.click();
  await page.locator(".team-aside").getByRole("button", { name: "Giao task" }).click();

  const dialog = page.getByRole("dialog", { name: "Giao task cho Nguyễn Nam" });
  // Task Done không có trong danh sách; task đang giao cho Nam cũng không.
  await expect(dialog.locator(".assign-item", { hasText: "T-401" })).toBeVisible();
  await dialog.locator(".assign-item", { hasText: "T-401" }).click();
  await dialog.getByRole("button", { name: "Giao task" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(row.locator(".m-current")).toContainText("T-401");

  await page.goto("/rv-web/work");
  await expect(page.locator(".trow", { hasText: "T-401" }).locator(".asg-name")).toHaveText(/Nam/);
});

test("thành viên chưa thuộc dự án (xem Toàn tổ chức) → nút Giao task bị khoá", async ({ page }) => {
  await page.goto("/crm/team");
  await page.waitForLoadState("networkidle");
  await page.getByText("Toàn tổ chức").click();
  await page.locator(".mrow", { hasText: "Linh" }).click();
  await expect(page.locator(".team-aside").getByRole("button", { name: "Giao task" })).toBeDisabled();
});
