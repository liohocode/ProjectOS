import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/currentUser";
import type { ActivityTone, ActivityType } from "@/lib/generated/prisma/enums";

// Ghi một dòng "Hoạt động gần đây" (panel màn team) cho người đang thao tác, và — khi thao tác thuộc một dự án —
// một sự kiện ở activity rail của dự án đó (F17.1, bảng ActivityEvent).
// Điểm duy nhất ghi hoạt động từ action. File không có "use server": helper nội bộ, client không gọi trực tiếp được.

export interface ActivityEventInput {
  projectId: string;
  type: ActivityType;
  tone: ActivityTone;
  /** Chữ ở activity rail — mặc định dùng chung chữ của "Hoạt động gần đây" */
  text?: string;
  taskId?: string;
  docId?: string;
  featureId?: string;
}

export async function recordActivity(
  icon: string,
  text: string,
  opts: { memberId?: string; event?: ActivityEventInput } = {},
): Promise<void> {
  const memberId = opts.memberId ?? (await getCurrentUserId());
  await prisma.memberActivity.create({ data: { memberId, icon, text } });
  if (opts.event) {
    const { text: railText, ...event } = opts.event;
    await prisma.activityEvent.create({ data: { ...event, actorId: memberId, text: railText ?? text, tool: null } });
  }
}
