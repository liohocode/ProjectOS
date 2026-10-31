import { expect, test } from "@playwright/test";
import { withDb } from "./db";
import { E2E_NAM_STORAGE_STATE } from "./env";

// F29.2 — API key của dự án (ADR-025): tech lead gắn / thu hồi ở màn Roadmap; key không bao giờ hiện lại.
test.afterAll(async () => {
  await withDb((db) => db.query(`DELETE FROM api_credentials WHERE "projectId" = 'crm'`));
});

test("tech lead gắn key → chỉ thấy 4 ký tự cuối; gắn key feature; thu hồi", async ({ page }) => {
  await page.goto("/crm/roadmap");
  const panel = page.getByRole("region", { name: "API key" });
  await expect(panel).toContainText("Chưa gắn key nào");

  await panel.getByRole("button", { name: "Gắn key" }).click();
  await panel.getByLabel("Tên gợi nhớ").fill("Team CRM");
  await panel.getByLabel("API key Anthropic").fill("sk-ant-api03-e2e-SECRET-9f3a");
  await panel.getByRole("button", { name: "Lưu key" }).click();
  await expect(panel).toContainText("Anthropic …9f3a");
  await expect(panel).toContainText("Cả dự án");
  await expect(page.locator("body")).not.toContainText("SECRET");

  await panel.getByRole("button", { name: "Gắn key" }).click();
  await panel.getByLabel("Phạm vi").selectOption("FEAT-304");
  await panel.getByLabel("Tên gợi nhớ").fill("Import");
  await panel.getByLabel("API key Anthropic").fill("sk-ant-api03-e2e-IMPORT-77b1");
  await panel.getByRole("button", { name: "Lưu key" }).click();
  await expect(panel).toContainText("FEAT-304");

  await panel.getByRole("button", { name: "Thu hồi Import" }).click();
  await expect(panel).not.toContainText("…77b1");
  await expect(panel).toContainText("…9f3a");
});

test.describe("thành viên thường", () => {
  test.use({ storageState: E2E_NAM_STORAGE_STATE });

  test("thấy key đang gắn nhưng không gắn / thu hồi được", async ({ page }) => {
    await withDb((db) =>
      db.query(
        `INSERT INTO api_credentials (id, "projectId", provider, label, ciphertext, iv, "authTag", last4) VALUES ('e2e-cred', 'crm', 'anthropic', 'Có sẵn', 'x', 'x', 'x', 'abcd') ON CONFLICT DO NOTHING`,
      ),
    );
    await page.goto("/crm/roadmap");
    const panel = page.getByRole("region", { name: "API key" });
    await expect(panel).toContainText("…abcd");
    await expect(panel.getByRole("button", { name: "Gắn key" })).toHaveCount(0);
    await expect(panel.getByRole("button", { name: /Thu hồi/ })).toHaveCount(0);
  });
});
