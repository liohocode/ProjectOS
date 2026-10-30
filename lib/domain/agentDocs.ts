import { prisma } from "@/lib/prisma";
import type { DocSection } from "@/lib/types";
import { toLikePattern } from "@/lib/data/search";
import { markdownToSections } from "@/lib/markdownSections";
import { createRevision } from "./docs";

// Tool tài liệu cho agent (F16.5). Agent chỉ thấy tài liệu trong dự án mình thuộc về; KHÔNG BAO GIỜ ghi thẳng Doc —
// docs_append luôn tạo revision chờ người duyệt (F12.1 → F12.2).

export interface AgentDocView {
  id: string;
  projectId: string;
  featureId: string | null;
  title: string;
  version: string;
  status: string;
  summary: string;
  sections: DocSection[];
}

type Fail = { ok: false; reason: string; projectId: string | null };

/** Tài liệu trong dự án của agent; null nếu không có / không thuộc. */
async function findDoc(agentId: string, docId: string) {
  const doc = await prisma.doc.findUnique({
    where: { id: docId },
    select: {
      id: true,
      projectId: true,
      featureId: true,
      title: true,
      version: true,
      status: true,
      summary: true,
      sections: true,
      readBy: true,
      project: { select: { members: { where: { memberId: agentId }, select: { memberId: true } } } },
    },
  });
  return doc && doc.project.members.length > 0 ? doc : null;
}

/** Đọc tài liệu + ghi tên agent vào "Agent đã đọc" (F18.6 sẽ tính từ nhật ký). */
export async function readDocForAgent(agent: { memberId: string; name: string }, docId: string): Promise<{ ok: true; doc: AgentDocView } | Fail> {
  const doc = await findDoc(agent.memberId, docId);
  if (!doc) return { ok: false, reason: `Không tìm thấy tài liệu ${docId} trong dự án của bạn`, projectId: null };
  // Dữ liệu mẫu có thể ghi "Tất cả agent" — giữ nguyên, không thêm tên lẻ.
  if (!doc.readBy.includes(agent.name) && !doc.readBy.includes("Tất cả agent")) {
    // Dữ liệu mẫu dùng "—" cho "chưa ai đọc" → bỏ khi có người đọc đầu tiên.
    await prisma.doc.update({ where: { id: doc.id }, data: { readBy: [...doc.readBy.filter((r) => r !== "—"), agent.name] } });
  }
  return {
    ok: true,
    doc: {
      id: doc.id,
      projectId: doc.projectId,
      featureId: doc.featureId,
      title: doc.title,
      version: doc.version,
      status: doc.status,
      summary: doc.summary,
      sections: doc.sections as unknown as DocSection[],
    },
  };
}

export interface AgentDocHit {
  id: string;
  projectId: string;
  featureId: string | null;
  title: string;
  summary: string;
}

const SEARCH_LIMIT = 10;

/**
 * Tìm tài liệu theo từ khoá trong tiêu đề / tóm tắt / nội dung (không phân biệt hoa thường, dấu — `unaccent`),
 * chỉ trong dự án của agent. F18.5 sẽ nâng lên tìm ngữ nghĩa.
 */
export async function searchDocsForAgent(agentId: string, query: string, projectId?: string): Promise<AgentDocHit[]> {
  const pattern = toLikePattern(query);
  return prisma.$queryRaw<AgentDocHit[]>`
    SELECT d.id, d."projectId", d."featureId", d.title, d.summary FROM docs d
    JOIN project_members pm ON pm."projectId" = d."projectId" AND pm."memberId" = ${agentId}
    WHERE (${projectId ?? null}::text IS NULL OR d."projectId" = ${projectId ?? null})
      AND (unaccent(d.title) ILIKE unaccent(${pattern})
        OR unaccent(d.summary) ILIKE unaccent(${pattern})
        OR unaccent(d.sections::text) ILIKE unaccent(${pattern}))
    ORDER BY (unaccent(d.title) ILIKE unaccent(${pattern})) DESC, d."updatedAt" DESC
    LIMIT ${SEARCH_LIMIT}`;
}

/**
 * Đề xuất thay đổi tài liệu (FR-AG-03): luôn thành revision chờ duyệt. `content` dạng markdown
 * (`## Mục` + đoạn cách dòng trống) thay toàn bộ phần nội dung khi duyệt; `summary` thay tóm tắt. Cần ít nhất một.
 */
export async function appendDocForAgent(
  agentId: string,
  input: { docId: string; what: string; summary?: string; content?: string },
): Promise<{ ok: true; revisionId: string; projectId: string } | Fail> {
  const doc = await findDoc(agentId, input.docId);
  if (!doc) return { ok: false, reason: `Không tìm thấy tài liệu ${input.docId} trong dự án của bạn`, projectId: null };
  const summary = input.summary?.trim() || undefined;
  const sections = input.content?.trim() ? markdownToSections(input.content) : undefined;
  if (!summary && !sections) return { ok: false, reason: "Cần summary hoặc content đề xuất", projectId: doc.projectId };

  const result = await createRevision(doc.id, agentId, input.what, { summary, sections });
  if (!result.ok) return { ok: false, reason: result.error, projectId: doc.projectId };
  return { ok: true, revisionId: result.revisionId, projectId: doc.projectId };
}
