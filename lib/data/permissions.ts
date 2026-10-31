import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { can, type Actor, type PermissionAction } from "@/lib/auth/permissions";

export type Permissions = Record<PermissionAction, boolean>;

const ACTIONS: PermissionAction[] = [
  "project.create",
  "mcpServer.manage",
  "agent.configure",
  "org.members",
  "project.archive",
  "member.manage",
  "doc.review",
  "doc.edit",
  "feature.review",
  "feature.create",
  "feature.manage",
  "doc.create",
  "task.write",
  "task.review",
];

/** Actor của ma trận quyền (F15.4) — null nếu member không còn. */
export const getActor = cache(async (memberId: string): Promise<Actor | null> => {
  const member = await prisma.member.findUnique({ where: { id: memberId }, select: { isTechLead: true, projects: { select: { projectId: true } } } });
  return member ? { id: memberId, isTechLead: member.isTechLead, projectIds: member.projects.map((p) => p.projectId) } : null;
});

/** Quyền của `memberId` trên dự án đang mở — UI ẩn/khoá nút theo đây (F15.6). Action vẫn tự kiểm tra (F15.4). */
export const getPermissions = cache(async (memberId: string, projectId: string): Promise<Permissions> => {
  const [actor, project] = await Promise.all([
    getActor(memberId),
    prisma.project.findUnique({ where: { id: projectId }, select: { id: true, createdById: true } }),
  ]);
  return Object.fromEntries(ACTIONS.map((a) => [a, actor ? can(actor, a, project) : false])) as Permissions;
});
