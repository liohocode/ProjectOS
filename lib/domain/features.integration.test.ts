import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getSessionMemberId } from "@/lib/auth/session";
import { getFeaturesByProject, getProposedFeatures } from "@/lib/data/features";
import { getTimelineByProject } from "@/lib/data/timeline";
import { approveFeatureProposal, rejectFeatureProposal } from "@/lib/actions/features";
import { proposeFeature } from "./features";

// F16.6 — Bảo (BA agent, thuộc rv-web) đề xuất; lead duyệt / từ chối.
afterAll(async () => {
  await prisma.feature.deleteMany({ where: { name: { startsWith: "IT " } } });
  await prisma.memberActivity.deleteMany({ where: { memberId: "hieu", text: { contains: "IT " } } });
});

describe("features_propose (F16.6)", () => {
  it("đề xuất → mã FEAT-n mới, chờ duyệt, không vào list chính / timeline", async () => {
    const r = await proposeFeature("agent-bao", { projectId: "rv-web", name: "IT Thông báo đẩy", description: "Gửi thông báo khi tin được duyệt" });
    expect(r).toMatchObject({ ok: true, projectId: "rv-web", featureId: expect.stringMatching(/^FEAT-\d+$/) });
    const id = (r as { featureId: string }).featureId;
    expect((await getProposedFeatures("rv-web")).find((p) => p.id === id)).toMatchObject({ name: "IT Thông báo đẩy", proposedBy: "Bảo" });
    expect((await getFeaturesByProject("rv-web")).some((f) => f.id === id)).toBe(false);
    expect((await getTimelineByProject("rv-web")).some((row) => row.featureId === id)).toBe(false);
  });

  it("chặn: dự án agent không thuộc, tên trống", async () => {
    // Vega không thuộc crm.
    expect(await proposeFeature("agent-vega", { projectId: "crm", name: "IT x", description: "x" })).toMatchObject({ ok: false, projectId: null });
    expect(await proposeFeature("agent-bao", { projectId: "rv-web", name: " ", description: "x" })).toMatchObject({ ok: false });
  });

  it("thành viên thường không duyệt được; lead duyệt → vào list chính; từ chối cần lý do", async () => {
    const [p] = (await getProposedFeatures("rv-web")).filter((x) => x.name === "IT Thông báo đẩy");
    vi.mocked(getSessionMemberId).mockResolvedValue("nam");
    try {
      expect(await approveFeatureProposal(p.id)).toEqual({ ok: false, error: "Chỉ tech lead hoặc người tạo dự án được duyệt feature đề xuất" });
    } finally {
      vi.mocked(getSessionMemberId).mockResolvedValue("hieu");
    }
    expect(await approveFeatureProposal(p.id)).toEqual({ ok: true });
    expect((await getFeaturesByProject("rv-web")).some((f) => f.id === p.id)).toBe(true);
    expect(await approveFeatureProposal(p.id)).toEqual({ ok: false, error: "Feature không còn chờ duyệt" });

    const r = await proposeFeature("agent-bao", { projectId: "rv-web", name: "IT Bị từ chối", description: "x" });
    const id = (r as { featureId: string }).featureId;
    expect(await rejectFeatureProposal(id, " ")).toEqual({ ok: false, error: "Nhập lý do từ chối" });
    expect(await rejectFeatureProposal(id, "Trùng FEAT-118")).toEqual({ ok: true });
    expect(await prisma.feature.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: "rejected", rejectedReason: "Trùng FEAT-118" });
    expect((await getProposedFeatures("rv-web")).some((x) => x.id === id)).toBe(false);
  });
});
