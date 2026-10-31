import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F21.6 — acceptance criteria trong drawer. Seed: T-396 có 3 tiêu chí (2 đạt); T-409 chưa có.
test.afterAll(async () => {
  await withDb((db) => db.query(`DELETE FROM task_criteria WHERE text LIKE 'E2E %'`));
});

test("drawer hiện tiêu chí mẫu kèm số đã đạt", async ({ page }) => {
  await page.goto("/rv-web/work?task=T-396");
  const section = page.getByRole("region", { name: "Tiêu chí hoàn thành" });
  await expect(section).toContainText("(2/3)");
  await expect(section.getByRole("checkbox", { name: "Có test cho trường hợp mất mạng khi đang lưu" })).not.toBeChecked();
});

test("lead thêm, tick, sửa và xoá tiêu chí", async ({ page }) => {
  await page.goto("/rv-web/work?task=T-409");
  const section = page.getByRole("region", { name: "Tiêu chí hoàn thành" });
  await section.getByLabel("Tiêu chí mới").fill("E2E có test p95");
  await section.getByRole("button", { name: "Thêm" }).click();
  const box = section.getByRole("checkbox", { name: "E2E có test p95" });
  await expect(box).not.toBeChecked();
  await expect(section.getByLabel("Tiêu chí mới")).toHaveValue("");

  await box.check();
  await expect(box).toBeChecked();
  await expect(section).toContainText("(1/1)");
  await expect(section).toContainText("Trung Hiếu");

  await section.getByRole("button", { name: "Sửa tiêu chí: E2E có test p95" }).click();
  await section.getByLabel("Sửa tiêu chí").fill("E2E có test p95 + p99");
  await section.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(section.getByRole("checkbox", { name: "E2E có test p95 + p99" })).toBeChecked();

  await section.getByRole("button", { name: "Xoá tiêu chí: E2E có test p95 + p99" }).click();
  await expect(section.getByRole("checkbox")).toHaveCount(0);
});
