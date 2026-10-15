import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/currentUser";

// Ghi một dòng "Hoạt động gần đây" (panel màn team) cho người đang thao tác.
// Điểm duy nhất ghi hoạt động từ action — F17 sẽ thay bằng bảng sự kiện đầy đủ, chỉ cần sửa ở đây.
// File không có "use server": helper nội bộ cho các action, client không gọi trực tiếp được.
export async function recordActivity(icon: string, text: string, memberId?: string): Promise<void> {
  await prisma.memberActivity.create({
    data: { memberId: memberId ?? (await getCurrentUserId()), icon, text },
  });
}
