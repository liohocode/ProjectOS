import { notFound } from "next/navigation";
import { getProjectById, getProjects } from "@/lib/data/projects";
import { getTasksByProject } from "@/lib/data/features";
import { getDocCountByProject, getPendingRevisionCount } from "@/lib/data/docs";
import { getPipelineAgents, getTeamByProject } from "@/lib/data/team";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getMcpServers } from "@/lib/data/mcp";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import type { ScreenId } from "@/lib/types";

export default async function ProjectLayout(props: LayoutProps<"/[project]">) {
  const { project: projectId } = await props.params;

  const [project, projects] = await Promise.all([getProjectById(projectId), getProjects()]);
  if (!project) notFound();

  const [tasks, docCount, pendingRevisions, projectTeam, pipeline, mcpServers, currentUser] =
    await Promise.all([
      getTasksByProject(projectId),
      getDocCountByProject(projectId),
      getPendingRevisionCount(projectId),
      getTeamByProject(projectId),
      getPipelineAgents(),
      getMcpServers(),
      getCurrentUser(),
    ]);

  const navCounts: Record<ScreenId, number> = {
    portfolio: projects.length,
    docs: docCount,
    work: tasks.length,
    team: projectTeam.length,
    mcp: mcpServers.length,
  };
  const navAlerts: Record<ScreenId, number> = {
    portfolio: 0,
    docs: pendingRevisions,
    work: tasks.filter((t) => t.blocked).length,
    team: 0,
    mcp: 0,
  };

  return (
    <div className="app-shell">
      <Sidebar
        project={project}
        projects={projects}
        navCounts={navCounts}
        navAlerts={navAlerts}
        pipeline={pipeline}
        mcpOnline={mcpServers.filter((s) => s.status === "online").length}
        mcpTotal={mcpServers.length}
        currentUser={currentUser}
      />
      <div className="main-area">
        <Header project={project} />
        <div className="content-area">{props.children}</div>
      </div>
    </div>
  );
}
