import { getPipelineAgents, getTeam, getTeamByProject } from "@/lib/data/team";
import { getFeaturesByProject } from "@/lib/data/features";
import { getMcpServers } from "@/lib/data/mcp";
import { TeamScreen } from "@/components/team/TeamScreen";
import { AddMemberDialog } from "@/components/team/AddMemberDialog";

export default async function TeamPage(props: PageProps<"/[project]/team">) {
  const { project: projectId } = await props.params;
  const { new: newParam } = await props.searchParams;

  const [pipeline, projectTeam, orgTeam, features, servers] = await Promise.all([
    getPipelineAgents(),
    getTeamByProject(projectId),
    getTeam(),
    getFeaturesByProject(projectId),
    getMcpServers(),
  ]);
  // "Giao task" ở panel thành viên (F13.3): task chưa Done của dự án.
  const assignable = features
    .map((f) => ({
      id: f.id,
      name: f.name,
      tasks: f.tasks.filter((t) => t.stage !== "Done").map(({ id, title, stage, assigneeId, who }) => ({ id, title, stage, assigneeId, who })),
    }))
    .filter((f) => f.tasks.length > 0);

  const inProject = new Set(projectTeam.map((m) => m.id));
  const candidates = orgTeam.filter((m) => !inProject.has(m.id)).map(({ id, name, kind }) => ({ id, name, kind }));

  return (
    <>
      <TeamScreen
        pipeline={pipeline}
        projectTeam={projectTeam}
        orgTeam={orgTeam}
        defaultSelectedId={projectTeam[0]?.id ?? null}
        assignable={assignable}
        mcpServers={servers.map((s) => s.id)}
      />
      {/* "Thêm thành viên" ở header đặt ?new=1 (ADR-018) */}
      {newParam === "1" && <AddMemberDialog projectId={projectId} candidates={candidates} />}
    </>
  );
}
