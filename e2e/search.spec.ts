import { expect, test } from "@playwright/test";

// F14.2 — ô tìm kiếm header: gõ → dropdown nhóm theo loại → chọn điều hướng đúng.

test("gõ mã task → Enter mở drawer task (?task=)", async ({ page }) => {
  await page.goto("/rv-web/docs");
  const search = page.getByRole("combobox", { name: "Tìm trong dự án" });
  await search.fill("T-418");
  const results = page.getByRole("listbox", { name: "Kết quả tìm kiếm" });
  await expect(results.getByRole("option")).toHaveCount(1);
  await expect(results.locator(".search-group")).toHaveText("Task");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/rv-web\/work\?task=T-418$/);
  await expect(page.getByRole("dialog").locator("#task-drawer-title")).toHaveText("Viết migration cho trường pháp lý");
});

test("không dấu khớp có dấu; chọn tài liệu và feature bằng chuột / phím", async ({ page }) => {
  await page.goto("/rv-web/work");
  await page.keyboard.press("/"); // phím tắt focus ô tìm kiếm
  const search = page.getByRole("combobox", { name: "Tìm trong dự án" });
  await expect(search).toBeFocused();

  await search.fill("phap ly");
  await expect(page.getByRole("option", { name: /T-418/ })).toBeVisible();

  await search.fill("PRD");
  await page.getByRole("option", { name: /PRD — Listing v3/ }).click();
  await expect(page).toHaveURL(/\/rv-web\/docs\?doc=prd-listing$/);

  await search.fill("nang cap");
  await expect(page.getByRole("option")).toHaveCount(1);
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/rv-web\/work#feature-FEAT-126$/);
  await expect(page.locator("#feature-FEAT-126")).toBeInViewport();
});

test("không có kết quả; Esc đóng dropdown", async ({ page }) => {
  await page.goto("/rv-web/work");
  const search = page.getByRole("combobox", { name: "Tìm trong dự án" });
  await search.fill("khong-co-gi-ca");
  await expect(page.locator(".search-empty")).toContainText("Không có kết quả");
  await search.press("Escape");
  await expect(page.getByRole("listbox", { name: "Kết quả tìm kiếm" })).toHaveCount(0);
});
