import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F21.1 — "Feature mới" ở toolbar màn work + sửa feature trên header.
test.afterAll(async () => {
  await withDb((db) => db.query(`DELETE FROM features WHERE name LIKE 'E2E %'`));
});

test("tạo feature → vào list; sửa người phụ trách → avatar đổi", async ({ page }) => {
  await page.goto("/crm/work");
  await page.getByRole("link", { name: "Feature mới" }).click();
  const dialog = page.getByRole("dialog", { name: "Feature mới" });
  await dialog.getByLabel("Tên feature").fill("E2E Nhập dữ liệu hàng loạt");
  await dialog.getByRole("button", { name: "Tạo feature" }).click();
  await expect(dialog).toHaveCount(0);

  const section = page.locator(".feature-section", { hasText: "E2E Nhập dữ liệu hàng loạt" });
  await expect(section).toContainText("0%");
  const id = (await section.locator(".frow .trow-id").textContent())!;
  await section.getByRole("button", { name: `Sửa ${id}` }).click();
  const edit = page.getByRole("dialog", { name: `Sửa feature ${id}` });
  await edit.getByLabel("Stage").selectOption("Dev");
  await edit.getByLabel("Người phụ trách").selectOption({ label: "Trung Hiếu" });
  await edit.getByRole("button", { name: "Lưu" }).click();
  await expect(edit).toHaveCount(0);
  await expect(section.locator(".frow [title='Trung Hiếu']")).toBeVisible();
  await expect(section.locator(".f-stage")).toHaveText("Dev");
});
