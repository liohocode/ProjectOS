import { prisma } from "@/lib/prisma";
import { dependencyBlockReason, wouldCreateCycle } from "@/lib/taskDeps";

// Phụ thuộc giữa task (F21.8). Không có "use server"; nơi gọi tự kiểm tra quyền.

type Result = { ok: true } | { ok: false; error: string };

export async function addDependency(taskId: string, dependsOnId: string): Promise<Result> {
  if (taskId === dependsOnId) return { ok: false, error: "Task không phụ thuộc chính nó" };
  const [task, dep] = await Promise.all([
    prisma.task.findUnique({ where: { id: taskId }, select: { feature: { select: { projectId: true } } } }),
    prisma.task.findUnique({ where: { id: dependsOnId }, select: { feature: { select: { projectId: true } } } }),
  ]);
  if (!task || !dep || task.feature.projectId !== dep.feature.projectId) return { ok: false, error: `Không tìm thấy task ${dependsOnId} trong dự án` };
  return prisma.$transaction(async (tx) => {
    // Khoá theo dự án: hai người thêm phụ thuộc ngược chiều cùng lúc không tạo được vòng.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`meridian:deps:${task.feature.projectId}`}))`;
    const edges = await tx.taskDependency.findMany({
      where: { task: { feature: { projectId: task.feature.projectId } } },
      select: { taskId: true, dependsOnId: true },
    });
    if (edges.some((e) => e.taskId === taskId && e.dependsOnId === dependsOnId)) return { ok: true as const };
    if (wouldCreateCycle(edges.map((e) => [e.taskId, e.dependsOnId] as const), taskId, dependsOnId)) {
      return { ok: false as const, error: `Không thêm được: ${dependsOnId} đang (gián tiếp) phụ thuộc ${taskId} — sẽ tạo vòng` };
    }
    await tx.taskDependency.create({ data: { taskId, dependsOnId } });
    return { ok: true as const };
  });
}

export async function removeDependency(taskId: string, dependsOnId: string): Promise<Result> {
  await prisma.taskDependency.deleteMany({ where: { taskId, dependsOnId } });
  return { ok: true };
}

/** Phụ thuộc chưa Done (bỏ qua task đã lưu trữ) của task. */
export async function pendingDependencies(taskId: string): Promise<string[]> {
  const rows = await prisma.taskDependency.findMany({
    where: { taskId, dependsOn: { stage: { not: "Done" }, archivedAt: null } },
    orderBy: { dependsOnId: "asc" },
    select: { dependsOnId: true },
  });
  return rows.map((r) => r.dependsOnId);
}

/** Chặn bắt đầu task (claim) khi còn phụ thuộc chưa xong. */
export async function dependencyBlocker(taskId: string): Promise<string | null> {
  return dependencyBlockReason(taskId, await pendingDependencies(taskId));
}
