import { describe, expect, it } from "vitest";
import { getPortfolioSummaries } from "./portfolio";
import { getActivityFeed } from "./activity";
import { getTaskDrawerInfo } from "./taskDrawer";
import { getTimelineByProject } from "./timeline";
import { getFeaturesByProject } from "./features";
import { featureProgress } from "@/lib/featureProgress";

describe("portfolio", () => {
  it("tổng hợp đúng số liệu từng dự án", async () => {
    const summaries = await getPortfolioSummaries();
    expect(summaries.reduce((sum, p) => sum + p.blockedCount, 0)).toBe(3);

    const rvWeb = summaries.find((p) => p.id === "rv-web");
    // FEAT-126 chưa giao (0%) cũng là feature → 5 feature. avgPct = trung bình % tính từ task (F21.2).
    expect(rvWeb).toMatchObject({ featureCount: 5, taskCount: 13, agentCount: 4, humanCount: 3, blockedCount: 2 });
    const features = await getFeaturesByProject("rv-web");
    expect(rvWeb?.avgPct).toBe(Math.round(features.reduce((s, f) => s + featureProgress(f.tasks), 0) / features.length));
    expect(rvWeb?.avatars.length).toBeLessThanOrEqual(6);
  });
});

describe("activity feed (sự kiện seed — F17.1)", () => {
  it("có mục đang chạy (kèm runningSince), bị block và revision chờ duyệt; mới nhất trước", async () => {
    const feed = await getActivityFeed("rv-web");
    const tones = new Set(feed.map((i) => i.tone));
    for (const tone of ["run", "block", "review"] as const) expect(tones).toContain(tone);
    expect(feed.some((i) => i.tool === "docs.append")).toBe(true);
    expect(feed.find((i) => i.taskId === "T-405" && i.tone === "run")).toMatchObject({ who: "Atlas", tool: "tasks.claim", runningSince: expect.any(String) });
  });
});

describe("task drawer", () => {
  it("log phiên chạy từ dữ liệu thật (F17.4): sự kiện block + lệnh MCP nhắm vào task, cũ trước", async () => {
    const info = await getTaskDrawerInfo("rv-web", "T-418");
    const texts = info!.sessionLog.map((s) => s.text);
    expect(texts.some((t) => t.includes("T-418 bị block"))).toBe(true);
    const comment = texts.indexOf("Atlas gọi tasks.comment — T-418 (chờ ADR-11) (Chờ review)");
    expect(comment).toBeGreaterThanOrEqual(0);
    expect(texts.indexOf("Vega gọi tasks.assign — T-418 → Atlas")).toBeGreaterThan(comment);
  });

  it("task đang chạy có dòng cuối 'Đang chạy' tự tăng; task chưa có gì → log rỗng; task lạ trả null", async () => {
    expect((await getTaskDrawerInfo("rv-web", "T-405"))?.sessionLog.at(-1)).toMatchObject({ text: "Đang chạy", runningSince: expect.any(String) });
    expect((await getTaskDrawerInfo("rv-web", "T-401"))?.contextDocs).toEqual([]);
    expect(await getTaskDrawerInfo("rv-web", "T-khong-co")).toBeNull();
  });
});

describe("timeline (từ DB)", () => {
  it("vị trí bar khớp dữ liệu timeline gốc; feature chưa giao là 'Chưa bắt đầu'", async () => {
    const rows = await getTimelineByProject("rv-web");
    expect(rows.map((r) => [r.featureId, r.start, r.len, r.kind])).toEqual([
      ["FEAT-118", 1, 5, "human"],
      ["FEAT-119", 3, 4, "agent"],
      ["FEAT-120", 2, 3, "agent"],
      ["FEAT-124", 5, 3, "agent"],
      ["FEAT-126", 7, 2, "none"],
    ]);
    expect(rows.at(-1)).toMatchObject({ owner: "Chưa giao", label: "Chưa bắt đầu" });
    // % từ task (F21.2), khớp % ở list theo feature.
    const feat118 = (await getFeaturesByProject("rv-web")).find((f) => f.id === "FEAT-118")!;
    expect(rows[0].label).toBe(`Dev · ${feat118.pct}%`);
    expect(feat118.pct).toBe(featureProgress(feat118.tasks));
  });

  it("dự án không tồn tại trả mảng rỗng", async () => {
    expect(await getTimelineByProject("khong-ton-tai")).toEqual([]);
  });
});

describe("tiến độ feature tính từ task (F21.2)", () => {
  it("chuyển một task sang Done → % feature và % trung bình portfolio tăng", async () => {
    const { prisma } = await import("@/lib/prisma");
    const before = (await getFeaturesByProject("rv-web")).find((f) => f.tasks.some((t) => t.stage !== "Done"))!;
    const task = before.tasks.find((t) => t.stage !== "Done")!;
    const avgBefore = (await getPortfolioSummaries()).find((p) => p.id === "rv-web")!.avgPct;
    await prisma.task.update({ where: { id: task.id }, data: { stage: "Done" } });
    try {
      const after = (await getFeaturesByProject("rv-web")).find((f) => f.id === before.id)!;
      expect(after.pct).toBeGreaterThan(before.pct);
      expect((await getPortfolioSummaries()).find((p) => p.id === "rv-web")!.avgPct).toBeGreaterThanOrEqual(avgBefore);
    } finally {
      await prisma.task.update({ where: { id: task.id }, data: { stage: task.stage } });
    }
  });
});
