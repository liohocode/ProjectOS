import { expect, test } from "@playwright/test";

// F13.4 — "Xem log" ở panel thành viên.
test("người → dialog hoạt động; agent → nhật ký MCP lọc theo agent", async ({ page }) => {
  await page.goto("/rv-web/team");
  await page.waitForLoadState("networkidle");
  const aside = page.locator(".team-aside");

  await page.locator(".mrow", { hasText: "Nguyễn Nam" }).click();
  await aside.getByRole("button", { name: "Xem log" }).click();
  const dialog = page.getByRole("dialog", { name: "Hoạt động của Nguyễn Nam" });
  await expect(dialog.locator(".panel-activity-item").first()).toBeVisible();
  await expect(dialog).toContainText("Mở PR #482");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await page.locator(".mrow", { hasText: "Atlas" }).click();
  await aside.getByRole("link", { name: "Xem log" }).click();
  await expect(page).toHaveURL(/\/rv-web\/mcp\?agent=agent-atlas$/);
  await expect(page.locator(".filter-count")).toHaveText("1");
});
