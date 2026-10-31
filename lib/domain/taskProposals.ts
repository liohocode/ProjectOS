import { prisma } from "@/lib/prisma";
import type { TaskSize, TaskStage } from "@/lib/generated/prisma/enums";
import { recordTaskCreated } from "./taskTransitions";

// Task do agent đề xuất (F24.2, MCP `tasks_create`). Đề xuất nằm ở bảng riêng `task_proposals` — chưa phải task nên
// list / timeline / chỉ số / MCP `tasks_list` không phải lọc thêm. Lead (`feature.review`) duyệt → tạo task thật;
// từ chối → giữ lịch sử kèm lý do. Nơi gọi tự xác thực danh tính / quyền.

export const MAX_PROPOSAL_CRITERIA = 10;

/** Cấp id `T-<số lớn nhất + 1>` (ADR-006) — gọi trong transaction; advisory lock để hai request không lấy trùng số. */
type Tx = Pick<typeof prisma, "$executeRaw" | "$queryRaw">;

export async function allocateTaskId(tx: Tx): Promise<string> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('meridian:task-id'))`;
  const [{ max }] = await tx.$queryRaw<{ max: number }[]>`
    SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 3) AS INTEGER)), 0) AS max FROM tasks WHERE id ~ '^T-[0-9]+$'`;
  return `T-${max + 1}`;
}

export interface TaskProposalInput {
  featureId: string;
  title: string;
  description?: string;
  size?: TaskSize;
  stage?: TaskStage;
  /** Người / agent đề xuất làm (phải thuộc dự án); bỏ trống = chính agent đề xuất */
  assigneeId?: string;
  criteria?: string[];
}

export type ProposeTaskResult =
  | { ok: true; proposalId: string; projectId: string; featureId: string }
  | { ok: false; reason: string; projectId: string | null };

export async function proposeTask(agentId: string, input: TaskProposalInput): Promise<ProposeTaskResult> {
  const title = input.title.trim();
  if (!title || title.length > 200) return { ok: false, reason: "Tiêu đề task 1–200 ký tự", projectId: null };
  const description = input.description?.trim() || null;
  if (description && description.length > 10_000) return { ok: false, reason: "Mô tả tối đa 10.000 ký tự", projectId: null };
  const criteria = (input.criteria ?? []).map((c) => c.trim()).filter(Boolean);
  if (criteria.length > MAX_PROPOSAL_CRITERIA) return { ok: false, reason: `Tối đa ${MAX_PROPOSAL_CRITERIA} tiêu chí`, projectId: null };
  if (criteria.some((c) => c.length > 300)) return { ok: false, reason: "Mỗi tiêu chí tối đa 300 ký tự", projectId: null };

  const feature = await prisma.feature.findUnique({
    where: { id: input.featureId },
    select: { projectId: true, status: true, archivedAt: true },
  });
  // Agent chỉ thấy dự án mình thuộc — feature của dự án khác trả cùng thông báo như không tồn tại.
  const member = feature && (await prisma.projectMember.findUnique({ where: { projectId_memberId: { projectId: feature.projectId, memberId: agentId } } }));
  if (!feature || !member) return { ok: false, reason: `Không tìm thấy feature ${input.featureId} trong các dự án của bạn`, projectId: null };
  if (feature.status !== "active" || feature.archivedAt) return { ok: false, reason: "Feature chưa được duyệt hoặc đã lưu trữ", projectId: feature.projectId };
  if (input.assigneeId && input.assigneeId !== agentId) {
    const assignee = await prisma.projectMember.findUnique({ where: { projectId_memberId: { projectId: feature.projectId, memberId: input.assigneeId } } });
    if (!assignee) return { ok: false, reason: `${input.assigneeId} không thuộc dự án`, projectId: feature.projectId };
  }

  const proposal = await prisma.taskProposal.create({
    data: {
      featureId: input.featureId,
      proposedById: agentId,
      title,
      description,
      size: input.size ?? null,
      stage: input.stage ?? "Dev",
      assigneeId: input.assigneeId && input.assigneeId !== agentId ? input.assigneeId : null,
      criteria,
    },
    select: { id: true },
  });
  return { ok: true, proposalId: proposal.id, projectId: feature.projectId, featureId: input.featureId };
}

export type ReviewTaskProposalResult =
  | { ok: true; projectId: string; featureId: string; title: string; taskId: string | null }
  | { ok: false; error: string };

/** Dự án của một đề xuất (để server action kiểm quyền); null = không tồn tại. */
export async function taskProposalProject(proposalId: string): Promise<string | null> {
  const p = await prisma.taskProposal.findUnique({ where: { id: proposalId }, select: { feature: { select: { projectId: true } } } });
  return p?.feature.projectId ?? null;
}

/**
 * Duyệt → tạo task thật (trạng thái Chờ, vào sprint hiện tại, kèm tiêu chí) trong một transaction; từ chối → ghi lý do.
 * Điều kiện status = pending trong câu ghi → hai người duyệt cùng lúc, người sau nhận lỗi thay vì tạo task trùng.
 */
export async function reviewTaskProposal(
  proposalId: string,
  reviewerId: string,
  decision: { approve: true } | { approve: false; reason: string },
): Promise<ReviewTaskProposalResult> {
  const p = await prisma.taskProposal.findUnique({
    where: { id: proposalId },
    include: { feature: { select: { projectId: true, status: true, archivedAt: true, project: { select: { currentSprintId: true } } } } },
  });
  if (!p) return { ok: false, error: "Không tìm thấy đề xuất" };
  if (p.status !== "pending") return { ok: false, error: "Đề xuất không còn chờ duyệt" };
  const base = { projectId: p.feature.projectId, featureId: p.featureId, title: p.title };

  if (!decision.approve) {
    const reason = decision.reason.trim();
    if (!reason) return { ok: false, error: "Nhập lý do từ chối" };
    const { count } = await prisma.taskProposal.updateMany({
      where: { id: proposalId, status: "pending" },
      data: { status: "rejected", rejectedReason: reason.slice(0, 500), reviewedAt: new Date() },
    });
    return count ? { ok: true, ...base, taskId: null } : { ok: false, error: "Đề xuất không còn chờ duyệt" };
  }

  if (p.feature.status !== "active" || p.feature.archivedAt) return { ok: false, error: "Feature chưa được duyệt hoặc đã lưu trữ" };
  // Người được đề xuất có thể đã rời dự án từ lúc đề xuất → giao lại cho agent đề xuất (nếu còn), không thì báo lỗi.
  const candidates = [p.assigneeId, p.proposedById].filter((id): id is string => Boolean(id));
  const members = await prisma.projectMember.findMany({
    where: { projectId: p.feature.projectId, memberId: { in: candidates } },
    select: { memberId: true },
  });
  const assigneeId = candidates.find((id) => members.some((m) => m.memberId === id));
  if (!assigneeId) return { ok: false, error: "Người được đề xuất làm không còn thuộc dự án" };

  const taskId = await prisma.$transaction(async (tx) => {
    const { count } = await tx.taskProposal.updateMany({ where: { id: proposalId, status: "pending" }, data: { status: "approved", reviewedAt: new Date() } });
    if (count === 0) return null;
    const id = await allocateTaskId(tx);
    await tx.task.create({
      data: {
        id,
        featureId: p.featureId,
        title: p.title,
        stage: p.stage,
        assigneeId,
        status: "Cho",
        description: p.description,
        size: p.size,
        sprintId: p.feature.project.currentSprintId,
      },
    });
    if (p.criteria.length) {
      await tx.taskCriterion.createMany({ data: p.criteria.map((text, position) => ({ taskId: id, text, position })) });
    }
    await tx.taskProposal.update({ where: { id: proposalId }, data: { taskId: id } });
    await recordTaskCreated(tx, id, reviewerId, "web", p.stage, "Cho");
    return id;
  });
  return taskId ? { ok: true, ...base, taskId } : { ok: false, error: "Đề xuất không còn chờ duyệt" };
}
