import { expect, test } from "@playwright/test";

// Thao tác bàn phím chỉ có tác dụng sau khi React hydrate (HTML SSR đã có tabindex nhưng chưa có handler).
async function open(page: import("@playwright/test").Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

const activeIsInside = (selector: string) =>
  `document.activeElement?.closest(${JSON.stringify(selector)}) !== null`;

test("task drawer thao tác hoàn toàn bằng bàn phím", async ({ page }) => {
  await open(page, "/rv-web/work");
  const row = page.locator(".trow", { hasText: "T-418" });
  await expect(row).toHaveAttribute("tabindex", "0");
  await row.focus();
  await page.keyboard.press("Enter");

  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await expect.poll(() => page.evaluate(activeIsInside(".drawer-panel"))).toBe(true);

  // Tab xoay vòng trong drawer, không lọt ra trang phía sau
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  expect(await page.evaluate(activeIsInside(".drawer-panel"))).toBe(true);

  // Esc lần 1 đóng picker, lần 2 mới đóng drawer
  await drawer.getByRole("button", { name: "Giao cho agent" }).click();
  await expect(drawer.locator(".switcher-dropdown")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer.locator(".switcher-dropdown")).toBeHidden();
  await expect(drawer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();

  // Focus quay về đúng hàng đã mở drawer
  await expect(row).toBeFocused();
});

test("chọn thành viên bằng Enter/Space", async ({ page }) => {
  await open(page, "/rv-web/team");
  const vega = page.locator(".mrow", { hasText: "Vega" });
  await vega.focus();
  await page.keyboard.press("Enter");
  await expect(vega).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".panel-header-name")).toHaveText("Vega");

  const linh = page.locator(".mrow", { hasText: "Trần Mỹ Linh" });
  await linh.focus();
  await page.keyboard.press(" ");
  await expect(page.locator(".panel-header-name")).toHaveText("Trần Mỹ Linh");
});

test("dropdown dự án đóng bằng Esc và khi click ra ngoài", async ({ page }) => {
  await open(page, "/rv-web/work");
  const button = page.locator(".switcher-btn");
  await button.click();
  await expect(page.locator(".switcher-dropdown")).toBeVisible();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator(".switcher-dropdown")).toBeHidden();

  await button.click();
  await expect(page.locator(".switcher-dropdown")).toBeVisible();
  await page.locator("header h4").click();
  await expect(page.locator(".switcher-dropdown")).toBeHidden();
});
