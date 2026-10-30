import { cache } from "react";
import type { ActivityItem } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { formatRelativeVi } from "@/lib/relativeTime";
import { formatRunning } from "@/lib/taskFormat";

/** Số sự kiện tối đa ở activity rail. */
export const ACTIVITY_FEED_LIMIT = 30;

/**
 * Activity rail "Agent đang làm gì" — sự kiện thật của dự án (F17.1), mới nhất trước. Sự kiện "đang chạy" của task
 * vẫn đang chạy bởi chính người đó kèm `runningSince` → rail hiện "chạy N phút" tự tăng (F17.5).
 */
export const getActivityFeed = cache(async (projectId: string): Promise<ActivityItem[]> => {
  const rows = await prisma.activityEvent.findMany({
    where: { projectId },
    orderBy: [{ at: "desc" }, { id: "desc" }],
    take: ACTIVITY_FEED_LIMIT,
    select: { text: true, tool: true, tone: true, at: true, taskId: true, actorId: true, actor: { select: { name: true, kind: true } } },
  });
  const runIds = [...new Set(rows.filter((r) => r.tone === "run" && r.taskId).map((r) => r.taskId!))];
  const running = runIds.length
    ? await prisma.task.findMany({ where: { id: { in: runIds }, runningSince: { not: null } }, select: { id: true, assigneeId: true, runningSince: true } })
    : [];
  const runningById = new Map(running.map((t) => [t.id, t]));

  return rows.map((r) => {
    const live = r.tone === "run" && r.taskId ? runningById.get(r.taskId) : undefined;
    const stillRunning = live && live.assigneeId === r.actorId ? live.runningSince! : null;
    return {
      who: r.actor.name,
      kind: r.actor.kind,
      text: r.text,
      tool: r.tool ?? "web",
      when: formatRelativeVi(r.at),
      tone: r.tone,
      ...(r.taskId && { taskId: r.taskId }),
      ...(stillRunning && { runningSince: stillRunning.toISOString(), when: formatRunning(stillRunning, new Date()) }),
    };
  });
});
