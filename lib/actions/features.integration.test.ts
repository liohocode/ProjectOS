import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getSessionMemberId } from "@/lib/auth/session";
import { getFeaturesByProject } from "@/lib/data/features";
import { getTimelineByProject } from "@/lib/data/timeline";
import { createFeature, updateFeature } from "./features";

// F21.1 — tạo / sửa feature. Trung Hiếu (tech lead) mặc định; Nam là thành viên thường của rv-web.
const startedAt = new Date();
afterAll(async () => {
  await prisma.feature.deleteMany({ where: { name: { startsWith: "IT " } } });
  await prisma.activityEvent.deleteMany({ where: { at: { gte: startedAt } } });
  await prisma.memberActivity.deleteMany({ where: { at: { gte: startedAt } } });
});

const base = { name: "IT Lưu tin yêu thích", stage: "BA" as const, ownerId: null, plannedStart: null, plannedEnd: null };

describe("createFeature / updateFeature (F21.1)", () => {
  it("thành viên tạo feature → mã FEAT-n mới, vào list chính; chưa có kế hoạch thì không lên timeline", async () => {
    vi.mocked(getSessionMemberId).mockResolvedValue("nam");
    try {
      const r = await createFeature("rv-web", base);
      expect(r).toMatchObject({ ok: true, featureId: expect.stringMatching(/^FEAT-\d+$/) });
      const id = (r as { featureId: string }).featureId;
      expect((await getFeaturesByProject("rv-web")).find((f) => f.id === id)).toMatchObject({ name: base.name, owner: "Chưa giao", pct: 0 });
      expect((await getTimelineByProject("rv-web")).some((row) => row.featureId === id)).toBe(false);
      // Thành viên thường không sửa được.
      expect(await updateFeature(id, { ...base, name: "IT x" })).toEqual({ ok: false, error: "Chỉ tech lead hoặc người tạo dự án được sửa feature" });
    } finally {
      vi.mocked(getSessionMemberId).mockResolvedValue("hieu");
    }
  });

  it("tech lead sửa: người phụ trách + kế hoạch → hiện trên timeline", async () => {
    const id = (await prisma.feature.findFirstOrThrow({ where: { name: base.name } })).id;
    const sprint = await prisma.project.findUniqueOrThrow({ where: { id: "rv-web" }, select: { currentSprint: true } });
    const start = sprint.currentSprint!.startDate.toISOString().slice(0, 10);
    const end = new Date(sprint.currentSprint!.startDate.getTime() + 13 * 86_400_000).toISOString().slice(0, 10);
    expect(await updateFeature(id, { ...base, name: "IT Lưu tin (sửa)", stage: "Dev", ownerId: "agent-atlas", plannedStart: start, plannedEnd: end })).toEqual({ ok: true });
    const row = (await getTimelineByProject("rv-web")).find((r) => r.featureId === id);
    expect(row).toMatchObject({ name: `${id} IT Lưu tin (sửa)`, owner: "Atlas", kind: "agent", start: 1, len: 2 });
  });

  it("chặn: tên trống, kế hoạch thiếu / ngược ngày, người phụ trách ngoài dự án, không thuộc dự án", async () => {
    expect(await createFeature("rv-web", { ...base, name: " " })).toMatchObject({ ok: false, error: "Nhập tên feature" });
    expect(await createFeature("rv-web", { ...base, plannedStart: "2026-11-01" })).toMatchObject({ ok: false, error: "Kế hoạch cần cả ngày bắt đầu và kết thúc" });
    expect(await createFeature("rv-web", { ...base, plannedStart: "2026-11-10", plannedEnd: "2026-11-01" })).toMatchObject({ ok: false, error: "Ngày kết thúc phải sau ngày bắt đầu" });
    // Vega không thuộc crm.
    expect(await createFeature("crm", { ...base, ownerId: "agent-vega" })).toMatchObject({ ok: false, error: "Người phụ trách không thuộc dự án" });
    vi.mocked(getSessionMemberId).mockResolvedValue("nam");
    try {
      expect(await createFeature("rv-app", base)).toEqual({ ok: false, error: "Không tìm thấy dự án" });
    } finally {
      vi.mocked(getSessionMemberId).mockResolvedValue("hieu");
    }
  });
});
