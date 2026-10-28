import { cache } from "react";
import type { DocBody, DocGroup, DocSection } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { formatRelativeVi } from "@/lib/relativeTime";
import { diffSections } from "@/lib/diffSections";

const GENERAL_GROUP_NAME = "Kho tri thức chung";

export const getDocGroupsByProject = cache(async (projectId: string): Promise<DocGroup[]> => {
  const features = await prisma.feature.findMany({
    where: { projectId },
    include: { docs: { orderBy: { id: "asc" } } },
    orderBy: { id: "asc" },
  });

  const groups: DocGroup[] = features
    .filter((f) => f.docs.length > 0)
    .map((f) => ({
      name: `${f.id} ${f.name}`,
      icon: "ph-cube",
      items: f.docs.map((d) => ({ id: d.id, title: d.title, agent: d.agentWritten })),
    }));

  const generalDocs = await prisma.doc.findMany({
    where: { projectId, featureId: null },
    orderBy: { id: "asc" },
  });
  if (generalDocs.length > 0) {
    groups.push({
      name: GENERAL_GROUP_NAME,
      icon: "ph-brain",
      items: generalDocs.map((d) => ({ id: d.id, title: d.title, agent: d.agentWritten })),
    });
  }

  return groups;
});

export const getFirstDocId = cache(async (projectId: string): Promise<string | null> => {
  const groups = await getDocGroupsByProject(projectId);
  return groups[0]?.items[0]?.id ?? null;
});

export const getDocCountByProject = cache(async (projectId: string): Promise<number> => {
  return prisma.doc.count({ where: { projectId } });
});

export const getPendingRevisionCount = cache(async (projectId: string): Promise<number> => {
  return prisma.docRevision.count({ where: { status: "pending", doc: { projectId } } });
});

/** Id các tài liệu đang có revision chờ duyệt — lọc `?pending=1` ở màn docs (F14.3). */
export const getDocIdsWithPendingRevision = cache(async (projectId: string): Promise<string[]> => {
  const rows = await prisma.docRevision.findMany({
    where: { status: "pending", doc: { projectId } },
    select: { docId: true },
    distinct: ["docId"],
  });
  return rows.map((r) => r.docId);
});

export async function getPendingRevisionsByProject(
  projectId: string,
): Promise<{ docTitle: string; who: string; agent: boolean; what: string; when: string }[]> {
  const rows = await prisma.docRevision.findMany({
    where: { status: "pending", doc: { projectId } },
    include: { doc: true, author: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    docTitle: row.doc.title,
    who: row.author.name,
    agent: row.author.kind === "agent",
    what: row.what,
    when: formatRelativeVi(row.createdAt),
  }));
}

export interface KnowledgeStripStats {
  totalDocs: number;
  indexedDocs: number;
  chunks: number;
  pendingRevisions: number;
  agentWritten: number;
  lastIndexedAgo: string;
  embeddingModel: string;
}

export const getKnowledgeStripStats = cache(async (projectId: string): Promise<KnowledgeStripStats> => {
  const [totalDocs, indexedDocs, agentWritten, pendingRevisions, chunkAgg, lastIndexed] = await Promise.all([
    prisma.doc.count({ where: { projectId } }),
    prisma.doc.count({ where: { projectId, indexedAt: { not: null } } }),
    prisma.doc.count({ where: { projectId, agentWritten: true } }),
    getPendingRevisionCount(projectId),
    prisma.doc.aggregate({ where: { projectId }, _sum: { chunkCount: true } }),
    prisma.doc.findFirst({ where: { projectId, indexedAt: { not: null } }, orderBy: { indexedAt: "desc" } }),
  ]);

  return {
    totalDocs,
    indexedDocs,
    chunks: chunkAgg._sum.chunkCount ?? 0,
    pendingRevisions,
    agentWritten,
    lastIndexedAgo: lastIndexed?.indexedAt ? formatRelativeVi(lastIndexed.indexedAt) : "Chưa index",
    embeddingModel: "text-embedding-3-large",
  };
});

export const getDocBody = cache(async (id: string): Promise<DocBody> => {
  const row = await prisma.doc.findUnique({
    where: { id },
    include: {
      author: true,
      feature: true,
      revisions: { include: { author: true, approvedBy: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!row) {
    return {
      title: "Tài liệu",
      version: "v1.0",
      status: "Bản nháp",
      updated: "tuần trước",
      author: "Hiếu",
      feature: "Chưa gắn feature",
      indexed: "Chưa index",
      readBy: "—",
      summary: "Tài liệu này chưa có nội dung chi tiết.",
      sections: [{ heading: "Nội dung", paras: ["Phần thân tài liệu sẽ hiển thị ở đây."] }],
      history: [{ id: "n-a", who: "Hiếu", agent: false, what: "Tạo tài liệu", when: "tuần trước", status: "approved" }],
    };
  }

  return {
    title: row.title,
    version: row.version,
    status: row.status,
    updated: formatRelativeVi(row.updatedAt),
    author: row.author.kind === "agent" ? `${row.author.name} (AI agent)` : row.author.name,
    feature: row.feature ? `${row.feature.id} · ${row.feature.name}` : GENERAL_GROUP_NAME,
    indexed: row.indexedAt ? `Đã index · ${formatRelativeVi(row.indexedAt)} · ${row.chunkCount ?? 0} chunk` : "Chưa index",
    readBy: row.readBy.length > 0 ? row.readBy.join(", ") : "—",
    summary: row.summary,
    sections: row.sections as unknown as DocSection[],
    history: row.revisions.map((rev) => ({
      id: rev.id,
      who: rev.author.name,
      agent: rev.author.kind === "agent",
      what: rev.what,
      when: formatRelativeVi(rev.createdAt),
      status: rev.status,
      // F12.3 — "Xem thay đổi": so với bản hiện tại, chỉ cho revision đang chờ có nội dung đề xuất.
      ...(rev.status === "pending" &&
        rev.proposedSections !== null && { diff: diffSections(row.sections as unknown as DocSection[], rev.proposedSections as unknown as DocSection[]) }),
      ...(rev.status === "pending" &&
        rev.proposedSummary !== null &&
        rev.proposedSummary !== row.summary && { summaryChange: { from: row.summary, to: rev.proposedSummary } }),
      ...(rev.rejectedReason && { rejectedReason: rev.rejectedReason }),
      // F12.4 — "Đã duyệt bởi … · …" (revision duyệt trước F12.2 / seed không có người duyệt).
      ...(rev.approvedBy && { approvedBy: rev.approvedBy.name }),
      ...(rev.approvedAt && { approvedWhen: formatRelativeVi(rev.approvedAt) }),
    })),
  };
});
