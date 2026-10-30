import { expect, test } from "@playwright/test";
import { withDb } from "./db";
import { E2E_NAM_STORAGE_STATE } from "./env";

// F16.6 — feature Bảo (BA agent) đề xuất qua MCP chờ lead duyệt ở màn work.
test.beforeAll(async () => {
  await withDb((db) =>
    db.query(
      `INSERT INTO features (id, "projectId", name, stage, pct, status, "proposedById", proposal, "proposedAt")
       VALUES ('FEAT-9001', 'rv-web', 'E2E Lưu tin yêu thích', 'BA', 0, 'proposed', 'agent-bao', 'Người mua lưu tin để xem lại', now())`,
    ),
  );
});
test.afterAll(async () => {
  await withDb((db) => db.query(`DELETE FROM features WHERE id = 'FEAT-9001'`));
});

test.describe("thành viên thường", () => {
  test.use({ storageState: E2E_NAM_STORAGE_STATE });
  test("thấy đề xuất nhưng không có nút Duyệt", async ({ page }) => {
    await page.goto("/rv-web/work");
    const box = page.getByRole("region", { name: "Feature đề xuất — chờ duyệt" });
    await expect(box).toContainText("E2E Lưu tin yêu thích");
    await expect(box.getByRole("button", { name: "Duyệt" })).toHaveCount(0);
  });
});

test("lead duyệt → feature vào danh sách chính, khu đề xuất biến mất", async ({ page }) => {
  await page.goto("/rv-web/work");
  const box = page.getByRole("region", { name: "Feature đề xuất — chờ duyệt" });
  await expect(box).toContainText("Bảo");
  await expect(page.locator("#feature-FEAT-9001")).toHaveCount(0);
  await box.getByRole("button", { name: "Duyệt" }).click();
  await expect(box).toHaveCount(0);
  await expect(page.locator(".list-area")).toContainText("E2E Lưu tin yêu thích");
});
