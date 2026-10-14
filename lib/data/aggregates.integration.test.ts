import { describe, expect, it } from "vitest";
import { getPortfolioSummaries } from "./portfolio";
import { getActivityFeed } from "./activity";
import { getTaskDrawerInfo } from "./taskDrawer";

describe("portfolio", () => {
  it("tổng hợp đúng số liệu từng dự án", async () => {
    const summaries = await getPortfolioSummaries();
    expect(summaries.reduce((sum, p) => sum + p.blockedCount, 0)).toBe(3);

    const rvWeb = summaries.find((p) => p.id === "rv-web");
    expect(rvWeb).toMatchObject({ featureCount: 4, taskCount: 13, agentCount: 4, humanCount: 3, blockedCount: 2, avgPct: 49 });
    expect(rvWeb?.avatars.length).toBeLessThanOrEqual(6);
  });
});

describe("activity feed (suy ra)", () => {
  it("có mục đang chạy, bị block và revision chờ duyệt", async () => {
    const feed = await getActivityFeed("rv-web");
    const tones = new Set(feed.map((i) => i.tone));
    expect(tones).toEqual(new Set(["run", "block", "review"]));
    expect(feed.some((i) => i.tool === "docs.append")).toBe(true);
  });
});

describe("task drawer", () => {
  it("task của agent có context docs của feature + log phiên chạy", async () => {
    const info = await getTaskDrawerInfo("rv-web", "T-418");
    expect(info?.contextDocs.length).toBeGreaterThan(0);
    expect(info?.sessionLog.some((s) => s.text.startsWith("Bị block"))).toBe(true);
  });

  it("task của người không có context docs; task lạ trả null", async () => {
    expect((await getTaskDrawerInfo("rv-web", "T-401"))?.contextDocs).toEqual([]);
    expect(await getTaskDrawerInfo("rv-web", "T-khong-co")).toBeNull();
  });
});
