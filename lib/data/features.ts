import type { Feature, Task } from "@/lib/types";
import { prisma } from "@/lib/prisma";

export async function getFeaturesByProject(projectId: string): Promise<Feature[]> {
  const rows = await prisma.feature.findMany({
    where: { projectId },
    include: {
      owner: true,
      tasks: { include: { assignee: true }, orderBy: { id: "asc" } },
      _count: { select: { docs: true } },
    },
    orderBy: { id: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    stage: row.stage,
    owner: row.owner.name,
    pct: row.pct,
    docs: row._count.docs,
    tasks: row.tasks.map(
      (t): Task => ({
        id: t.id,
        stage: t.stage,
        title: t.title,
        who: t.assignee.name,
        kind: t.assignee.kind,
        status: t.status,
        est: t.est,
        due: t.due,
        blocked: t.blocked ?? undefined,
        blockedFull: t.blockedFull ?? undefined,
        running: t.running ?? undefined,
      }),
    ),
  }));
}

export async function getTasksByProject(projectId: string): Promise<Task[]> {
  const features = await getFeaturesByProject(projectId);
  return features.flatMap((f) => f.tasks);
}
