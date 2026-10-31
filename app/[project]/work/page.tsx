import { getFeaturesByProject, getProposedFeatures } from "@/lib/data/features";
import { getTimelineByProject } from "@/lib/data/timeline";
import { getActivityFeed } from "@/lib/data/activity";
import { getTaskDrawerInfo } from "@/lib/data/taskDrawer";
import { getTeamByProject } from "@/lib/data/team";
import { WorkScreen } from "@/components/work/WorkScreen";
import { NewTaskDialog } from "@/components/work/NewTaskDialog";
import { NewFeatureDialog } from "@/components/work/NewFeatureDialog";
import { NEW_FEATURE_PARAM, SPRINTS_PARAM } from "@/components/work/featureDialogParam";
import { SprintDialog } from "@/components/work/SprintDialog";
import { getProjectById, getSprintsByProject } from "@/lib/data/projects";
import { filterFeatures, parseWorkFilter } from "@/lib/filters";

export default async function WorkPage(props: PageProps<"/[project]/work">) {
  const { project: projectId } = await props.params;
  const searchParams = await props.searchParams;
  const { new: newParam } = searchParams;
  const filter = parseWorkFilter(searchParams);

  const [features, timeline, activity, projectTeam, proposals, sprints, project] = await Promise.all([
    getFeaturesByProject(projectId),
    getTimelineByProject(projectId),
    getActivityFeed(projectId),
    getTeamByProject(projectId),
    getProposedFeatures(projectId),
    getSprintsByProject(projectId),
    getProjectById(projectId),
  ]);
  const projectAgents = projectTeam.filter((m) => m.kind === "agent");
  const memberOptions = projectTeam.map(({ id, name, kind }) => ({ id, name, kind }));

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
        features={filterFeatures(features, filter, project?.currentSprintId ?? null)}
        filtered={Object.values(filter).some((v) => v !== undefined)}
        timeline={timeline}
        activity={activity}
        taskDrawerInfo={taskDrawerInfo}
        projectAgents={projectAgents}
        proposals={proposals}
        projectMembers={memberOptions}
        sprints={sprints}
      />
      {/* "Sprint" ở toolbar đặt ?sprints=1 (F21.3) */}
      {searchParams[SPRINTS_PARAM] === "1" && <SprintDialog projectId={projectId} sprints={sprints} />}
      {/* "Feature mới" ở toolbar đặt ?newFeature=1 (F21.1) */}
      {searchParams[NEW_FEATURE_PARAM] === "1" && <NewFeatureDialog projectId={projectId} members={memberOptions} />}
      {/* "Task mới" ở header đặt ?new=1 (ADR-018) */}
      {newParam === "1" && (
        <NewTaskDialog projectId={projectId} features={features.map(({ id, name }) => ({ id, name }))} members={projectTeam} />
      )}
    </>
  );
}
