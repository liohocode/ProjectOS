import { getFeaturesByProject } from "@/lib/data/features";
import { getTimelineByProject } from "@/lib/data/timeline";
import { getActivityFeed } from "@/lib/data/activity";
import { getTaskDrawerInfo } from "@/lib/data/taskDrawer";
import { getTeamByProject } from "@/lib/data/team";
import { WorkScreen } from "@/components/work/WorkScreen";
import { NewTaskDialog } from "@/components/work/NewTaskDialog";

export default async function WorkPage(props: PageProps<"/[project]/work">) {
  const { project: projectId } = await props.params;
  const { new: newParam } = await props.searchParams;

  const [features, timeline, activity, projectTeam] = await Promise.all([
    getFeaturesByProject(projectId),
    getTimelineByProject(projectId),
    getActivityFeed(projectId),
    getTeamByProject(projectId),
  ]);
  const projectAgents = projectTeam.filter((m) => m.kind === "agent");

  const taskIds = features.flatMap((f) => f.tasks.map((t) => t.id));
  const drawerEntries = await Promise.all(
    taskIds.map(async (id) => [id, await getTaskDrawerInfo(projectId, id)] as const),
  );
  const taskDrawerInfo = Object.fromEntries(
    drawerEntries.filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => entry[1] !== null),
  );

  return (
    <>
      <WorkScreen
        features={features}
        timeline={timeline}
        activity={activity}
        taskDrawerInfo={taskDrawerInfo}
        projectAgents={projectAgents}
      />
      {/* "Task mới" ở header đặt ?new=1 (ADR-018) */}
      {newParam === "1" && (
        <NewTaskDialog projectId={projectId} features={features.map(({ id, name }) => ({ id, name }))} members={projectTeam} />
      )}
    </>
  );
}
