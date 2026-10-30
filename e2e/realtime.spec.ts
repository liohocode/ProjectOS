import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F17.3 — hai tab cùng dự án: thao tác ở tab A → tab B cập nhật trong một chu kỳ polling (~12 giây), không reload.
test.afterAll(async () => {
  await withDb(async (db) => {
    await db.query(`UPDATE tasks SET blocked = NULL, "blockedFull" = NULL WHERE id = 'T-396'`);
    await db.query(`DELETE FROM activity_events WHERE text LIKE '%E2E realtime%'`);
    await db.query(`DELETE FROM member_activity WHERE text LIKE '%E2E realtime%'`);
  });
});

test("block task ở tab A → activity rail + banner block ở tab B tự cập nhật", async ({ context }) => {
  test.setTimeout(60_000);
  const tabB = await context.newPage();
  await tabB.goto("/rv-web/work");
  await tabB.waitForLoadState("networkidle");
  await expect(tabB.locator(".rail")).not.toContainText("E2E realtime");

  const tabA = await context.newPage();
  await tabA.goto("/rv-web/work?task=T-396");
  const drawer = tabA.getByRole("dialog");
  await drawer.getByRole("button", { name: "Đánh dấu bị block" }).click();
  await drawer.getByLabel("Lý do ngắn (hiện ở hàng task)").fill("E2E realtime");
  await drawer.getByRole("button", { name: "Lưu block" }).click();
  await expect(tabA.locator(".banner-block")).toContainText("T-396");

  // Tab B không reload: rail nhận sự kiện từ polling, banner nhờ router.refresh().
  await tabB.bringToFront();
  await expect(tabB.locator(".rail")).toContainText("E2E realtime", { timeout: 25_000 });
  await expect(tabB.locator(".banner-block")).toContainText("T-396", { timeout: 25_000 });
});
