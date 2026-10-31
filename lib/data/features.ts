import { cache } from "react";
import type { Feature, ProposedFeature, Task } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { TASK_STATUS_LABEL, formatDue, formatEstimate, formatRunning, toIsoDate } from "@/lib/taskFormat";
import { formatRelativeVi } from "@/lib/relativeTime";
import { featureProgress } from "@/lib/featureProgress";

export const UNASSIGNED_OWNER = "Chưa giao";

const TASK_INCLUDE = {
  assignee: true,
  criteria: {
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: { id: true, text: true, doneAt: true, doneBy: { select: { name: true } } },
  },
} satisfies Prisma.TaskInclude;

type TaskRow = Prisma.TaskGetPayload<{ include: typeof TASK_INCLUDE }>;

function toTask(t: TaskRow, now: Date): Task {
  return {
    id: t.id,
    stage: t.stage,
    title: t.title,
    assigneeId: t.assigneeId,
    who: t.assignee.name,
    kind: t.assignee.kind,
    status: TASK_STATUS_LABEL[t.status],
    est: formatEstimate(t.estimatePoints),
    due: formatDue(t.dueDate),
    estimatePoints: t.estimatePoints,
    dueIso: toIsoDate(t.dueDate),
    blocked: t.blocked ?? undefined,
    blockedFull: t.blockedFull ?? undefined,
    running: t.runningSince ? formatRunning(t.runningSince, now) : undefined,
    runningSince: t.runningSince?.toISOString(),
    links: { prUrl: t.prUrl, branch: t.branch, commitSha: t.commitSha },
    sprintId: t.sprintId,
    criteria: t.criteria.map((c) => ({ id: c.id, text: c.text, done: c.doneAt !== null, doneBy: c.doneBy?.name ?? null })),
    ...(t.archivedAt && { archived: true as const }),
    ...(t.description && { description: t.description }),
    ...(t.size && { size: t.size }),
    ...(t.code && { code: t.code }),
    ...(t.needsDecision && { needsDecision: true as const }),
  };
}

export const getFeaturesByProject = cache(async (projectId: string): Promise<Feature[]> => {
  const rows = await prisma.feature.findMany({
    // Feature agent đề xuất chờ duyệt / bị từ chối không vào list chính (F16.6).
    where: { projectId, status: "active" },
    include: {
      owner: true,
      tasks: {
        // Task lưu trữ (F21.4) không vào list; mở bằng deep link qua getArchivedTask.
        where: { archivedAt: null },
        include: TASK_INCLUDE,
        orderBy: { id: "asc" },
      },
      _count: { select: { docs: true } },
    },
    orderBy: { id: "asc" },
  });

  const now = new Date();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    stage: row.stage,
    owner: row.owner?.name ?? UNASSIGNED_OWNER,
    ownerKind: row.owner?.kind ?? null,
    ownerId: row.ownerId,
    plannedStart: toIsoDate(row.plannedStart),
    plannedEnd: toIsoDate(row.plannedEnd),
    // F21.2: tính từ task (cột `Feature.pct` cũ không còn đọc).
    pct: featureProgress(row.tasks),
    docs: row._count.docs,
    tasks: row.tasks.map((t) => toTask(t, now)),
  }));
});

export const getTasksByProject = cache(async (projectId: string): Promise<Task[]> => {
  const features = await getFeaturesByProject(projectId);
  return features.flatMap((f) => f.tasks);
});

/** Số task + số task bị block cho badge sidebar — đếm trong DB, không tải cả cây feature/task. */
export const getTaskCountsByProject = cache(async (projectId: string): Promise<{ total: number; blocked: number }> => {
  const [total, blocked] = await Promise.all([
    prisma.task.count({ where: { feature: { projectId }, archivedAt: null } }),
    prisma.task.count({ where: { feature: { projectId }, archivedAt: null, blocked: { not: null } } }),
  ]);
  return { total, blocked };
});

/** Feature agent đề xuất đang chờ lead duyệt (F16.6), cũ trước. */
export const getProposedFeatures = cache(async (projectId: string): Promise<ProposedFeature[]> => {
  const rows = await prisma.feature.findMany({
    where: { projectId, status: "proposed" },
    orderBy: [{ proposedAt: "asc" }, { id: "asc" }],
    select: { id: true, name: true, proposal: true, proposedAt: true, proposedBy: { select: { name: true } } },
  });
  return rows.map((f) => ({
    id: f.id,
    name: f.name,
    proposal: f.proposal ?? "",
    proposedBy: f.proposedBy?.name ?? "Agent",
    when: f.proposedAt ? formatRelativeVi(f.proposedAt) : "",
  }));
});

/** Task đã lưu trữ (F21.4) — chỉ để mở bằng deep link `?task=`; null nếu không có / chưa lưu trữ / khác dự án. */
export const getArchivedTask = cache(async (projectId: string, taskId: string): Promise<{ task: Task; featureId: string } | null> => {
  const row = await prisma.task.findFirst({
    where: { id: taskId, archivedAt: { not: null }, feature: { projectId, status: "active" } },
    include: TASK_INCLUDE,
  });
  return row ? { task: toTask(row, new Date()), featureId: row.featureId } : null;
});
