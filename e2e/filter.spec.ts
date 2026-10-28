import { expect, test } from "@playwright/test";

// F14.3 — nút "Lọc" ở header: tiêu chí nằm trong URL, server lọc, "Xoá lọc" trở về như cũ.

async function openFilter(page: import("@playwright/test").Page) {
  await page.locator(".filter-wrap > button").click();
  return page.getByRole("dialog", { name: "Bộ lọc" });
}

test("work: lọc theo stage + chỉ task bị block; badge đếm tiêu chí; xoá lọc", async ({ page }) => {
  await page.goto("/rv-web/work");
  const allRows = await page.locator(".trow").count();

  const panel = await openFilter(page);
  await panel.getByLabel("Stage").selectOption("Review");
  await expect(page).toHaveURL(/\?stage=Review$/);
  await expect(page.locator(".trow .c-stage")).toHaveText(["Review", "Review"]);
  await expect(page.locator(".filter-count")).toHaveText("1");

  await panel.getByLabel("Chỉ task bị block").check();
  await expect(page).toHaveURL(/stage=Review&blocked=1$/);
  await expect(page.locator(".empty-state", { hasText: "Không có task nào khớp bộ lọc" })).toBeVisible();
  await expect(page.locator(".filter-count")).toHaveText("2");

  await panel.getByRole("button", { name: "Xoá lọc" }).click();
  await expect(page).toHaveURL(/\/rv-web\/work$/);
  await expect(page.locator(".trow")).toHaveCount(allRows);
  await expect(page.locator(".filter-count")).toHaveCount(0);
});

test("work: link có lọc mở lại đúng; giữ ?task= khi đổi lọc", async ({ page }) => {
  await page.goto("/rv-web/work?blocked=1&task=T-418");
  await expect(page.locator(".trow")).toHaveCount(2); // T-418, T-402
  await expect(page.getByRole("dialog").locator("#task-drawer-title")).toHaveText("Viết migration cho trường pháp lý");
  await page.getByRole("dialog").getByRole("button", { name: "Đóng" }).click();

  const panel = await openFilter(page);
  await panel.getByLabel("Người / agent thực hiện").selectOption({ label: "Atlas (agent)" });
  await expect(page).toHaveURL(/blocked=1&who=agent-atlas$/);
  await expect(page.locator(".trow")).toHaveCount(1);
});

test("docs: chỉ tài liệu có revision chờ / do agent viết; bấm tài liệu giữ lọc", async ({ page }) => {
  await page.goto("/rv-web/docs");
  const panel = await openFilter(page);
  await panel.getByLabel("Chỉ tài liệu có revision chờ duyệt").check();
  await expect(page).toHaveURL(/\?pending=1$/);
  const tree = page.locator(".doc-tree");
  await expect(tree.getByRole("link", { name: "MCP tool spec" })).toBeVisible();
  await expect(tree.getByRole("link", { name: "Coding conventions" })).toHaveCount(0);

  await page.keyboard.press("Escape");
  await tree.getByRole("link", { name: "MCP tool spec" }).click();
  await expect(page).toHaveURL(/doc=mcp-spec&pending=1$/);

  await page.goto("/rv-web/docs?agent=1");
  await expect(tree.getByRole("link", { name: "Coding conventions" })).toHaveCount(0);
  await expect(tree.getByRole("link", { name: "Kiến trúc hệ thống" })).toBeVisible();
});

test("mcp: lọc phiên theo agent; nhật ký cùng agent", async ({ page }) => {
  await page.goto("/rv-web/mcp");
  const panel = await openFilter(page);
  await panel.getByLabel("Agent").selectOption({ label: "Vega" });
  await expect(page).toHaveURL(/\?agent=agent-vega$/);
  const tables = page.locator("table.table");
  await expect(tables.nth(0).locator("tbody tr")).toHaveCount(3);
  await expect(tables.nth(0).locator("tbody tr td:nth-child(2)")).toHaveText(["Vega", "Vega", "Vega"]);
  await expect(tables.nth(1).locator("tbody tr td:nth-child(2)")).toHaveText(["Vega", "Vega"]);
});

test("màn không có bộ lọc (team) → nút Lọc bị khoá", async ({ page }) => {
  await page.goto("/rv-web/team");
  await expect(page.locator("button", { hasText: "Lọc" })).toBeDisabled();
});
