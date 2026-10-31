import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getSessionMemberId } from "@/lib/auth/session";
import { getFeatureDetail, getFeaturesByProject, getPhasesByProject } from "@/lib/data/features";
import { getTimelineByProject } from "@/lib/data/timeline";
import { createFeature, setFeatureDependency, setFeaturePhase, updateFeature, updateFeatureContent } from "./features";

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

describe("nội dung trang chi tiết feature (F21.9)", () => {
  afterAll(async () => {
    await prisma.feature.update({ where: { id: "FEAT-119" }, data: { goal: null, scope: null, notes: null } });
  });

  it("tech lead sửa mục tiêu / phạm vi / ghi chú (markdown, rỗng = xoá); thành viên thường bị chặn", async () => {
    expect(await updateFeatureContent("FEAT-119", { goal: "  Lọc **nhanh**  ", scope: "- Trong: giá", notes: "" })).toEqual({ ok: true });
    const detail = await getFeatureDetail("rv-web", "FEAT-119");
    expect(detail).toMatchObject({ goal: "Lọc **nhanh**", scope: "- Trong: giá", notes: null, feature: { id: "FEAT-119" } });
    expect(detail!.feature.tasks.length).toBeGreaterThan(0);
    expect(await getFeatureDetail("crm", "FEAT-119")).toBeNull();

    vi.mocked(getSessionMemberId).mockResolvedValue("nam");
    try {
      expect(await updateFeatureContent("FEAT-119", { goal: "x", scope: "", notes: "" })).toEqual({
        ok: false,
        error: "Chỉ tech lead hoặc người tạo dự án được sửa feature",
      });
    } finally {
      vi.mocked(getSessionMemberId).mockResolvedValue("hieu");
    }
  });
});

describe("phase + phụ thuộc feature (F28.1)", () => {
  afterAll(async () => {
    const phase = await prisma.projectPhase.findFirstOrThrow({ where: { projectId: "rv-web", code: "2" } });
    await prisma.feature.update({ where: { id: "FEAT-119" }, data: { phaseId: phase.id } });
    await prisma.featureDependency.deleteMany({ where: { featureId: "FEAT-124" } });
  });

  it("seed có phase theo thứ tự; feature hiện phase + phụ thuộc hai chiều", async () => {
    expect((await getPhasesByProject("rv-web")).map((p) => p.code)).toEqual(["1", "2"]);
    const features = await getFeaturesByProject("rv-web");
    expect(features.find((f) => f.id === "FEAT-118")).toMatchObject({ phase: { code: "1" }, blocking: [{ id: "FEAT-120" }] });
    expect(features.find((f) => f.id === "FEAT-120")?.dependsOn.map((d) => d.id)).toEqual(["FEAT-118"]);
  });

  it("đổi phase, thêm phụ thuộc; chặn vòng, khác dự án, phase dự án khác", async () => {
    const phase1 = await prisma.projectPhase.findFirstOrThrow({ where: { projectId: "rv-web", code: "1" } });
    expect(await setFeaturePhase("FEAT-119", phase1.id)).toEqual({ ok: true });
    expect((await getFeaturesByProject("rv-web")).find((f) => f.id === "FEAT-119")?.phase?.code).toBe("1");
    expect(await setFeaturePhase("FEAT-301", phase1.id)).toEqual({ ok: false, error: "Không tìm thấy phase" });

    expect(await setFeatureDependency("FEAT-124", "FEAT-120", true)).toEqual({ ok: true });
    expect(await setFeatureDependency("FEAT-118", "FEAT-124", true)).toMatchObject({ ok: false, error: expect.stringContaining("sẽ tạo vòng") });
    expect(await setFeatureDependency("FEAT-124", "FEAT-301", true)).toMatchObject({ ok: false, error: expect.stringContaining("Không tìm thấy feature") });
  });
});
