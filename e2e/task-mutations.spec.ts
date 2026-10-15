import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// T-399 (rv-web) seed: stage Review, giao cho Nam. Test ghi thật xuống DB test rồi trả lại seed.
const TASK_ID = "T-399";

test.afterAll(async () => {
  await withDb((db) => db.query(`UPDATE tasks SET stage = 'Review', "assigneeId" = 'nam' WHERE id = $1`, [TASK_ID]));
});

test("drawer chuyển stage + giao agent ghi xuống DB, reload vẫn còn", async ({ page }) => {
  await page.goto("/rv-web/work");
  await page.waitForLoadState("networkidle");
  const row = page.locator(".trow", { hasText: TASK_ID });
  await row.click();
  const drawer = page.getByRole("dialog");

  await drawer.getByRole("button", { name: "Chuyển stage" }).click();
  await expect(drawer.locator(".drawer-head .tag").first()).toHaveText("Done");
  await expect(row.locator(".c-stage")).toHaveText("Done");

  await drawer.getByRole("button", { name: "Giao cho agent" }).click();
  await drawer.locator(".switcher-dropdown .switcher-item", { hasText: "Atlas" }).click();
  await expect(row.locator(".asg-name")).toHaveText(/Atlas/);
  await expect(drawer.getByRole("alert")).toHaveCount(0);

  await page.reload();
  const reloaded = page.locator(".trow", { hasText: TASK_ID });
  await expect(reloaded.locator(".c-stage")).toHaveText("Done");
  await expect(reloaded.locator(".asg-name")).toHaveText(/Atlas/);
});

const NEW_TASK_TITLE = "E2E: task tạo từ dialog";

test.describe("Task mới (dialog điều khiển bằng URL)", () => {
  test.afterAll(async () => {
    await withDb((db) => db.query("DELETE FROM tasks WHERE title = $1", [NEW_TASK_TITLE]));
  });

  test("nút ở header mở dialog qua ?new=1; Esc đóng và bỏ query", async ({ page }) => {
    await page.goto("/rv-web/work");
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: "Task mới" }).click();
    await expect(page).toHaveURL(/\?new=1$/);
    const dialog = page.getByRole("dialog", { name: "Task mới" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Tiêu đề")).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/rv-web\/work$/);
  });

  test("tạo task → đóng dialog, task xuất hiện đúng feature, reload vẫn còn", async ({ page }) => {
    await page.goto("/rv-web/work?new=1");
    await page.waitForLoadState("networkidle");
    const dialog = page.getByRole("dialog", { name: "Task mới" });
    await dialog.getByLabel("Tiêu đề").fill(NEW_TASK_TITLE);
    await dialog.getByLabel("Feature").selectOption("FEAT-119");
    await dialog.getByLabel("Stage").selectOption("Dev");
    await dialog.getByLabel("Người/agent thực hiện").selectOption("agent-vega");
    await dialog.getByLabel("Ước lượng (điểm)").fill("5");
    await dialog.getByRole("button", { name: "Tạo task" }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/rv-web\/work$/);
    const section = page.locator(".feature-section", { hasText: "FEAT-119" });
    const row = section.locator(".trow", { hasText: NEW_TASK_TITLE });
    await expect(row).toBeVisible();
    await expect(row.locator(".c-est")).toHaveText("5đ");

    await page.reload();
    await expect(page.locator(".trow", { hasText: NEW_TASK_TITLE })).toHaveCount(1);
  });
});

test.describe("block / gỡ block", () => {
  // T-401 seed không bị block (rv-web có sẵn 2 task bị block: T-418, T-402).
  test.afterAll(async () => {
    await withDb((db) => db.query("UPDATE tasks SET blocked = NULL, \"blockedFull\" = NULL WHERE id = 'T-401'"));
  });

  test("đặt block → banner + cờ ở hàng cập nhật; gỡ → biến mất", async ({ page }) => {
    await page.goto("/rv-web/work");
    await page.waitForLoadState("networkidle");
    const banner = page.locator(".banner-block");
    await expect(banner).toContainText("2 task đang bị block");

    const row = page.locator(".trow", { hasText: "T-401" });
    await row.click();
    const drawer = page.getByRole("dialog");
    await drawer.getByRole("button", { name: "Đánh dấu bị block" }).click();
    await drawer.getByLabel("Lý do ngắn (hiện ở hàng task)").fill("chờ API");
    await drawer.getByLabel("Mô tả đầy đủ").fill("Chờ backend mở endpoint lọc theo khu vực.");
    await drawer.getByRole("button", { name: "Lưu block" }).click();

    await expect(banner).toContainText("3 task đang bị block");
    await expect(banner).toContainText("T-401 (chờ API)");
    await expect(row.locator(".trow-flag.is-blocked")).toContainText("chờ API");
    await expect(drawer.locator(".drawer-warning")).toContainText("Chờ backend mở endpoint lọc theo khu vực.");

    await drawer.getByRole("button", { name: "Gỡ block" }).click();
    await expect(banner).toContainText("2 task đang bị block");
    await expect(banner).not.toContainText("T-401");
    await expect(row.locator(".trow-flag.is-blocked")).toHaveCount(0);
  });
});

test.describe("sửa nhanh task", () => {
  // T-409 (rv-web): lưu giá trị seed để trả lại sau khi sửa.
  let seed: { title: string; estimatePoints: number | null; dueDate: string | null };
  test.beforeAll(async () => {
    const { rows } = await withDb((db) =>
      db.query(`SELECT title, "estimatePoints", to_char("dueDate", 'YYYY-MM-DD') AS "dueDate" FROM tasks WHERE id = 'T-409'`),
    );
    seed = rows[0];
  });
  test.afterAll(async () => {
    await withDb((db) =>
      db.query(`UPDATE tasks SET title = $1, "estimatePoints" = $2, "dueDate" = $3 WHERE id = 'T-409'`, [seed.title, seed.estimatePoints, seed.dueDate]),
    );
  });

  test("sửa tiêu đề, ước lượng, hạn → hiện đúng ở hàng và drawer, reload vẫn còn", async ({ page }) => {
    await page.goto("/rv-web/work");
    await page.waitForLoadState("networkidle");
    const row = page.locator(".trow", { hasText: "T-409" });
    await row.click();
    const drawer = page.getByRole("dialog");
    await drawer.getByRole("button", { name: "Sửa" }).click();
    await drawer.getByLabel("Tiêu đề").fill("Chốt chỉ số p95 (đã sửa)");
    await drawer.getByLabel("Ước lượng (điểm)").fill("13");
    await drawer.getByLabel("Hạn").fill("2026-09-30");
    await drawer.getByRole("button", { name: "Lưu" }).click();

    await expect(drawer.getByRole("form", { name: "Sửa task" })).toHaveCount(0);
    await expect(drawer.locator("h4")).toHaveText("Chốt chỉ số p95 (đã sửa)");
    await expect(row.locator(".trow-title")).toHaveText("Chốt chỉ số p95 (đã sửa)");
    await expect(row.locator(".c-est")).toHaveText("13đ");

    await page.reload();
    const reloaded = page.locator(".trow", { hasText: "T-409" });
    await expect(reloaded.locator(".trow-title")).toHaveText("Chốt chỉ số p95 (đã sửa)");
    await reloaded.click();
    await expect(page.getByRole("dialog").locator(".drawer-meta-row", { hasText: "Hạn" })).toContainText("30/09");
  });
});

test.describe("ghi hoạt động cho người thao tác", () => {
  // T-412 seed: stage TA.
  test.afterAll(async () => {
    await withDb(async (db) => {
      await db.query("UPDATE tasks SET stage = 'TA' WHERE id = 'T-412'");
      await db.query("DELETE FROM member_activity WHERE text = 'Chuyển T-412 sang Dev'");
    });
  });

  test("chuyển stage ở màn work → dòng mới trong panel của Trung Hiếu ở màn team", async ({ page }) => {
    await page.goto("/rv-web/work");
    await page.waitForLoadState("networkidle");
    const row = page.locator(".trow", { hasText: "T-412" });
    await row.click();
    await page.getByRole("dialog").getByRole("button", { name: "Chuyển stage" }).click();
    await expect(row.locator(".c-stage")).toHaveText("Dev");

    await page.goto("/rv-web/team");
    await page.waitForLoadState("networkidle");
    await page.locator(".mrow", { hasText: "Trung Hiếu" }).click();
    const first = page.locator(".panel-activity-item").first();
    await expect(first).toContainText("Chuyển T-412 sang Dev");
    await expect(first).toContainText(/giây trước|phút trước/);
  });
});
