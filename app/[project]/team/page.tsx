import { getPipelineAgents, getTeam, getTeamByProject } from "@/lib/data/team";
import { TeamScreen } from "@/components/team/TeamScreen";

export default async function TeamPage(props: PageProps<"/[project]/team">) {
  const { project: projectId } = await props.params;

  const [pipeline, projectTeam, orgTeam] = await Promise.all([
    getPipelineAgents(),
    getTeamByProject(projectId),
    getTeam(),
  ]);

  return (
    <TeamScreen
      pipeline={pipeline}
      projectTeam={projectTeam}
      orgTeam={orgTeam}
      defaultSelectedId={projectTeam[0]?.id ?? null}
    />
  );
}
