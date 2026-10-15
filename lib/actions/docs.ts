"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/currentUser";

export async function approveRevision(revisionId: string, projectId: string) {
  // TODO(F15.4): kiểm tra quyền
  const approvedById = await getCurrentUserId();
  await prisma.docRevision.update({
    where: { id: revisionId },
    data: { pending: false, approvedById, approvedAt: new Date() },
  });
  revalidatePath(`/${projectId}/docs`);
}
