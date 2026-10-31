import type { prisma } from "@/lib/prisma";

// Lịch sử block (F22.7). Gọi trong cùng transaction với việc đổi `Task.blocked`.

type Db = Pick<typeof prisma, "task" | "taskBlock">;

/** Đặt / đổi lý do / gỡ block và ghi lịch sử: chưa block → mở dòng mới; đang block → cập nhật lý do; gỡ → đóng dòng mở. */
export async function applyBlock(db: Db, taskId: string, block: { short: string; full: string | null } | null, now = new Date()) {
  const open = await db.taskBlock.findFirst({ where: { taskId, unblockedAt: null }, orderBy: { blockedAt: "desc" } });
  if (block) {
    if (open) await db.taskBlock.update({ where: { id: open.id }, data: { reason: block.short } });
    else await db.taskBlock.create({ data: { taskId, reason: block.short, blockedAt: now } });
  } else if (open) {
    await db.taskBlock.update({ where: { id: open.id }, data: { unblockedAt: now } });
  }
  await db.task.update({ where: { id: taskId }, data: { blocked: block?.short ?? null, blockedFull: block ? block.full || null : null } });
}
