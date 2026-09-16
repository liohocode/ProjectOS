"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// Chưa có auth thật — người duyệt hardcode là Trung Hiếu (tech lead), khớp
// với currentUser hardcode ở Sidebar (xem components/layout/Sidebar.tsx).
const CURRENT_USER_ID = "hieu";

export async function approveRevision(revisionId: string, projectId: string) {
  await prisma.docRevision.update({
    where: { id: revisionId },
    data: { pending: false, approvedById: CURRENT_USER_ID, approvedAt: new Date() },
  });
  revalidatePath(`/${projectId}/docs`);
}
