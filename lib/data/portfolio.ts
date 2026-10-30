import { cache } from "react";
import type { Member, Project } from "@/lib/types";
import { getProjects } from "./projects";
import { getFeaturesByProject } from "./features";
import { getTeamByProject } from "./team";

export interface ProjectSummary extends Project {
  featureCount: number;
  taskCount: number;
  agentCount: number;
  humanCount: number;
  avgPct: number;
  blockedCount: number;
  avatars: Member[];
}

export const getPortfolioSummaries = cache(async (): Promise<ProjectSummary[]> => {
  // Dự án lưu trữ (F13.7) xếp cuối.
  const projects = [...(await getProjects())].sort((a, b) => Number(a.archived) - Number(b.archived));
  return Promise.all(
    projects.map(async (project) => {
      const [features, team] = await Promise.all([getFeaturesByProject(project.id), getTeamByProject(project.id)]);
      const tasks = features.flatMap((f) => f.tasks);
      return {
        ...project,
        featureCount: features.length,
        taskCount: tasks.length,
        agentCount: team.filter((m) => m.kind === "agent").length,
        humanCount: team.filter((m) => m.kind === "human").length,
        avgPct: features.length ? Math.round(features.reduce((sum, f) => sum + f.pct, 0) / features.length) : 0,
        blockedCount: tasks.filter((t) => t.blocked).length,
        avatars: team.slice(0, 6),
      };
    }),
  );
});
