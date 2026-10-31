import { expect, test } from "@playwright/test";

// F22.5 — chỉ số chất lượng ở Portfolio, cho dự án đang mở (seed: T-390, T-388 rv-web có lịch sử; T-388 bị trả lại 1 lần).
test("portfolio hiện cycle time trung vị, tỉ lệ trả lại và bảng theo người / agent", async ({ page }) => {
  await page.goto("/rv-web/portfolio");
  const panel = page.getByRole("region", { name: "Chỉ số chất lượng" });
  await expect(panel).toContainText("Chất lượng — Rever Web v3");
  await expect(panel).toContainText("4,5 ngày");
  await expect(panel.getByRole("row", { name: /Vega/ })).toContainText("100%");
  await expect(panel.getByRole("row", { name: /Trần Mỹ Linh/ })).toContainText("0%");
});
