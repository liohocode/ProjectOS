import { getFeaturesByProject } from "@/lib/data/features";
import { getTimelineByProject } from "@/lib/data/timeline";
import { getActivityFeed } from "@/lib/data/activity";
import { getTaskDrawerInfo } from "@/lib/data/taskDrawer";
import { WorkScreen } from "@/components/work/WorkScreen";

export default async function WorkPage(props: PageProps<"/[project]/work">) {
  const { project: projectId } = await props.params;

  const [features, timeline, activity] = await Promise.all([
    getFeaturesByProject(projectId),
    getTimelineByProject(projectId),
    getActivityFeed(projectId),
  ]);

  const taskIds = features.flatMap((f) => f.tasks.map((t) => t.id));
  const drawerEntries = await Promise.all(
    taskIds.map(async (id) => [id, await getTaskDrawerInfo(projectId, id)] as const),
  );
  const taskDrawerInfo = Object.fromEntries(
    drawerEntries.filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => entry[1] !== null),
  );

  return (
    <WorkScreen features={features} timeline={timeline} activity={activity} taskDrawerInfo={taskDrawerInfo} />
  );
}
