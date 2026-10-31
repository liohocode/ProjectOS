import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F21.11 — đoạn tài liệu là markdown: bảng, danh sách, code hiển thị đúng; HTML thô không chạy.
const sections = [
  {
    heading: "Bảng quyết định",
    paras: ["| Mã | Quyết định |\n|---|---|\n| ADR-023 | react-markdown |", "- Một\n- Hai", "`npm test`", "<img src=x onerror=alert(1)>"],
  },
];

test.beforeAll(async () => {
  await withDb((db) =>
    db.query(
      `INSERT INTO docs (id, "projectId", title, version, status, summary, "authorId", sections, "readBy") VALUES ('e2e-md', 'rv-web', 'E2E markdown', 'v1.0', 'Bản nháp', 'Tài liệu thử markdown', 'hieu', $1, '{}')`,
      [JSON.stringify(sections)],
    ),
  );
});
test.afterAll(async () => {
  await withDb((db) => db.query(`DELETE FROM docs WHERE id = 'e2e-md'`));
});

test("tài liệu hiển thị bảng, danh sách, code; HTML thô bị bỏ qua", async ({ page }) => {
  await page.goto("/rv-web/docs?doc=e2e-md");
  const section = page.locator(".doc-section", { hasText: "Bảng quyết định" });
  await expect(section.getByRole("table")).toContainText("ADR-023");
  await expect(section.getByRole("cell", { name: "react-markdown" })).toBeVisible();
  await expect(section.getByRole("listitem")).toHaveCount(2);
  await expect(section.locator("code")).toHaveText("npm test");
  await expect(section.locator("img")).toHaveCount(0);
});
