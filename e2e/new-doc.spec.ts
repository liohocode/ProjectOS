import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F12.5 — "Tài liệu mới" (dialog theo URL). Ghi thật xuống DB test rồi xoá tài liệu vừa tạo.
const TITLE = "E2E: Đặc tả thanh toán điện tử";
const DOC_ID = "e2e-dac-ta-thanh-toan-dien-tu";

test.afterAll(async () => {
  await withDb((db) => db.query("DELETE FROM docs WHERE id LIKE $1", [`${DOC_ID}%`]));
});

test("nút ở header mở dialog qua ?new=1; Esc đóng và bỏ query", async ({ page }) => {
  await page.goto("/rv-web/docs");
  await page.waitForLoadState("networkidle");
  await page.getByRole("link", { name: "Tài liệu mới" }).click();
  await expect(page).toHaveURL(/\/rv-web\/docs\?new=1$/);
  const dialog = page.getByRole("dialog", { name: "Tài liệu mới" });
  await expect(dialog.getByLabel("Tiêu đề")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/rv-web\/docs$/);
});

test("tạo tài liệu tiếng Việt có dấu → id slug, nằm đúng nhóm feature, mở sẵn tài liệu", async ({ page }) => {
  await page.goto("/rv-web/docs?new=1");
  await page.waitForLoadState("networkidle");
  const navBadge = page.locator(".nav-item", { hasText: "Docs" }).locator(".nav-badge");
  const before = Number(await navBadge.textContent());

  const dialog = page.getByRole("dialog", { name: "Tài liệu mới" });
  await dialog.getByLabel("Tiêu đề").fill(TITLE);
  await dialog.getByLabel("Gắn với feature").selectOption("FEAT-119");
  await dialog.getByLabel("Tóm tắt").fill("Luồng thanh toán qua ví điện tử.");
  await dialog.getByLabel("Nội dung").fill("## Bối cảnh\nNgười mua cần thanh toán nhanh.\n\n## Phạm vi\nVí MoMo, ZaloPay.");
  await dialog.getByRole("button", { name: "Tạo tài liệu" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/rv-web/docs\\?doc=${DOC_ID}$`));
  const body = page.locator(".doc-body-area");
  await expect(body.locator("h3")).toHaveText(TITLE);
  await expect(body.getByText("v1.0", { exact: true })).toBeVisible();
  await expect(body.locator(".doc-section h5")).toHaveText(["Bối cảnh", "Phạm vi"]);
  await expect(page.locator(".revision-block")).toContainText("Đã duyệt bởi Trung Hiếu");

  const group = page.locator(".doc-group", { hasText: "FEAT-119" });
  await expect(group.locator(".doc-tree-item.is-active")).toHaveText(TITLE);
  await expect(navBadge).toHaveText(String(before + 1));

  await page.reload();
  await expect(body.locator("h3")).toHaveText(TITLE);
});

test("thiếu nội dung → báo lỗi tại chỗ, không đóng dialog", async ({ page }) => {
  await page.goto("/rv-web/docs?new=1");
  await page.waitForLoadState("networkidle");
  const dialog = page.getByRole("dialog", { name: "Tài liệu mới" });
  await dialog.getByLabel("Tiêu đề").fill(TITLE);
  await dialog.getByLabel("Tóm tắt").fill("x");
  await dialog.getByLabel("Nội dung").fill("   ");
  await dialog.getByRole("button", { name: "Tạo tài liệu" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Tài liệu cần ít nhất một mục");
  await expect(page).toHaveURL(/\?new=1$/);
});
