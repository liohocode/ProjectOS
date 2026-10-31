import { prisma } from "@/lib/prisma";
import { parseTaskLinks, type TaskLinks, type TaskLinksInput } from "@/lib/taskLinks";
import type { TaskStage } from "@/lib/generated/prisma/enums";
import { formatDue, parseTaskStatus, TASK_STATUS_LABEL, toIsoDate } from "@/lib/taskFormat";
import { DEFAULT_AGENT_CONFIG } from "@/lib/agentConfig";
import { transitionTask } from "./taskTransitions";
import { reviewGateBlocker } from "./taskCriteria";
import { dependencyBlocker } from "./taskDependencies";

// Nghiệp vụ task dùng chung cho MCP tool (agent, F16). Không có "use server"; nơi gọi tự xác thực danh tính.

export interface TaskListFilter {
  projectId?: string;
  stage?: TaskStage;
  assigneeId?: string;
}

export interface AgentTaskView {
  id: string;
  title: string;
  projectId: string;
  featureId: string;
  featureName: string;
  stage: TaskStage;
  status: string;
  assigneeId: string;
  assignee: string;
  estimatePoints: number | null;
  /** "YYYY-MM-DD" hoặc null */
  dueDate: string | null;
  due: string;
  blocked: string | null;
  running: boolean;
  /** Lần trả lại gần nhất sau review (F22.2) — lý do để agent sửa; null = chưa bị trả lại */
  lastReturn: { reason: string; at: string } | null;
  /** PR / branch / commit đã báo (F22.4) */
  links: TaskLinks;
  /** Acceptance criteria đã đạt / tổng (F21.6) — chi tiết ở context_get */
  criteria: { done: number; total: number };
  /** F21.7: mã trong kế hoạch (vd "F21.3"), cỡ S/M/L, cần người quyết định (agent không tự làm) */
  code: string | null;
  size: "S" | "M" | "L" | null;
  needsDecision: boolean;
  /** F21.8: task phụ thuộc chưa Done — còn thì chưa claim được */
  waitingOn: string[];
}

const MAX_TASKS = 200;

/** `prisma` hoặc client trong transaction — chỉ cần bảng task. */
type TaskDb = Pick<typeof prisma, "task">;

/** Task trong các dự án `memberId` thuộc về (ProjectMember) — agent không thấy dự án khác. */
export async function listTasksForMember(memberId: string, filter: TaskListFilter = {}): Promise<AgentTaskView[]> {
  return queryTasks(prisma, memberId, filter);
}

/** Một task (trong transaction) dạng view của agent. */
function listTasksForMemberTx(tx: TaskDb, memberId: string, taskId: string): Promise<AgentTaskView[]> {
  return queryTasks(tx, memberId, { taskId });
}

async function queryTasks(db: TaskDb, memberId: string, filter: TaskListFilter & { taskId?: string }): Promise<AgentTaskView[]> {
  const rows = await db.task.findMany({
    where: {
      // F21.4: task lưu trữ ẩn khỏi tasks_list / context_get.
      archivedAt: null,
      ...(filter.taskId && { id: filter.taskId }),
      feature: {
        archivedAt: null,
        project: { members: { some: { memberId } } },
        ...(filter.projectId && { projectId: filter.projectId }),
      },
      ...(filter.stage && { stage: filter.stage }),
      ...(filter.assigneeId && { assigneeId: filter.assigneeId }),
    },
    orderBy: [{ feature: { projectId: "asc" } }, { id: "asc" }],
    take: MAX_TASKS,
    select: {
      id: true,
      title: true,
      stage: true,
      status: true,
      assigneeId: true,
      estimatePoints: true,
      dueDate: true,
      blocked: true,
      runningSince: true,
      prUrl: true,
      branch: true,
      commitSha: true,
      criteria: { select: { doneAt: true } },
      code: true,
      size: true,
      needsDecision: true,
      dependsOn: { where: { dependsOn: { stage: { not: "Done" }, archivedAt: null } }, select: { dependsOnId: true }, orderBy: { dependsOnId: "asc" } },
      assignee: { select: { name: true } },
      feature: { select: { id: true, name: true, projectId: true } },
      transitions: { where: { note: { not: null }, fromStage: "Review" }, orderBy: { at: "desc" }, take: 1, select: { note: true, at: true } },
    },
  });
  return rows.map((t) => ({
    id: t.id,
    title: t.title,
    projectId: t.feature.projectId,
    featureId: t.feature.id,
    featureName: t.feature.name,
    stage: t.stage,
    status: TASK_STATUS_LABEL[t.status],
    assigneeId: t.assigneeId,
    assignee: t.assignee.name,
    estimatePoints: t.estimatePoints,
    dueDate: toIsoDate(t.dueDate),
    due: formatDue(t.dueDate),
    blocked: t.blocked,
    running: t.runningSince !== null,
    lastReturn: t.transitions[0] ? { reason: t.transitions[0].note!, at: t.transitions[0].at.toISOString() } : null,
    links: { prUrl: t.prUrl, branch: t.branch, commitSha: t.commitSha },
    criteria: { done: t.criteria.filter((c) => c.doneAt !== null).length, total: t.criteria.length },
    code: t.code,
    size: t.size,
    needsDecision: t.needsDecision,
    waitingOn: t.dependsOn.map((d) => d.dependsOnId),
  }));
}

export type ClaimResult =
  | { ok: true; task: AgentTaskView; alreadyRunning: boolean; projectId: string }
  | { ok: false; reason: string; projectId: string | null };

/**
 * Agent nhận task (F16.3, FR-AG-05): gán cho agent, `runningSince = now`, trạng thái "Đang chạy".
 * Chặn: task không thuộc dự án của agent, đã Done, đang bị block, đang chạy bởi người/agent khác,
 * hoặc agent đã chạy đủ `maxConcurrentTasks`. Khoá dòng member của agent trong transaction để hai lệnh claim
 * đồng thời không cùng lọt qua giới hạn.
 */
export async function claimTask(agentId: string, taskId: string, now: Date = new Date()): Promise<ClaimResult> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM "members" WHERE "id" = ${agentId} FOR UPDATE`;
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: {
        title: true,
        stage: true,
        blocked: true,
        assigneeId: true,
        runningSince: true,
        archivedAt: true,
        assignee: { select: { name: true } },
        feature: { select: { projectId: true, archivedAt: true, project: { select: { members: { where: { memberId: agentId }, select: { memberId: true } } } } } },
      },
    });
    if (!task || task.feature.project.members.length === 0) return { ok: false, reason: `Không tìm thấy task ${taskId} trong dự án của bạn`, projectId: null };
    if (task.archivedAt || task.feature.archivedAt) return { ok: false, reason: `${taskId} đã được lưu trữ`, projectId: task.feature.projectId };
    const projectId = task.feature.projectId;
    if (task.stage === "Done") return { ok: false, reason: `${taskId} đã Done`, projectId };
    if (task.blocked) return { ok: false, reason: `${taskId} đang bị block: ${task.blocked}`, projectId };
    // F21.8: chưa bắt đầu được khi task phụ thuộc chưa Done.
    const waiting = await dependencyBlocker(taskId);
    if (waiting) return { ok: false, reason: waiting, projectId };
    if (task.runningSince && task.assigneeId !== agentId) {
      return { ok: false, reason: `${taskId} đang được ${task.assignee.name} chạy`, projectId };
    }
    const alreadyRunning = task.runningSince !== null && task.assigneeId === agentId;
    if (!alreadyRunning) {
      const [config, running] = await Promise.all([
        tx.agentConfig.findUnique({ where: { memberId: agentId }, select: { maxConcurrentTasks: true } }),
        tx.task.count({ where: { assigneeId: agentId, runningSince: { not: null } } }),
      ]);
      const limit = config?.maxConcurrentTasks ?? DEFAULT_AGENT_CONFIG.maxConcurrentTasks;
      if (running >= limit) return { ok: false, reason: `Đã chạy ${running}/${limit} task đồng thời — hoàn thành hoặc nhả task trước khi claim thêm`, projectId };

      await transitionTask(tx, taskId, agentId, "mcp", { status: "DangChay" }, { assigneeId: agentId, runningSince: now });
      // Cột "Đang làm" ở màn team + hoạt động gần đây của agent (như giao task từ UI, F13.3).
      await tx.member.update({ where: { id: agentId }, data: { current: `${taskId} ${task.title}` } });
      await tx.memberActivity.create({ data: { memberId: agentId, icon: "ph-play", text: `Claim ${taskId} qua MCP`, at: now } });
    }
    const [view] = await listTasksForMemberTx(tx, agentId, taskId);
    return { ok: true, task: view, alreadyRunning, projectId };
  });
}

/** Stage / trạng thái agent được tự đặt (F16.4): không tự Done — người duyệt mới Done; "Đang chạy" đi qua tasks_claim. */
export const AGENT_STAGES = ["BA", "TA", "Dev", "Review"] as const;
export const AGENT_STATUSES = ["Đang làm", "Chờ", "Chờ review"] as const;

export type TaskWriteResult = { ok: true; task: AgentTaskView; projectId: string } | { ok: false; reason: string; projectId: string | null };

/** Task thuộc dự án của agent và đang giao cho agent đó (agent chỉ sửa task của mình). */
async function findOwnTask(agentId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      title: true,
      assigneeId: true,
      stage: true,
      runningSince: true,
      archivedAt: true,
      feature: { select: { projectId: true, project: { select: { members: { where: { memberId: agentId }, select: { memberId: true } } } } } },
    },
  });
  if (!task || task.feature.project.members.length === 0) return null;
  return task;
}

/**
 * Agent cập nhật stage / trạng thái task của mình (F16.4). Chặn: Done (stage hoặc trạng thái "Xong"), "Đang chạy"
 * (dùng tasks_claim), task giao cho người/agent khác. Rời "Đang chạy" → xoá `runningSince` (nhả task, F16.3).
 */
export async function updateTaskByAgent(
  agentId: string,
  taskId: string,
  change: { stage?: string; status?: string; links?: TaskLinksInput },
): Promise<TaskWriteResult> {
  const task = await findOwnTask(agentId, taskId);
  if (!task) return { ok: false, reason: `Không tìm thấy task ${taskId} trong dự án của bạn`, projectId: null };
  const projectId = task.feature.projectId;
  if (task.archivedAt) return { ok: false, reason: `${taskId} đã được lưu trữ`, projectId };
  if (task.assigneeId !== agentId) return { ok: false, reason: `${taskId} không giao cho bạn — dùng tasks_claim trước`, projectId };
  // F22.3: vào Review cần mọi acceptance criterion đạt (agent tick bằng criteria_check).
  if (change.stage === "Review" && task.stage !== "Review") {
    const blocked = await reviewGateBlocker(taskId);
    if (blocked) return { ok: false, reason: blocked, projectId };
  }
  const links = parseTaskLinks(change.links ?? {});
  if (!links.ok) return { ok: false, reason: links.error, projectId };
  const hasLinks = Object.keys(links.links).length > 0;
  if (!change.stage && !change.status && !hasLinks) return { ok: false, reason: "Cần stage, status hoặc liên kết (prUrl / branch / commit)", projectId };
  if (change.stage === "Done" || change.status === "Xong") {
    return { ok: false, reason: "Agent không tự đánh dấu Done — chuyển sang Review để người duyệt", projectId };
  }
  if (change.status === "Đang chạy") return { ok: false, reason: "Dùng tasks_claim để chạy task", projectId };
  if (change.stage && !(AGENT_STAGES as readonly string[]).includes(change.stage)) return { ok: false, reason: `Stage không hợp lệ: ${change.stage}`, projectId };
  if (change.status && !(AGENT_STATUSES as readonly string[]).includes(change.status)) {
    return { ok: false, reason: `Trạng thái không hợp lệ: ${change.status}`, projectId };
  }

  // F22.4: liên kết không phải chuyển trạng thái → không ghi TaskTransition.
  if (hasLinks) await prisma.task.update({ where: { id: taskId }, data: links.links });
  if (change.stage || change.status) await transitionTask(
    prisma,
    taskId,
    agentId,
    "mcp",
    {
      ...(change.stage && { stage: change.stage as TaskStage }),
      ...(change.status && { status: parseTaskStatus(change.status) }),
    },
    // Đổi trạng thái = rời "Đang chạy" → nhả task (không còn tính vào giới hạn task đồng thời).
    change.status ? { runningSince: null } : {},
  );
  const [view] = await listTasksForMemberTx(prisma, agentId, taskId);
  return { ok: true, task: view, projectId };
}

/** Agent bình luận trên task trong dự án của mình (F16.4). */
export async function commentOnTask(
  authorId: string,
  taskId: string,
  body: string,
): Promise<{ ok: true; commentId: string; projectId: string } | { ok: false; reason: string; projectId: string | null }> {
  const text = body.trim();
  if (!text) return { ok: false, reason: "Bình luận trống", projectId: null };
  if (text.length > 4000) return { ok: false, reason: "Bình luận tối đa 4000 ký tự", projectId: null };
  const task = await findOwnTask(authorId, taskId);
  if (!task) return { ok: false, reason: `Không tìm thấy task ${taskId} trong dự án của bạn`, projectId: null };
  const comment = await prisma.taskComment.create({ data: { taskId, authorId, body: text }, select: { id: true } });
  return { ok: true, commentId: comment.id, projectId: task.feature.projectId };
}
