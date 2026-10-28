import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F12.3 — xem diff + từ chối revision. Ghi thật xuống DB test rồi trả 2 revision chờ của rv-web về seed
// (smoke.spec.ts chạy sau và cần lại "Revision chờ duyệt 2").
test.afterAll(async () => {
  await withDb((db) =>
    db.query(
      `UPDATE doc_revisions SET status = 'pending', "rejectedReason" = NULL
       WHERE status = 'rejected' AND "docId" IN ('mcp-spec', 'prd-listing') AND "proposedSections" IS NOT NULL`,
    ),
  );
});

test("xem thay đổi hiện diff đúng cho 2 revision mẫu", async ({ page }) => {
  await page.goto("/rv-web/docs?doc=mcp-spec");
  const block = page.locator(".revision-block");
  await block.getByRole("button", { name: "Xem thay đổi" }).click();
  const diff = block.locator(".revision-diff");
  // mcp-spec: thêm mục "Nhóm feature" (features.propose).
  await expect(diff.locator(".diff-section")).toHaveCount(1);
  await expect(diff.locator(".diff-heading")).toContainText("Nhóm feature");
  await expect(diff.locator(".diff-heading")).toContainText("Mục mới");
  await expect(diff.locator(".diff-para.is-added")).toContainText("features.propose");
  await block.getByRole("button", { name: "Xem thay đổi" }).click();
  await expect(diff).toHaveCount(0);

  await page.goto("/rv-web/docs?doc=prd-listing");
  await block.getByRole("button", { name: "Xem thay đổi" }).click();
  // prd-listing: thêm đoạn benchmark cuối "Tiêu chí hoàn thành", phần còn lại của mục giữ nguyên.
  const section = diff.locator(".diff-section", { hasText: "Tiêu chí hoàn thành" });
  await expect(section.locator(".diff-heading")).toContainText("Mục sửa");
  await expect(section.locator(".diff-para.is-added")).toHaveCount(1);
  await expect(section.locator(".diff-para.is-added")).toContainText("Benchmark");
  await expect(section.locator(".diff-para.is-removed")).toHaveCount(0);
});

test("từ chối kèm lý do: revision rời trạng thái chờ, badge Docs hết cảnh báo", async ({ page }) => {
  const strip = page.locator(".kb-strip", { hasText: "KHO TRI THỨC" });
  const navBadge = page.locator(".nav-item", { hasText: "Docs" }).locator(".nav-badge");
  const block = page.locator(".revision-block");

  await page.goto("/rv-web/docs?doc=mcp-spec");
  await expect(strip).toContainText("Revision chờ duyệt 2");
  await expect(navBadge).toHaveClass(/is-alert/);

  await block.getByRole("button", { name: "Từ chối" }).click();
  const confirm = block.getByRole("button", { name: "Xác nhận từ chối" });
  await expect(confirm).toBeDisabled();
  await block.getByLabel("Lý do từ chối").fill("Thiếu ví dụ gọi tool");
  await confirm.click();

  await expect(block.getByRole("button", { name: "Duyệt" })).toHaveCount(0);
  await expect(block).toContainText("Bị từ chối: Thiếu ví dụ gọi tool");
  await expect(strip).toContainText("Revision chờ duyệt 1");
  await expect(navBadge).toHaveClass(/is-alert/);

  await page.goto("/rv-web/docs?doc=prd-listing");
  await block.getByRole("button", { name: "Từ chối" }).click();
  await block.getByLabel("Lý do từ chối").fill("Chưa có số liệu benchmark");
  await block.getByRole("button", { name: "Xác nhận từ chối" }).click();
  await expect(strip).toContainText("Revision chờ duyệt 0");
  await expect(navBadge).not.toHaveClass(/is-alert/);

  // Tài liệu giữ nguyên bản chính.
  await page.reload();
  await expect(page.locator(".doc-body-area").getByText("v4.2", { exact: true })).toBeVisible();
  await expect(block).toContainText("Bị từ chối: Chưa có số liệu benchmark");
});
