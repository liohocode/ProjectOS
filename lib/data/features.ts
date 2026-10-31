import { cache } from "react";
import type { Feature, ProjectPhaseView, ProposedFeature, ProposedTask, Task } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { TASK_STATUS_LABEL, formatDue, formatEstimate, formatRunning, toIsoDate } from "@/lib/taskFormat";
import { formatRelativeVi } from "@/lib/relativeTime";
import { featureProgress } from "@/lib/featureProgress";

export const UNASSIGNED_OWNER = "Chưa giao";

const REF = { select: { id: true, title: true, stage: true } } as const;

const TASK_INCLUDE = {
  assignee: true,
  dependsOn: { where: { dependsOn: { archivedAt: null } }, orderBy: { dependsOnId: "asc" }, select: { dependsOn: REF } },
  blocking: { where: { task: { archivedAt: null } }, orderBy: { taskId: "asc" }, select: { task: REF } },
  docs: { orderBy: { docId: "asc" }, select: { doc: { select: { id: true, title: true } } } },
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
    dependsOn: t.dependsOn.map(({ dependsOn: d }) => ({ ...d, done: d.stage === "Done" })),
    blocking: t.blocking.map(({ task: d }) => ({ ...d, done: d.stage === "Done" })),
    docs: t.docs.map(({ doc }) => doc),
    ...(t.archivedAt && { archived: true as const }),
    ...(t.description && { description: t.description }),
    ...(t.size && { size: t.size }),
    ...(t.code && { code: t.code }),
    ...(t.needsDecision && { needsDecision: true as const }),
  };
}

/** Thứ tự ưu tiên (F21.10): `position` nhỏ trước, chưa đặt xếp cuối theo id. */
export const PRIORITY_ORDER = [{ position: { sort: "asc", nulls: "last" } }, { id: "asc" }] satisfies Prisma.FeatureOrderByWithRelationInput[];

const FEATURE_REF = { select: { id: true, name: true, stage: true } } as const;

const FEATURE_INCLUDE = {
  owner: true,
  phase: { select: { id: true, code: true, name: true } },
  dependsOn: { orderBy: { dependsOnId: "asc" }, select: { dependsOn: FEATURE_REF } },
  blocking: { where: { feature: { archivedAt: null, status: "active" } }, orderBy: { featureId: "asc" }, select: { feature: FEATURE_REF } },
  tasks: {
    // Task lưu trữ (F21.4) không vào list; mở bằng deep link qua getArchivedTask.
    where: { archivedAt: null },
    include: TASK_INCLUDE,
    orderBy: [{ position: { sort: "asc", nulls: "last" } }, { id: "asc" }],
  },
  _count: { select: { docs: true } },
} satisfies Prisma.FeatureInclude;

function toFeature(row: Prisma.FeatureGetPayload<{ include: typeof FEATURE_INCLUDE }>, now: Date): Feature {
  return {
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
    phase: row.phase,
    dependsOn: row.dependsOn.map((d) => d.dependsOn),
    blocking: row.blocking.map((d) => d.feature),
    ...(row.archivedAt && { archived: true as const }),
  };
}

export const getFeaturesByProject = cache(async (projectId: string): Promise<Feature[]> => {
  const rows = await prisma.feature.findMany({
    // Feature agent đề xuất chờ duyệt / bị từ chối (F16.6) và feature lưu trữ (F21.10) không vào list chính.
    where: { projectId, status: "active", archivedAt: null },
    include: FEATURE_INCLUDE,
    orderBy: PRIORITY_ORDER,
  });
  const now = new Date();
  return rows.map((row) => toFeature(row, now));
});

export const getTasksByProject = cache(async (projectId: string): Promise<Task[]> => {
  const features = await getFeaturesByProject(projectId);
  return features.flatMap((f) => f.tasks);
});

/** Số task + số task bị block cho badge sidebar — đếm trong DB, không tải cả cây feature/task. */
export const getTaskCountsByProject = cache(async (projectId: string): Promise<{ total: number; blocked: number; decisions: number }> => {
  const [total, blocked, decisions] = await Promise.all([
    prisma.task.count({ where: { feature: { projectId, archivedAt: null }, archivedAt: null } }),
    prisma.task.count({ where: { feature: { projectId, archivedAt: null }, archivedAt: null, blocked: { not: null } } }),
    // F28.4: quyết định đang mở — badge mục Roadmap.
    prisma.task.count({ where: { feature: { projectId, archivedAt: null, status: "active" }, archivedAt: null, needsDecision: true, stage: { not: "Done" } } }),
  ]);
  return { total, blocked, decisions };
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

/** Task agent đề xuất đang chờ duyệt (F24.2), cũ trước — cả dự án hoặc một feature. Chỉ feature đang hoạt động. */
export const getProposedTasks = cache(async (projectId: string, featureId?: string): Promise<ProposedTask[]> => {
  const rows = await prisma.taskProposal.findMany({
    where: { status: "pending", feature: { projectId, status: "active", archivedAt: null, ...(featureId && { id: featureId }) } },
    orderBy: [{ proposedAt: "asc" }, { id: "asc" }],
    include: { feature: { select: { name: true } }, proposedBy: { select: { name: true } } },
  });
  const assigneeIds = [...new Set(rows.map((r) => r.assigneeId).filter((id): id is string => Boolean(id)))];
  const names = new Map(
    (assigneeIds.length ? await prisma.member.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, name: true } }) : []).map((m) => [m.id, m.name]),
  );
  return rows.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    size: p.size,
    stage: p.stage,
    criteria: p.criteria,
    featureId: p.featureId,
    featureName: p.feature.name,
    proposedBy: p.proposedBy.name,
    assignee: p.assigneeId ? (names.get(p.assigneeId) ?? p.assigneeId) : null,
    when: formatRelativeVi(p.proposedAt),
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

export interface FeatureDetail {
  feature: Feature;
  goal: string | null;
  scope: string | null;
  notes: string | null;
  docs: { id: string; title: string }[];
}

/** Trang chi tiết feature (F21.9) — feature đang chạy của dự án; null nếu không có. */
export const getFeatureDetail = cache(async (projectId: string, featureId: string): Promise<FeatureDetail | null> => {
  // Feature lưu trữ (F21.10) vẫn mở được bằng link để xem / khôi phục.
  const row = await prisma.feature.findFirst({ where: { id: featureId, projectId, status: "active" }, include: FEATURE_INCLUDE });
  if (!row) return null;
  const feature = toFeature(row, new Date());
  const docs = await prisma.doc.findMany({ where: { featureId }, select: { id: true, title: true }, orderBy: { title: "asc" } });
  return { feature, goal: row.goal, scope: row.scope, notes: row.notes, docs };
});

/** Phase của kế hoạch dự án theo thứ tự (F28.1). */
export const getPhasesByProject = cache(async (projectId: string): Promise<ProjectPhaseView[]> => {
  return prisma.projectPhase.findMany({
    where: { projectId },
    orderBy: [{ position: "asc" }, { code: "asc" }],
    select: { id: true, code: true, name: true, goal: true, position: true },
  });
});
