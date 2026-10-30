import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F13.7 — gỡ thành viên khỏi dự án + lưu trữ dự án. Dự án riêng cho spec để không ảnh hưởng spec khác.
const PROJECT = "e2e-archive";

test.beforeAll(async () => {
  await withDb(async (db) => {
    await db.query(`INSERT INTO projects (id, code, name, status, "desc") VALUES ($1, 'EA', 'Dự án lưu trữ (e2e)', 'Chuẩn bị', '')`, [PROJECT]);
    await db.query(`INSERT INTO project_members ("projectId", "memberId") VALUES ($1, 'hieu'), ($1, 'agent-scout')`, [PROJECT]);
  });
});
test.afterAll(async () => {
  await withDb((db) => db.query("DELETE FROM projects WHERE id = $1", [PROJECT]));
});

test("gỡ thành viên: chặn khi còn task chưa Done; gỡ được khi không còn việc (có xác nhận)", async ({ page }) => {
  // Atlas còn task chưa Done ở rv-web → báo lỗi, vẫn trong dự án.
  await page.goto("/rv-web/team");
  await page.waitForLoadState("networkidle");
  await page.locator(".member-list").getByText("Atlas", { exact: true }).click();
  await page.getByRole("button", { name: "Gỡ khỏi dự án" }).click();
  let dialog = page.getByRole("dialog", { name: "Gỡ Atlas khỏi dự án?" });
  await dialog.getByRole("button", { name: "Gỡ khỏi dự án" }).click();
  await expect(dialog.getByRole("alert")).toContainText("task chưa Done");
  await dialog.getByRole("button", { name: "Huỷ" }).click();
  await expect(page.locator(".member-list")).toContainText("Atlas");

  await page.goto(`/${PROJECT}/team`);
  await page.waitForLoadState("networkidle");
  await page.locator(".member-list").getByText("Scout", { exact: true }).click();
  await page.getByRole("button", { name: "Gỡ khỏi dự án" }).click();
  dialog = page.getByRole("dialog", { name: "Gỡ Scout khỏi dự án?" });
  await dialog.getByRole("button", { name: "Gỡ khỏi dự án" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".member-list")).not.toContainText("Scout");
});

test("lưu trữ dự án → ẩn khỏi switcher, mờ ở portfolio; khôi phục → hiện lại", async ({ page }) => {
  await page.goto("/rv-web/portfolio");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Lưu trữ Dự án lưu trữ (e2e)" }).click();
  const dialog = page.getByRole("dialog", { name: "Lưu trữ dự án Dự án lưu trữ (e2e)?" });
  await dialog.getByRole("button", { name: "Lưu trữ dự án" }).click();
  await expect(dialog).toHaveCount(0);

  const card = page.locator(".project-card-wrap", { hasText: "Dự án lưu trữ (e2e)" });
  await expect(card).toHaveClass(/is-archived/);
  await expect(card).toContainText("Lưu trữ");
  await page.locator(".switcher-btn").click();
  await expect(page.locator(".switcher-dropdown")).not.toContainText("Dự án lưu trữ (e2e)");
  await page.keyboard.press("Escape");

  // Vẫn mở được từ portfolio.
  await card.locator(".project-card").click();
  await expect(page).toHaveURL(new RegExp(`/${PROJECT}/work`));

  await page.goto("/rv-web/portfolio");
  await page.getByRole("button", { name: "Khôi phục Dự án lưu trữ (e2e)" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Khôi phục dự án" }).click();
  await expect(card).not.toHaveClass(/is-archived/);
  await page.locator(".switcher-btn").click();
  await expect(page.locator(".switcher-dropdown")).toContainText("Dự án lưu trữ (e2e)");
});
