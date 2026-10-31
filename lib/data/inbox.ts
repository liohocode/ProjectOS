import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Inbox, InboxCounts, InboxTask } from "@/lib/inbox";
import { formatRelativeVi } from "@/lib/relativeTime";
import { getProposedFeatures, getProposedTasks } from "./features";
import { toDocRevision } from "./docs";

// Inbox "Cần tôi xử lý" (F25.2): mọi việc chờ người xử lý của một dự án ở một chỗ.
// Chỉ task của feature đang chạy (feature đề xuất / bị từ chối không vào list chính — F16.6).

const activeTasks = (projectId: string) => ({ feature: { projectId, status: "active" as const, archivedAt: null }, archivedAt: null });

/** Đếm cho badge sidebar — không tải danh sách. */
export const getInboxCounts = cache(async (projectId: string): Promise<InboxCounts> => {
  const [revisions, reviewTasks, featureProposals, taskProposals, blockedTasks] = await Promise.all([
    prisma.docRevision.count({ where: { status: "pending", doc: { projectId } } }),
    prisma.task.count({ where: { ...activeTasks(projectId), stage: "Review" } }),
    prisma.feature.count({ where: { projectId, status: "proposed" } }),
    prisma.taskProposal.count({ where: { status: "pending", feature: { projectId, status: "active", archivedAt: null } } }),
    prisma.task.count({ where: { ...activeTasks(projectId), blocked: { not: null } } }),
  ]);
  return { revisions, reviewTasks, proposals: featureProposals + taskProposals, blockedTasks };
});

export const getInbox = cache(async (projectId: string): Promise<Inbox> => {
  const [revisionRows, reviewRows, proposals, taskProposals, blockedRows] = await Promise.all([
    prisma.docRevision.findMany({
      where: { status: "pending", doc: { projectId } },
      include: { author: true, approvedBy: true, doc: { select: { id: true, title: true, sections: true, summary: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.task.findMany({
      where: { ...activeTasks(projectId), stage: "Review" },
      include: {
        assignee: { select: { name: true, kind: true } },
        feature: { select: { name: true } },
        transitions: { where: { toStage: "Review" }, orderBy: { at: "desc" }, take: 1, select: { at: true } },
      },
      orderBy: { id: "asc" },
    }),
    getProposedFeatures(projectId),
    getProposedTasks(projectId),
    prisma.task.findMany({
      where: { ...activeTasks(projectId), blocked: { not: null } },
      include: { assignee: { select: { name: true, kind: true } }, feature: { select: { name: true } } },
      orderBy: { id: "asc" },
    }),
  ]);

  const toTask = (t: (typeof blockedRows)[number]): InboxTask => ({
    id: t.id,
    title: t.title,
    featureId: t.featureId,
    featureName: t.feature.name,
    who: t.assignee.name,
    kind: t.assignee.kind,
  });

  return {
    // Cũ trước: việc chờ lâu nhất lên đầu.
    revisions: revisionRows.map((rev) => ({ ...toDocRevision(rev, rev.doc), docId: rev.doc.id, docTitle: rev.doc.title })),
    reviewTasks: reviewRows.map((t) => ({ ...toTask(t), ...(t.transitions[0] && { since: formatRelativeVi(t.transitions[0].at) }) })),
    proposals,
    taskProposals,
    blockedTasks: blockedRows.map((t) => ({ ...toTask(t), blocked: t.blocked ?? undefined })),
  };
});
