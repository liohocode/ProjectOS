"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/currentUser";
import { fail, ok, type ActionResult } from "./result";

const approveSchema = z.object({
  revisionId: z.string().trim().min(1, "Thiếu mã revision"),
  projectId: z.string().trim().min(1, "Thiếu dự án"),
});

/** Duyệt revision đang chờ — chỉ revision thuộc tài liệu của `projectId` (projectId do client gửi). */
export async function approveRevision(revisionId: string, projectId: string): Promise<ActionResult> {
  // TODO(F15.4): kiểm tra quyền
  const input = approveSchema.safeParse({ revisionId, projectId });
  if (!input.success) return fail(input.error.issues[0].message);
  const { revisionId: id, projectId: project } = input.data;

  const revision = await prisma.docRevision.findUnique({ where: { id }, select: { doc: { select: { projectId: true } } } });
  if (!revision || revision.doc.projectId !== project) return fail("Không tìm thấy revision trong dự án này");

  // Điều kiện pending=true nằm trong câu UPDATE → hai lần duyệt cùng lúc chỉ một lần ghi.
  const { count } = await prisma.docRevision.updateMany({
    where: { id, pending: true },
    data: { pending: false, approvedById: await getCurrentUserId(), approvedAt: new Date() },
  });
  if (count === 0) return fail("Revision này đã được duyệt");

  revalidatePath(`/${project}/docs`);
  return ok();
}
