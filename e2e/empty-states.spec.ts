import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// Dự án rỗng tạo tạm trong DB test để kiểm tra empty state; tự xoá sau khi chạy.
const PROJECT_ID = "e2e-empty";

test.beforeAll(async () => {
  await withDb((db) =>
    db.query(
      `INSERT INTO projects (id, code, name, status, "desc") VALUES ($1, 'EE', 'Dự án rỗng (e2e)', 'Đang chạy', 'Tạo tạm bởi e2e')
       ON CONFLICT (id) DO NOTHING`,
      [PROJECT_ID],
    ),
  );
  // F15.3: chỉ thành viên xem được dự án → thêm Trung Hiếu (người đăng nhập e2e) làm thành viên duy nhất.
  await withDb((db) =>
    db.query(`INSERT INTO project_members ("projectId", "memberId") VALUES ($1, 'hieu') ON CONFLICT DO NOTHING`, [PROJECT_ID]),
  );
});

test.afterAll(async () => {
  await withDb((db) => db.query("DELETE FROM projects WHERE id = $1", [PROJECT_ID]));
});

test("dự án rỗng: work, docs có empty state; team chỉ có người xem; header báo chưa có sprint", async ({ page }) => {
  await page.goto(`/${PROJECT_ID}/work`);
  await expect(page.locator(".header-context")).toContainText("Chưa có sprint");
  await expect(page.locator(".empty-state", { hasText: "Dự án chưa có feature nào" })).toBeVisible();
  await expect(page.locator(".rail .empty-state", { hasText: "Chưa có hoạt động nào" })).toBeVisible();

  await page.goto(`/${PROJECT_ID}/docs`);
  await expect(page.locator(".empty-state", { hasText: "Dự án chưa có tài liệu nào" })).toBeVisible();

  await page.goto(`/${PROJECT_ID}/team`);
  // Người xem luôn là thành viên (F15.3) → màn team của dự án rỗng có đúng 1 người.
  await expect(page.locator(".mrow")).toHaveCount(1);
  await page.locator(".seg-opt", { hasText: "Toàn tổ chức" }).click();
  await expect(page.locator(".mrow")).toHaveCount(7);
});
