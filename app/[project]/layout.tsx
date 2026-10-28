import { notFound } from "next/navigation";
import { getProjectById, getProjects } from "@/lib/data/projects";
import { getTaskCountsByProject } from "@/lib/data/features";
import { getDocCountByProject, getPendingRevisionCount } from "@/lib/data/docs";
import { getMemberCountByProject, getPipelineAgents } from "@/lib/data/team";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getMcpServers } from "@/lib/data/mcp";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import type { ScreenId } from "@/lib/types";

export default async function ProjectLayout(props: LayoutProps<"/[project]">) {
  const { project: projectId } = await props.params;

  const [project, projects] = await Promise.all([getProjectById(projectId), getProjects()]);
  if (!project) notFound();

  // Badge chỉ cần số → hàm đếm, không tải danh sách task/thành viên (page cần thì tự tải).
  const [taskCounts, docCount, pendingRevisions, memberCount, pipeline, mcpServers, currentUser] =
    await Promise.all([
      getTaskCountsByProject(projectId),
      getDocCountByProject(projectId),
      getPendingRevisionCount(projectId),
      getMemberCountByProject(projectId),
      getPipelineAgents(),
      getMcpServers(),
      getCurrentUser(),
    ]);

  const navCounts: Record<ScreenId, number> = {
    portfolio: projects.length,
    docs: docCount,
    work: taskCounts.total,
    team: memberCount,
    mcp: mcpServers.length,
  };
  const navAlerts: Record<ScreenId, number> = {
    portfolio: 0,
    docs: pendingRevisions,
    work: taskCounts.blocked,
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
