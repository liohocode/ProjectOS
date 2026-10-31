import { cache } from "react";
import type { Project, SprintOption } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { formatSprintLabel } from "@/lib/sprint";

type ProjectRow = Awaited<ReturnType<typeof prisma.project.findFirstOrThrow<{ include: { currentSprint: true } }>>>;

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    status: row.status,
    desc: row.desc,
    sprint: row.currentSprint ? formatSprintLabel(row.currentSprint) : "Chưa có sprint",
    currentSprintId: row.currentSprintId,
    archived: row.archivedAt !== null,
  };
}

export const getProjects = cache(async (): Promise<Project[]> => {
  const rows = await prisma.project.findMany({ include: { currentSprint: true }, orderBy: { id: "asc" } });
  return rows.map(toProject);
});

export const getProjectById = cache(async (id: string): Promise<Project | undefined> => {
  const row = await prisma.project.findUnique({ where: { id }, include: { currentSprint: true } });
  return row ? toProject(row) : undefined;
});

/** Dự án mà thành viên được phân bổ (ProjectMember) — để chặn truy cập dự án khác và lọc project switcher. */
export const getProjectsByMember = cache(async (memberId: string): Promise<Project[]> => {
  const rows = await prisma.project.findMany({
    where: { members: { some: { memberId } } },
    include: { currentSprint: true },
    orderBy: { id: "asc" },
  });
  return rows.map(toProject);
});

/** Sprint của dự án, mới trước (F21.3). */
export const getSprintsByProject = cache(async (projectId: string): Promise<SprintOption[]> => {
  const [rows, project] = await Promise.all([
    prisma.sprint.findMany({ where: { projectId }, orderBy: [{ startDate: "desc" }, { id: "asc" }] }),
    prisma.project.findUnique({ where: { id: projectId }, select: { currentSprintId: true } }),
  ]);
  return rows.map((s) => ({ id: s.id, name: s.name, label: formatSprintLabel(s), current: s.id === project?.currentSprintId }));
});
