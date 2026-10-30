import { expect, test, type Locator } from "@playwright/test";

// F17.5 — "chạy N phút" tự tăng phía client (đồng hồ giả của Playwright thay cho chờ thật vài phút).
async function minutes(locator: Locator): Promise<number> {
  const match = /chạy (\d+) phút/.exec((await locator.textContent()) ?? "");
  expect(match, "nhãn dạng 'chạy N phút'").not.toBeNull();
  return Number(match![1]);
}

test("task row, activity rail, drawer: số phút tăng khi để trang mở", async ({ page }) => {
  await page.clock.install();
  await page.goto("/rv-web/work");
  await page.waitForLoadState("networkidle");

  const row = page.locator(".trow", { hasText: "T-405" }).locator(".trow-flag");
  const rail = page.locator(`.rail-item-link[href*="task=T-405"]`).locator(".rail-item-when");
  const rowBefore = await minutes(row);
  const railBefore = await minutes(rail);

  await page.clock.fastForward("05:00");
  await expect.poll(() => minutes(row)).toBeGreaterThanOrEqual(rowBefore + 5);
  await expect.poll(() => minutes(rail)).toBeGreaterThanOrEqual(railBefore + 5);

  await page.locator(".trow", { hasText: "T-405" }).click();
  const when = page.getByRole("dialog").locator(".drawer-log-item", { hasText: "Đang chạy" }).locator(".drawer-log-when");
  const drawerBefore = await minutes(when);
  await page.clock.fastForward("03:00");
  await expect.poll(() => minutes(when)).toBeGreaterThanOrEqual(drawerBefore + 3);
});
