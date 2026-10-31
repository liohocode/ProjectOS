import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F24.6 — gắn tài liệu spec vào task trong drawer; bấm mở tài liệu.
test.afterAll(async () => {
  await withDb((db) => db.query(`DELETE FROM task_docs WHERE "taskId" = 'T-407'`));
});

test("gắn tài liệu vào task → hiện trong drawer, mở được; bỏ gắn", async ({ page }) => {
  await page.goto("/rv-web/work?task=T-407");
  const section = page.getByRole("dialog").getByRole("region", { name: "Tài liệu của task" });
  await expect(section).toContainText("Chưa gắn tài liệu");
  await section.getByLabel("Gắn tài liệu").selectOption("runbook");
  await section.getByRole("button", { name: "Gắn", exact: true }).click();
  const link = section.getByRole("link", { name: /Runbook/ });
  await expect(link).toBeVisible();

  await section.getByRole("button", { name: /^Bỏ tài liệu/ }).click();
  await expect(section).toContainText("Chưa gắn tài liệu");

  await section.getByLabel("Gắn tài liệu").selectOption("runbook");
  await section.getByRole("button", { name: "Gắn", exact: true }).click();
  await section.getByRole("link", { name: /Runbook/ }).click();
  await expect(page).toHaveURL(/\/rv-web\/docs\?doc=runbook/);
});
