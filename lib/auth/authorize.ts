import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "./currentUser";
import { can, deniedMessage, isOrgAction, type PermissionAction } from "./permissions";

// Kiểm tra quyền ở đầu server action (F15.4). Không có "use server": helper nội bộ, client không gọi được.

/**
 * Người đang đăng nhập có được làm `action` (trên `projectId` nếu là hành động gắn dự án) không.
 * Trả `null` = được; chuỗi = thông báo lỗi cho `fail()`. Không thuộc dự án → "Không tìm thấy dự án"
 * (giống layout F15.3: không lộ dự án có tồn tại hay không).
 */
export async function authorize(action: PermissionAction, projectId?: string): Promise<string | null> {
  const userId = await getCurrentUserId();
  const [member, project] = await Promise.all([
    prisma.member.findUnique({ where: { id: userId }, select: { isTechLead: true, projects: { select: { projectId: true } } } }),
    projectId && !isOrgAction(action) ? prisma.project.findUnique({ where: { id: projectId }, select: { id: true, createdById: true } }) : null,
  ]);
  if (!member) return deniedMessage(action);
  const actor = { id: userId, isTechLead: member.isTechLead, projectIds: member.projects.map((p) => p.projectId) };
  if (!isOrgAction(action) && (!project || !actor.projectIds.includes(project.id))) return "Không tìm thấy dự án";
  return can(actor, action, project) ? null : deniedMessage(action);
}
