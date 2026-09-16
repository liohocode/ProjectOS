import type { Project } from "@/lib/types";
import { prisma } from "@/lib/prisma";

export async function getProjects(): Promise<Project[]> {
  return prisma.project.findMany({ orderBy: { id: "asc" } });
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  const project = await prisma.project.findUnique({ where: { id } });
  return project ?? undefined;
}
