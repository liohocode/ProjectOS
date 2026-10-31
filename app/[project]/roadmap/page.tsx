import { getFeaturesByProject, getPhasesByProject } from "@/lib/data/features";
import { groupByPhase, nextTasks, openDecisions } from "@/lib/roadmap";
import { RoadmapScreen } from "@/components/roadmap/RoadmapScreen";

/** Màn Roadmap (F28.4): tiến độ theo phase / feature, quyết định đang mở, việc nên nhận tiếp. */
export default async function RoadmapPage(props: PageProps<"/[project]/roadmap">) {
  const { project: projectId } = await props.params;
  const [features, phases] = await Promise.all([getFeaturesByProject(projectId), getPhasesByProject(projectId)]);
  const groups = groupByPhase(features, phases);
  return <RoadmapScreen projectId={projectId} groups={groups} decisions={openDecisions(features)} next={nextTasks(groups)} />;
}
