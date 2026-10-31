import { prisma } from "@/lib/prisma";
import type { TaskStage } from "@/lib/generated/prisma/enums";
import { formatDue, parseTaskStatus, TASK_STATUS_LABEL, toIsoDate } from "@/lib/taskFormat";
import { DEFAULT_AGENT_CONFIG } from "@/lib/agentConfig";
import { transitionTask } from "./taskTransitions";

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
      ...(filter.taskId && { id: filter.taskId }),
      feature: {
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
      assignee: { select: { name: true } },
      feature: { select: { id: true, name: true, projectId: true } },
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
        assignee: { select: { name: true } },
        feature: { select: { projectId: true, project: { select: { members: { where: { memberId: agentId }, select: { memberId: true } } } } } },
      },
    });
    if (!task || task.feature.project.members.length === 0) return { ok: false, reason: `Không tìm thấy task ${taskId} trong dự án của bạn`, projectId: null };
    const projectId = task.feature.projectId;
    if (task.stage === "Done") return { ok: false, reason: `${taskId} đã Done`, projectId };
    if (task.blocked) return { ok: false, reason: `${taskId} đang bị block: ${task.blocked}`, projectId };
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
      runningSince: true,
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
  change: { stage?: string; status?: string },
): Promise<TaskWriteResult> {
  const task = await findOwnTask(agentId, taskId);
  if (!task) return { ok: false, reason: `Không tìm thấy task ${taskId} trong dự án của bạn`, projectId: null };
  const projectId = task.feature.projectId;
  if (task.assigneeId !== agentId) return { ok: false, reason: `${taskId} không giao cho bạn — dùng tasks_claim trước`, projectId };
  if (!change.stage && !change.status) return { ok: false, reason: "Cần stage hoặc status", projectId };
  if (change.stage === "Done" || change.status === "Xong") {
    return { ok: false, reason: "Agent không tự đánh dấu Done — chuyển sang Review để người duyệt", projectId };
  }
  if (change.status === "Đang chạy") return { ok: false, reason: "Dùng tasks_claim để chạy task", projectId };
  if (change.stage && !(AGENT_STAGES as readonly string[]).includes(change.stage)) return { ok: false, reason: `Stage không hợp lệ: ${change.stage}`, projectId };
  if (change.status && !(AGENT_STATUSES as readonly string[]).includes(change.status)) {
    return { ok: false, reason: `Trạng thái không hợp lệ: ${change.status}`, projectId };
  }

  await transitionTask(
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
