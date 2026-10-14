import type { TimelineRow } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { datesToWeeks } from "@/lib/timeline";
import { UNASSIGNED_OWNER } from "./features";

// View Timeline: tuần T1–T8 tính từ ngày bắt đầu sprint hiện tại của dự án.
// Feature chưa có ngày kế hoạch hoặc nằm ngoài cửa sổ 8 tuần thì không vẽ.
export async function getTimelineByProject(projectId: string): Promise<TimelineRow[]> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      currentSprint: true,
      features: { include: { owner: true }, orderBy: { id: "asc" } },
    },
  });
  if (!project?.currentSprint) return [];
  const sprintStart = project.currentSprint.startDate;

  return project.features.flatMap((f): TimelineRow[] => {
    if (!f.plannedStart || !f.plannedEnd) return [];
    const span = datesToWeeks(f.plannedStart, f.plannedEnd, sprintStart);
    if (!span) return [];
    return [
      {
        featureId: f.id,
        name: `${f.id} ${f.name}`,
        owner: f.owner?.name ?? UNASSIGNED_OWNER,
        kind: f.owner?.kind ?? "none",
        start: span.start,
        len: span.len,
        label: f.owner ? `${f.stage} · ${f.pct}%` : "Chưa bắt đầu",
      },
    ];
  });
}
