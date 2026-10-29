import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F12.6 — người sửa trực tiếp. "glossary" (rv-web) không có revision chờ; ghi thật rồi trả về seed.
const DOC = "glossary";
let seed: { summary: string; sections: unknown; version: string; updatedAt: Date; revisionIds: string[] };

test.beforeAll(async () => {
  seed = await withDb(async (db) => {
    const doc = (await db.query(`SELECT summary, sections, version, "updatedAt" FROM docs WHERE id = $1`, [DOC])).rows[0];
    const revs = (await db.query(`SELECT id FROM doc_revisions WHERE "docId" = $1`, [DOC])).rows;
    return { ...doc, revisionIds: revs.map((r: { id: string }) => r.id) };
  });
});

test.afterAll(async () => {
  await withDb(async (db) => {
    await db.query(`DELETE FROM doc_revisions WHERE "docId" = $1 AND NOT (id = ANY($2))`, [DOC, seed.revisionIds]);
    await db.query(`UPDATE docs SET summary = $2, sections = $3, version = $4, "updatedAt" = $5 WHERE id = $1`, [
      DOC,
      seed.summary,
      JSON.stringify(seed.sections),
      seed.version,
      seed.updatedAt,
    ]);
  });
});

test("Sửa → form điền sẵn markdown; lưu áp vào bản chính, tăng version, lịch sử ghi người sửa", async ({ page }) => {
  await page.goto(`/rv-web/docs?doc=${DOC}`);
  await page.waitForLoadState("networkidle");
  const body = page.locator(".doc-body-area");
  await expect(body.getByText(seed.version, { exact: true })).toBeVisible();

  await body.getByRole("link", { name: "Sửa" }).click();
  await expect(page).toHaveURL(new RegExp(`\\?doc=${DOC}&edit=1$`));
  const dialog = page.getByRole("dialog", { name: /Sửa tài liệu/ });
  const content = dialog.getByLabel("Nội dung");
  // Nội dung hiện tại chuyển sang markdown: mỗi mục bắt đầu bằng "## ".
  const firstHeading = (seed.sections as { heading: string }[])[0].heading;
  await expect(content).toHaveValue(new RegExp(`^## ${firstHeading}`));
  await expect(dialog.getByLabel("Tóm tắt")).toHaveValue(seed.summary);

  await content.fill("## Thuật ngữ mới\nTin đăng: bài đăng bán hoặc cho thuê.\n\n## Viết tắt\nBA: business analyst.");
  await dialog.getByLabel("Mô tả thay đổi").fill("Viết lại thuật ngữ");
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`\\?doc=${DOC}$`));
  await expect(body.locator(".doc-section h5")).toHaveText(["Thuật ngữ mới", "Viết tắt"]);
  await expect(body.getByText("v1.1", { exact: true })).toBeVisible();
  const top = page.locator(".revision-item").first();
  await expect(top).toContainText("Viết lại thuật ngữ");
  await expect(top).toContainText("Đã duyệt bởi Trung Hiếu");

  await page.reload();
  await expect(body.locator(".doc-section h5")).toHaveText(["Thuật ngữ mới", "Viết tắt"]);
});

test("không có thay đổi → báo lỗi tại chỗ; tài liệu không tồn tại không có nút Sửa", async ({ page }) => {
  await page.goto(`/rv-web/docs?doc=${DOC}&edit=1`);
  await page.waitForLoadState("networkidle");
  const dialog = page.getByRole("dialog", { name: /Sửa tài liệu/ });
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Nội dung không có thay đổi");

  await page.goto("/rv-web/docs?doc=khong-co&edit=1");
  await expect(page.locator(".doc-body-area").getByRole("link", { name: "Sửa" })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
