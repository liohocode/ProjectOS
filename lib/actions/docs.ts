"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/currentUser";
import { applyRevision } from "@/lib/domain/docs";
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

  revalidatePath(`/${project}/docs`);
  return ok();
}
