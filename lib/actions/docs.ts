"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/currentUser";
import { applyRevision, createDoc as createDocDomain, rejectRevision as rejectRevisionDomain } from "@/lib/domain/docs";
import { markdownToSections } from "@/lib/markdownSections";
import { fail, ok, type ActionResult } from "./result";

const approveSchema = z.object({
  revisionId: z.string().trim().min(1, "Thiếu mã revision"),
  projectId: z.string().trim().min(1, "Thiếu dự án"),
});

/** Duyệt revision đang chờ — chỉ revision thuộc tài liệu của `projectId` (projectId do client gửi); áp nội dung vào bản chính (F12.2). */
export async function approveRevision(revisionId: string, projectId: string): Promise<ActionResult> {
  // TODO(F15.4): kiểm tra quyền
  const input = approveSchema.safeParse({ revisionId, projectId });
  if (!input.success) return fail(input.error.issues[0].message);
  const { revisionId: id, projectId: project } = input.data;

  const revision = await prisma.docRevision.findUnique({ where: { id }, select: { doc: { select: { projectId: true } } } });
  if (!revision || revision.doc.projectId !== project) return fail("Không tìm thấy revision trong dự án này");

  // Áp nội dung đề xuất + tăng version trong transaction (F12.2, lib/domain/docs.ts).
  const result = await applyRevision(id, await getCurrentUserId());
  if (!result.ok) return result;

  // Badge "Docs" ở sidebar (layout) đếm revision chờ → revalidate cả layout của dự án.
  revalidatePath(`/${project}`, "layout");
  return ok();
}

/** Từ chối revision đang chờ kèm lý do (F12.3) — chỉ revision thuộc tài liệu của `projectId`. */
export async function rejectRevision(revisionId: string, projectId: string, reason: string): Promise<ActionResult> {
  // TODO(F15.4): kiểm tra quyền
  const input = approveSchema.safeParse({ revisionId, projectId });
  if (!input.success) return fail(input.error.issues[0].message);
  const { revisionId: id, projectId: project } = input.data;

  const revision = await prisma.docRevision.findUnique({ where: { id }, select: { doc: { select: { projectId: true } } } });
  if (!revision || revision.doc.projectId !== project) return fail("Không tìm thấy revision trong dự án này");

  const result = await rejectRevisionDomain(id, reason);
  if (!result.ok) return result;
  // Badge "Docs" ở sidebar (layout) đếm revision chờ → revalidate cả layout của dự án.
  revalidatePath(`/${project}`, "layout");
  return ok();
}

export interface NewDocFormInput {
  projectId: string;
  /** "" = Kho tri thức chung */
  featureId: string;
  title: string;
  summary: string;
  /** Markdown: `## Tiêu đề mục`, đoạn cách nhau bằng dòng trống */
  content: string;
}

/** Tạo tài liệu mới (F12.5) — người đang đăng nhập là tác giả. */
export async function createDoc(input: NewDocFormInput): Promise<ActionResult<{ docId: string }>> {
  // TODO(F15.4): kiểm tra quyền
  const result = await createDocDomain(await getCurrentUserId(), {
    projectId: input.projectId,
    featureId: input.featureId?.trim() ? input.featureId : null,
    title: input.title,
    summary: input.summary,
    sections: markdownToSections(String(input.content ?? "")),
  });
  // Cây tài liệu + badge "Docs" (đếm số tài liệu) ở layout.
  if (result.ok) revalidatePath(`/${input.projectId}`, "layout");
  return result;
}
