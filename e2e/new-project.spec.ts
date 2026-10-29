import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F13.1 — "Dự án mới" ở màn portfolio. Ghi thật xuống DB test rồi xoá dự án vừa tạo.
const NAME = "E2E Partner Portal";
const ID = "e2e-partner-portal";

test.afterAll(async () => {
  await withDb((db) => db.query("DELETE FROM projects WHERE id = $1", [ID]));
});

test("tạo dự án: id + mã tự gợi ý từ tên → sang màn work trống, có trong switcher và portfolio", async ({ page }) => {
  await page.goto("/rv-web/portfolio");
  await page.waitForLoadState("networkidle");
  await page.getByRole("link", { name: "Dự án mới" }).click();
  await expect(page).toHaveURL(/\/rv-web\/portfolio\?new=1$/);

  const dialog = page.getByRole("dialog", { name: "Dự án mới" });
  await dialog.getByLabel("Tên dự án").fill(NAME);
  await expect(dialog.getByLabel("Id (đường dẫn)")).toHaveValue(ID);
  await expect(dialog.getByLabel("Mã")).toHaveValue("EP");
  await dialog.getByLabel("Trạng thái").selectOption("Đang chạy");
  await dialog.getByLabel("Sprint đầu tiên").fill("Sprint 1");
  await dialog.getByLabel("Bắt đầu").fill("2026-11-02");
  await dialog.getByLabel("Kết thúc").fill("2026-11-13");
  await dialog.getByRole("button", { name: "Tạo dự án" }).click();

  await expect(page).toHaveURL(new RegExp(`/${ID}/work$`));
  await expect(page.locator(".switcher-name")).toHaveText(NAME);
  await expect(page.getByText("Dự án chưa có feature nào")).toBeVisible();
  await expect(page.locator("header")).toContainText("Sprint 1 · 02–13/11");

  await page.goto(`/${ID}/portfolio`);
  const card = page.locator(".project-card", { hasText: NAME });
  await expect(card).toContainText("EP");
  await expect(card).toContainText("Đang chạy");
});

test("id hoặc mã đã có dự án dùng → báo lỗi tại chỗ", async ({ page }) => {
  await page.goto("/rv-web/portfolio?new=1");
  await page.waitForLoadState("networkidle");
  const dialog = page.getByRole("dialog", { name: "Dự án mới" });
  await dialog.getByLabel("Tên dự án").fill("Trùng mã");
  await dialog.getByLabel("Mã").fill("RV");
  await dialog.getByRole("button", { name: "Tạo dự án" }).click();
  await expect(dialog.getByRole("alert")).toContainText('Mã "RV" đã có dự án dùng');
  await expect(page).toHaveURL(/\?new=1$/);
});
