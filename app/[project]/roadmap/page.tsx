import { getFeaturesByProject, getPhasesByProject } from "@/lib/data/features";
import { getProjectById } from "@/lib/data/projects";
import { getCredentialsByProject, isEncryptionConfigured } from "@/lib/data/credentials";
import { groupByPhase, nextTasks, openDecisions } from "@/lib/roadmap";
import { RoadmapScreen } from "@/components/roadmap/RoadmapScreen";

/** Màn Roadmap (F28.4): tiến độ theo phase / feature, quyết định đang mở, việc nên nhận tiếp. */
export default async function RoadmapPage(props: PageProps<"/[project]/roadmap">) {
  const { project: projectId } = await props.params;
  const [features, phases, project, credentials, encryptionReady] = await Promise.all([
    getFeaturesByProject(projectId),
    getPhasesByProject(projectId),
    getProjectById(projectId),
    getCredentialsByProject(projectId),
    isEncryptionConfigured(),
  ]);
  const groups = groupByPhase(features, phases);
  return (
    <RoadmapScreen
      projectId={projectId}
      groups={groups}
      decisions={openDecisions(features)}
      next={nextTasks(groups)}
      doneDefinition={project?.doneDefinition ?? []}
      credentials={credentials}
      encryptionReady={encryptionReady}
    />
  );
}
