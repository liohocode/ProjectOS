import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { MemberKind } from "@/lib/types";
import { summarize, taskQuality, type QualitySummary } from "@/lib/qualityMetrics";

// Chỉ số chất lượng (F22.5) của một dự án, tính từ TaskTransition (F22.1) — tổng dự án và theo người / agent thực hiện.
// Task của feature đang chạy, chưa lưu trữ (F21.4).

export interface QualityRow {
  memberId: string;
  name: string;
  kind: MemberKind;
  summary: QualitySummary;
}

export interface ProjectQuality {
  project: QualitySummary;
  byMember: QualityRow[];
}

/** `sprintId` rỗng = mọi task; có giá trị = chỉ task của sprint đó (F22.7). */
export const getQualityByProject = cache(async (projectId: string, sprintId = ""): Promise<ProjectQuality> => {
  const tasks = await prisma.task.findMany({
    where: { feature: { projectId, status: "active", archivedAt: null }, archivedAt: null, ...(sprintId && { sprintId }) },
    select: {
      stage: true,
      assignee: { select: { id: true, name: true, kind: true } },
      transitions: { select: { fromStage: true, toStage: true, at: true, note: true } },
      blocks: { select: { blockedAt: true, unblockedAt: true } },
    },
  });
  const now = new Date();
  const items = tasks.map((t) => ({ assignee: t.assignee, quality: taskQuality(t.stage, t.transitions, t.blocks, now) }));

  const byMember = new Map<string, { name: string; kind: MemberKind; items: typeof items }>();
  for (const item of items) {
    const entry = byMember.get(item.assignee.id) ?? { name: item.assignee.name, kind: item.assignee.kind, items: [] };
    entry.items.push(item);
    byMember.set(item.assignee.id, entry);
  }
  return {
    project: summarize(items.map((i) => i.quality)),
    byMember: [...byMember.entries()]
      .map(([memberId, e]) => ({ memberId, name: e.name, kind: e.kind, summary: summarize(e.items.map((i) => i.quality)) }))
      // Chỉ người / agent đã có task qua Review (có số liệu); nhiều số liệu trước.
      .filter((r) => r.summary.reviewed > 0 || r.summary.measured > 0 || r.summary.blockedTasks > 0)
      .sort((a, b) => b.summary.reviewed - a.summary.reviewed || a.name.localeCompare(b.name, "vi")),
  };
});
