import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F13.5 — sửa cấu hình agent ở panel. Atlas (seed): claude-sonnet-4.5, Append (chờ review); trả lại sau.
let seed: Record<string, unknown>;

test.beforeAll(async () => {
  seed = await withDb(async (db) => (await db.query(`SELECT * FROM agent_configs WHERE "memberId" = 'agent-atlas'`)).rows[0]);
});

test.afterAll(async () => {
  await withDb((db) =>
    db.query(
      `UPDATE agent_configs SET model = $1, "mcpServers" = $2, "docsWritePermission" = $3, "maxConcurrentTasks" = $4,
       "canProposeFeatures" = $5, "canAssignTo" = $6 WHERE "memberId" = 'agent-atlas'`,
      [seed.model, seed.mcpServers, seed.docsWritePermission, seed.maxConcurrentTasks, seed.canProposeFeatures, seed.canAssignTo],
    ),
  );
});

test("panel hiển thị cấu hình; sửa model + quyền ghi docs → reload vẫn giữ", async ({ page }) => {
  await page.goto("/rv-web/team");
  await page.waitForLoadState("networkidle");
  await page.locator(".mrow", { hasText: "Atlas" }).click();
  const aside = page.locator(".team-aside");
  await expect(aside).toContainText("claude-sonnet-4.5");
  await expect(aside).toContainText("Append (chờ review)");

  await aside.getByRole("button", { name: "Sửa", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Cấu hình Atlas" });
  await expect(dialog.getByLabel("Model")).toHaveValue("claude-sonnet-4.5");
  await dialog.getByLabel("Model").fill("claude-opus-4.5");
  await dialog.getByLabel("Quyền ghi docs").selectOption("append_edit_spec");
  await dialog.getByLabel("Task đồng thời tối đa").fill("3");
  await dialog.getByLabel("meridian-docs").check();
  await dialog.getByRole("button", { name: "Lưu cấu hình" }).click();
  await expect(dialog).toHaveCount(0);

  await expect(aside).toContainText("claude-opus-4.5");
  await expect(aside).toContainText("Append + sửa spec");
  await expect(aside).toContainText("tối đa 3");
  await expect(aside).toContainText("meridian-core, meridian-docs");

  await page.reload();
  await page.locator(".mrow", { hasText: "Atlas" }).click();
  await expect(page.locator(".team-aside")).toContainText("claude-opus-4.5");
});
