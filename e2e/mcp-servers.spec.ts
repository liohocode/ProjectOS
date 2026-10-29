import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F13.6 — "Kết nối server" + sửa/xoá server ngoài ở màn MCP. Xoá server tạo ra sau khi chạy.
test.afterAll(async () => {
  await withDb((db) => db.query("DELETE FROM mcp_servers WHERE id LIKE 'e2e-%'"));
});

test("kết nối server → thẻ mới 'Giới hạn' + footer tăng tổng; sửa; xoá có xác nhận", async ({ page }) => {
  await page.goto("/rv-web/mcp");
  await page.waitForLoadState("networkidle");
  const footer = page.getByText(/MCP: \d+\/\d+ server online/);
  await expect(footer).toHaveText("MCP: 2/3 server online");
  // Server nội bộ không có nút sửa/xoá.
  await expect(page.getByRole("button", { name: "Xoá meridian-core" })).toHaveCount(0);

  await page.getByRole("link", { name: "Kết nối server" }).click();
  const dialog = page.getByRole("dialog", { name: "Kết nối server" });
  await dialog.getByLabel("Tên server").fill("e2e GitHub Tools");
  await dialog.getByLabel("URL").fill("https://e2e-github.example.com/mcp");
  await dialog.getByLabel("Tool").fill("repo.read, pr.create");
  await dialog.getByRole("button", { name: "Kết nối" }).click();
  await expect(dialog).toHaveCount(0);

  const card = page.locator(".card", { hasText: "e2e GitHub Tools" });
  await expect(card).toContainText("Giới hạn");
  await expect(card).toContainText("pr.create");
  await expect(card).toContainText("chưa có lệnh nào");
  await expect(footer).toHaveText("MCP: 2/4 server online");

  await card.getByRole("button", { name: "Sửa e2e GitHub Tools" }).click();
  const edit = page.getByRole("dialog", { name: /Sửa server/ });
  await expect(edit.getByLabel("Tool")).toHaveValue("repo.read, pr.create");
  await edit.getByLabel("Tool").fill("repo.read, pr.create, issue.list");
  await edit.getByRole("button", { name: "Lưu" }).click();
  await expect(card).toContainText("issue.list");

  await card.getByRole("button", { name: "Xoá e2e GitHub Tools" }).click();
  await page.getByRole("dialog", { name: /Xoá server/ }).getByRole("button", { name: "Xoá server" }).click();
  await expect(page.locator(".card", { hasText: "e2e GitHub Tools" })).toHaveCount(0);
  await expect(footer).toHaveText("MCP: 2/3 server online");
});
