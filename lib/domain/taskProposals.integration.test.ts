import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getSessionMemberId } from "@/lib/auth/session";
import { getProposedTasks } from "@/lib/data/features";
import { getInbox, getInboxCounts } from "@/lib/data/inbox";
import { approveTaskProposal, rejectTaskProposal } from "@/lib/actions/features";
import { proposeTask } from "./taskProposals";

// F24.2 — agent đề xuất task (MCP `tasks_create`), lead duyệt → task thật. Seed: Bảo (agent) thuộc rv-web, FEAT-118 của rv-web.
afterAll(async () => {
  const proposals = await prisma.taskProposal.findMany({ where: { title: { startsWith: "IT " } }, select: { taskId: true } });
  const taskIds = proposals.map((p) => p.taskId).filter((id): id is string => Boolean(id));
  await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
  await prisma.taskProposal.deleteMany({ where: { title: { startsWith: "IT " } } });
  await prisma.memberActivity.deleteMany({ where: { memberId: "hieu", text: { contains: "IT " } } });
});

describe("tasks_create (F24.2)", () => {
  it("đề xuất → chờ duyệt, chưa thành task; inbox đếm chung với feature đề xuất", async () => {
    const before = await getInboxCounts("rv-web");
    const r = await proposeTask("agent-bao", {
      featureId: "FEAT-118",
      title: "IT Lưu nháp lên server",
      description: "Đồng bộ nháp `localStorage` lên server",
      size: "M",
      criteria: ["Nháp còn sau khi đổi máy", " ", "Có integration test"],
    });
    expect(r).toMatchObject({ ok: true, projectId: "rv-web", featureId: "FEAT-118" });
    const [p] = (await getProposedTasks("rv-web", "FEAT-118")).filter((x) => x.title === "IT Lưu nháp lên server");
    expect(p).toMatchObject({ stage: "Dev", size: "M", proposedBy: "Bảo", assignee: null, criteria: ["Nháp còn sau khi đổi máy", "Có integration test"] });
    expect(await prisma.task.count({ where: { title: "IT Lưu nháp lên server" } })).toBe(0);
    expect((await getInboxCounts("rv-web")).proposals).toBe(before.proposals + 1);
    expect((await getInbox("rv-web")).taskProposals.some((x) => x.id === p.id)).toBe(true);
  });

  it("chặn: feature dự án khác, người làm ngoài dự án, quá nhiều tiêu chí", async () => {
    const crmFeature = await prisma.feature.findFirstOrThrow({ where: { projectId: "crm" }, select: { id: true } });
    expect(await proposeTask("agent-vega", { featureId: crmFeature.id, title: "IT x" })).toMatchObject({ ok: false, projectId: null });
    expect(await proposeTask("agent-bao", { featureId: "FEAT-118", title: "IT x", assigneeId: "khong-ton-tai" })).toMatchObject({ ok: false, projectId: "rv-web" });
    expect(await proposeTask("agent-bao", { featureId: "FEAT-118", title: "IT x", criteria: Array.from({ length: 11 }, (_, i) => `c${i}`) })).toMatchObject({ ok: false });
  });

  it("thành viên thường không duyệt được; lead duyệt → task T-n trạng thái Chờ kèm tiêu chí; duyệt lần hai báo lỗi", async () => {
    const [p] = (await getProposedTasks("rv-web")).filter((x) => x.title === "IT Lưu nháp lên server");
    vi.mocked(getSessionMemberId).mockResolvedValue("nam");
    try {
      expect(await approveTaskProposal(p.id)).toEqual({ ok: false, error: "Chỉ tech lead hoặc người tạo dự án được duyệt feature đề xuất" });
    } finally {
      vi.mocked(getSessionMemberId).mockResolvedValue("hieu");
    }
    const r = await approveTaskProposal(p.id);
    expect(r).toMatchObject({ ok: true, taskId: expect.stringMatching(/^T-\d+$/) });
    const taskId = (r as { taskId: string }).taskId;
    const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId }, include: { criteria: { orderBy: { position: "asc" } }, transitions: true } });
    expect(task).toMatchObject({ featureId: "FEAT-118", stage: "Dev", status: "Cho", assigneeId: "agent-bao", size: "M" });
    expect(task.criteria.map((c) => c.text)).toEqual(["Nháp còn sau khi đổi máy", "Có integration test"]);
    expect(task.transitions).toMatchObject([{ actorId: "hieu", toStage: "Dev", toStatus: "Cho" }]);
    expect((await prisma.taskProposal.findUniqueOrThrow({ where: { id: p.id } })).taskId).toBe(taskId);
    expect(await approveTaskProposal(p.id)).toEqual({ ok: false, error: "Đề xuất không còn chờ duyệt" });
  });

  it("từ chối cần lý do; đã từ chối thì không còn trong danh sách chờ", async () => {
    const r = await proposeTask("agent-bao", { featureId: "FEAT-118", title: "IT Viết lại form", assigneeId: "hieu" });
    const id = (r as { proposalId: string }).proposalId;
    expect((await getProposedTasks("rv-web")).find((x) => x.id === id)?.assignee).toBe("Trung Hiếu");
    expect(await rejectTaskProposal(id, "  ")).toEqual({ ok: false, error: "Nhập lý do từ chối" });
    expect(await rejectTaskProposal(id, "Trùng T-396")).toEqual({ ok: true, taskId: null });
    expect((await getProposedTasks("rv-web")).some((x) => x.id === id)).toBe(false);
    expect(await prisma.taskProposal.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: "rejected", rejectedReason: "Trùng T-396" });
  });
});
