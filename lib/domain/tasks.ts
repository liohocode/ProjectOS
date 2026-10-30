import { prisma } from "@/lib/prisma";
import type { TaskStage } from "@/lib/generated/prisma/enums";
import { formatDue, TASK_STATUS_LABEL, toIsoDate } from "@/lib/taskFormat";

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

/** Task trong các dự án `memberId` thuộc về (ProjectMember) — agent không thấy dự án khác. */
export async function listTasksForMember(memberId: string, filter: TaskListFilter = {}): Promise<AgentTaskView[]> {
  const rows = await prisma.task.findMany({
    where: {
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
