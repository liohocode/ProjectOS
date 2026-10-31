import { expect, test } from "@playwright/test";

// F28.4 — màn Roadmap. Seed rv-web: phase 1 (FEAT-118, FEAT-126), phase 2 (FEAT-119, FEAT-120 chờ FEAT-118, FEAT-124);
// T-418 cần quyết định.
test("tiến độ theo phase, quyết định đang mở, việc nên nhận tiếp; mở feature / task", async ({ page }) => {
  await page.goto("/rv-web/roadmap");
  await expect(page.getByRole("link", { name: /Roadmap/ })).toContainText("1");
  const phase1 = page.getByRole("region", { name: "Phase 1" });
  await expect(phase1).toContainText("Đăng tin mới");
  await expect(phase1.getByRole("link", { name: /FEAT-118/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Phase 2" }).getByRole("link", { name: /FEAT-120/ })).toContainText("chờ FEAT-118");
  await expect(page.getByRole("region", { name: "Quyết định đang mở" })).toContainText("Viết migration cho trường pháp lý");
  const next = page.getByRole("region", { name: "Việc nên nhận tiếp" });
  await expect(next.getByRole("link").first()).toBeVisible();

  await phase1.getByRole("link", { name: /FEAT-118/ }).click();
  await expect(page).toHaveURL(/\/rv-web\/work\/features\/FEAT-118$/);
});
