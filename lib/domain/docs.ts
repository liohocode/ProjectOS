import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { DocSection } from "@/lib/types";
import { fail, type ActionResult } from "@/lib/actions/result";
import { bumpMinorVersion } from "@/lib/docVersion";
import { slugify } from "@/lib/slug";

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

/** Lỗi nghiệp vụ trong transaction → rollback và trả `fail(message)`. */
class RevisionConflict extends Error {}

/**
 * Duyệt revision (F12.2): trong một transaction — đánh dấu approved, áp nội dung đề xuất vào tài liệu,
 * tăng version phụ, `updatedAt = now`. Từ chối nếu tài liệu đã đổi version từ khi revision được tạo
 * (`baseVersion` khác) hoặc revision không còn chờ. Ghi tài liệu có điều kiện `version = baseVersion`
 * → hai revision của cùng tài liệu duyệt đồng thời: cái sau bị từ chối, không ghi đè.
 * Revision cũ không có nội dung đề xuất: chỉ đánh dấu approved, tài liệu giữ nguyên.
 */
export async function applyRevision(revisionId: string, approverId: string): Promise<ActionResult<{ version: string | null }>> {
  try {
    const version = await prisma.$transaction(async (tx) => {
      const rev = await tx.docRevision.findUnique({ where: { id: revisionId }, include: { doc: { select: { version: true } } } });
      if (!rev) throw new RevisionConflict("Không tìm thấy revision");
      if (rev.status !== "pending") throw new RevisionConflict("Revision này không còn chờ duyệt");

      const hasContent = rev.proposedSummary !== null || rev.proposedSections !== null;
      if (hasContent && rev.baseVersion !== rev.doc.version) {
        throw new RevisionConflict("Tài liệu đã thay đổi từ khi revision được tạo");
      }

      const marked = await tx.docRevision.updateMany({
        where: { id: revisionId, status: "pending" },
        data: { status: "approved", approvedById: approverId, approvedAt: new Date() },
      });
      if (marked.count === 0) throw new RevisionConflict("Revision này không còn chờ duyệt");
      if (!hasContent) return null;

      const nextVersion = bumpMinorVersion(rev.baseVersion);
      const written = await tx.doc.updateMany({
        where: { id: rev.docId, version: rev.baseVersion },
        data: {
          ...(rev.proposedSummary !== null && { summary: rev.proposedSummary }),
          ...(rev.proposedSections !== null && { sections: rev.proposedSections as object }),
          version: nextVersion,
          updatedAt: new Date(),
        },
      });
      if (written.count === 0) throw new RevisionConflict("Tài liệu đã thay đổi từ khi revision được tạo");
      return nextVersion;
    });
    return { ok: true, version };
  } catch (error) {
    if (error instanceof RevisionConflict) return fail(error.message);
    throw error;
  }
}

/**
 * Từ chối revision đang chờ (F12.3) kèm lý do — tài liệu giữ nguyên. Điều kiện `status = pending`
 * nằm trong câu UPDATE → không từ chối được revision vừa được duyệt bởi người khác.
 */
export async function rejectRevision(revisionId: string, reason: string): Promise<ActionResult> {
  const parsed = z.string().trim().min(1, "Nhập lý do từ chối").max(500, "Lý do tối đa 500 ký tự").safeParse(reason);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { count } = await prisma.docRevision.updateMany({
    where: { id: revisionId, status: "pending" },
    data: { status: "rejected", rejectedReason: parsed.data },
  });
  return count === 0 ? fail("Revision này không còn chờ duyệt") : { ok: true };
}

const newDocSchema = z.object({
  projectId: z.string().trim().min(1, "Thiếu dự án"),
  /** null = "Kho tri thức chung" */
  featureId: z.string().trim().min(1).nullable(),
  title: z.string().trim().min(1, "Nhập tiêu đề").max(200, "Tiêu đề tối đa 200 ký tự"),
  summary: z.string().trim().min(1, "Nhập tóm tắt").max(2000, "Tóm tắt tối đa 2000 ký tự"),
  sections: docSectionsSchema,
});

export type NewDocInput = z.input<typeof newDocSchema>;

/** Id trống đầu tiên trong `slug`, `slug-2`, `slug-3`… (id Doc là khoá toàn cục, không theo dự án). */
async function freeDocId(slug: string): Promise<string> {
  const taken = new Set(
    (await prisma.doc.findMany({ where: { id: { startsWith: slug } }, select: { id: true } })).map((d) => d.id),
  );
  if (!taken.has(slug)) return slug;
  let n = 2;
  while (taken.has(`${slug}-${n}`)) n++;
  return `${slug}-${n}`;
}

const isUniqueViolation = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: unknown }).code === "P2002";

/**
 * Tạo tài liệu mới do người viết (F12.5): id slug từ tiêu đề, version v1.0, "Bản nháp", kèm dòng lịch sử
 * "Tạo tài liệu" (đã duyệt bởi chính tác giả). Hai người tạo trùng tiêu đề cùng lúc → thử id kế tiếp.
 */
export async function createDoc(authorId: string, input: NewDocInput): Promise<ActionResult<{ docId: string }>> {
  const parsed = newDocSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const data = parsed.data;

  if (data.featureId) {
    const feature = await prisma.feature.findUnique({ where: { id: data.featureId }, select: { projectId: true } });
    if (!feature || feature.projectId !== data.projectId) return fail("Feature không thuộc dự án này");
  } else if (!(await prisma.project.findUnique({ where: { id: data.projectId }, select: { id: true } }))) {
    return fail("Không tìm thấy dự án");
  }

  const slug = slugify(data.title);
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = await freeDocId(slug);
    const now = new Date();
    try {
      await prisma.doc.create({
        data: {
          id,
          projectId: data.projectId,
          featureId: data.featureId,
          title: data.title,
          agentWritten: false,
          version: "v1.0",
          status: "Bản nháp",
          summary: data.summary,
          updatedAt: now,
          authorId,
          readBy: [],
          sections: data.sections,
          revisions: {
            create: { authorId, what: "Tạo tài liệu", createdAt: now, status: "approved", baseVersion: "v1.0", approvedById: authorId, approvedAt: now },
          },
        },
      });
      return { ok: true, docId: id };
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
    }
  }
  return fail("Không tạo được id tài liệu, thử lại");
}
