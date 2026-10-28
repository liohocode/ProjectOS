import { cache } from "react";
import type { Project } from "@/lib/types";
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
