import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { DocSection } from "@/lib/types";
import { fail, type ActionResult } from "@/lib/actions/result";

// Nghiệp vụ tài liệu dùng chung giữa server action (người, F12) và MCP `docs.append` (agent, F16.5).
// Không có "use server": client không gọi thẳng được; nơi gọi tự kiểm tra danh tính/quyền.

/** Shape của Doc.sections / DocRevision.proposedSections: [{ heading, paras[] }]. */
export const docSectionsSchema = z
  .array(
    z.object({
      heading: z.string().trim().min(1, "Mục cần tiêu đề").max(200, "Tiêu đề mục tối đa 200 ký tự"),
      paras: z.array(z.string().trim().min(1, "Đoạn văn trống").max(5000, "Đoạn văn tối đa 5000 ký tự")),
    }),
  )
  .min(1, "Tài liệu cần ít nhất một mục")
  .max(100, "Tối đa 100 mục");

const revisionSchema = z.object({
  docId: z.string().trim().min(1, "Thiếu tài liệu"),
  authorId: z.string().trim().min(1, "Thiếu người đề xuất"),
  what: z.string().trim().min(1, "Mô tả ngắn thay đổi").max(300, "Mô tả tối đa 300 ký tự"),
  proposed: z
    .object({
      summary: z.string().trim().min(1, "Tóm tắt trống").max(2000, "Tóm tắt tối đa 2000 ký tự").optional(),
      sections: docSectionsSchema.optional(),
    })
    .refine((p) => p.summary !== undefined || p.sections !== undefined, "Revision cần nội dung đề xuất (tóm tắt hoặc các mục)"),
});

export interface ProposedContent {
  summary?: string;
  sections?: DocSection[];
}

/**
 * Tạo revision chờ duyệt (F12.1). `baseVersion` = version hiện tại của tài liệu — F12.2 dùng để
 * từ chối duyệt nếu tài liệu đã đổi từ khi revision được tạo. Phần không đề xuất (null) giữ nguyên khi duyệt.
 */
export async function createRevision(
  docId: string,
  authorId: string,
  what: string,
  proposed: ProposedContent,
): Promise<ActionResult<{ revisionId: string }>> {
  const input = revisionSchema.safeParse({ docId, authorId, what, proposed });
  if (!input.success) return fail(input.error.issues[0].message);
  const data = input.data;

  const [doc, author] = await Promise.all([
    prisma.doc.findUnique({ where: { id: data.docId }, select: { version: true } }),
    prisma.member.findUnique({ where: { id: data.authorId }, select: { id: true } }),
  ]);
  if (!doc) return fail(`Không tìm thấy tài liệu ${data.docId}`);
  if (!author) return fail("Không tìm thấy người đề xuất");

  const revision = await prisma.docRevision.create({
    data: {
      docId: data.docId,
      authorId: data.authorId,
      what: data.what,
      status: "pending",
      baseVersion: doc.version,
      proposedSummary: data.proposed.summary ?? null,
      proposedSections: data.proposed.sections,
    },
    select: { id: true },
  });
  return { ok: true, revisionId: revision.id };
}
