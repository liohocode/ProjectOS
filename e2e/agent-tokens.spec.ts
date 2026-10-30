import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F15.5 — tạo token (hiện một lần), thu hồi, ở panel agent màn team.
test.afterAll(async () => {
  await withDb((db) => db.query(`DELETE FROM agent_tokens WHERE name LIKE 'e2e %'`));
});

test("tạo token → hiện token một lần; danh sách chỉ còn 4 ký tự cuối; thu hồi có xác nhận", async ({ page }) => {
  await page.goto("/rv-web/team");
  await page.waitForLoadState("networkidle");
  await page.locator(".member-list").getByText("Atlas", { exact: true }).click();
  const panel = page.locator(".team-aside");
  await panel.getByRole("button", { name: "Tạo token" }).click();

  const dialog = page.getByRole("dialog", { name: "Tạo token MCP cho Atlas" });
  await dialog.getByLabel("Tên token").fill("e2e Claude Code");
  await dialog.getByRole("button", { name: "Tạo token" }).click();
  const value = dialog.getByLabel("Token mới");
  await expect(value).toHaveText(/^mrd_[A-Za-z0-9_-]{43}$/);
  const token = (await value.textContent())!;
  await dialog.getByRole("button", { name: "Đã lưu token" }).click();

  const row = panel.locator(".token-row", { hasText: "e2e Claude Code" });
  await expect(row).toContainText(`…${token.slice(-4)}`);
  await expect(row).toContainText("chưa dùng");
  await expect(panel).not.toContainText(token);

  await row.getByRole("button", { name: "Thu hồi token e2e Claude Code" }).click();
  await page.getByRole("dialog", { name: "Thu hồi token e2e Claude Code?" }).getByRole("button", { name: "Thu hồi token" }).click();
  await expect(row).toContainText("Đã thu hồi");
  await expect(row.getByRole("button", { name: /Thu hồi/ })).toHaveCount(0);
});
