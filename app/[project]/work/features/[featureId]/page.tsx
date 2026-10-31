import { notFound } from "next/navigation";
import { getFeatureDetail, getFeaturesByProject, getPhasesByProject } from "@/lib/data/features";
import { FeatureDetailView } from "@/components/work/FeatureDetailView";

/** Trang chi tiết feature (F21.9): mục tiêu, phạm vi, ghi chú quyết định, task, tài liệu, tiến độ. */
export default async function FeaturePage(props: PageProps<"/[project]/work/features/[featureId]">) {
  const { project: projectId, featureId } = await props.params;
  const [detail, phases, features] = await Promise.all([
    getFeatureDetail(projectId, decodeURIComponent(featureId)),
    getPhasesByProject(projectId),
    getFeaturesByProject(projectId),
  ]);
  if (!detail) notFound();
  return (
    <FeatureDetailView
      projectId={projectId}
      detail={detail}
      phases={phases}
      candidates={features.map(({ id, name, stage }) => ({ id, name, stage }))}
    />
  );
}
