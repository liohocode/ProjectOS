import { expect, test } from "@playwright/test";
import { withDb } from "./db";

// F14.4 — nhật ký lệnh > 50 dòng: trang đầu 50, "Xem thêm" nối trang sau, hết trang thì nút biến mất.
const TOOL = "e2e.pagination";

test.beforeAll(async () => {
  await withDb((db) =>
    db.query(
      `INSERT INTO mcp_log_entries (id, at, "agentId", tool, target, result)
       SELECT 'e2e-log-' || i, (SELECT max(at) FROM mcp_log_entries) + i * interval '1 second', 'agent-scout', $1, '#' || i, 'OK'
       FROM generate_series(1, 60) AS i`,
      [TOOL],
    ),
  );
});

test.afterAll(async () => {
  await withDb((db) => db.query("DELETE FROM mcp_log_entries WHERE tool = $1", [TOOL]));
});

test("nhật ký lệnh: 50 dòng đầu, Xem thêm hiện đủ, mới nhất trước", async ({ page }) => {
  const total = await withDb(async (db) => Number((await db.query("SELECT count(*) FROM mcp_log_entries")).rows[0].count));
  await page.goto("/rv-web/mcp");
  const logRows = page.locator("table.table").nth(1).locator("tbody tr");
  await expect(logRows).toHaveCount(50);
  await expect(logRows.first().locator("td:nth-child(4)")).toHaveText("#60");

  await page.getByRole("button", { name: /Xem thêm \(đang hiện 50\)/ }).click();
  await expect(logRows).toHaveCount(total);
  await expect(page.getByRole("button", { name: /Xem thêm/ })).toHaveCount(0);
});
