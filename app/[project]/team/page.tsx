import { getPipelineAgents, getTeam, getTeamByProject } from "@/lib/data/team";
import { TeamScreen } from "@/components/team/TeamScreen";
import { AddMemberDialog } from "@/components/team/AddMemberDialog";

export default async function TeamPage(props: PageProps<"/[project]/team">) {
  const { project: projectId } = await props.params;
  const { new: newParam } = await props.searchParams;

  const [pipeline, projectTeam, orgTeam] = await Promise.all([
    getPipelineAgents(),
    getTeamByProject(projectId),
    getTeam(),
  ]);

  const inProject = new Set(projectTeam.map((m) => m.id));
  const candidates = orgTeam.filter((m) => !inProject.has(m.id)).map(({ id, name, kind }) => ({ id, name, kind }));

  return (
    <>
      <TeamScreen
        pipeline={pipeline}
        projectTeam={projectTeam}
        orgTeam={orgTeam}
        defaultSelectedId={projectTeam[0]?.id ?? null}
      />
      {/* "Thêm thành viên" ở header đặt ?new=1 (ADR-018) */}
      {newParam === "1" && <AddMemberDialog projectId={projectId} candidates={candidates} />}
    </>
  );
}
