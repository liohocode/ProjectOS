import { prisma } from "@/lib/prisma";
import type { TaskStage, TaskStatus, TransitionVia } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";

// Mọi thay đổi stage / trạng thái task đi qua đây (F22.1) để luôn có dòng lịch sử `TaskTransition`.
// Dùng được trong transaction (truyền `tx`) — server action (web) và MCP tool (agent) dùng chung.

type Db = Pick<typeof prisma, "task" | "taskTransition">;

export interface TaskChange {
  stage?: TaskStage;
  status?: TaskStatus;
}

/**
 * Cập nhật task (kèm `extra` — vd giao người, `runningSince`) và ghi một dòng lịch sử nếu stage / status thực sự đổi.
 * Trả false nếu task không tồn tại.
 */
export async function transitionTask(
  db: Db,
  taskId: string,
  actorId: string,
  via: TransitionVia,
  change: TaskChange,
  extra: Prisma.TaskUncheckedUpdateInput = {},
): Promise<boolean> {
  const current = await db.task.findUnique({ where: { id: taskId }, select: { stage: true, status: true } });
  if (!current) return false;
  await db.task.update({ where: { id: taskId }, data: { ...extra, ...change } });

  const stageChanged = change.stage !== undefined && change.stage !== current.stage;
  const statusChanged = change.status !== undefined && change.status !== current.status;
  if (stageChanged || statusChanged) {
    await db.taskTransition.create({
      data: {
        taskId,
        actorId,
        via,
        ...(stageChanged && { fromStage: current.stage, toStage: change.stage }),
        ...(statusChanged && { fromStatus: current.status, toStatus: change.status }),
      },
    });
  }
  return true;
}

/** Dòng lịch sử đầu tiên khi tạo task (from* null). */
export async function recordTaskCreated(db: Db, taskId: string, actorId: string, via: TransitionVia, stage: TaskStage, status: TaskStatus) {
  await db.taskTransition.create({ data: { taskId, actorId, via, toStage: stage, toStatus: status } });
}
