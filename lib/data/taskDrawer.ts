import { cache } from "react";
import type { TaskDrawerInfo } from "@/lib/types";
import { getTasksByProject } from "./features";
import { COMMAND_RESULT_LABEL } from "./mcpLabels";
import { prisma } from "@/lib/prisma";
import { formatRelativeVi } from "@/lib/relativeTime";

/** Bình luận của mọi task trong dự án — một query cho cả màn work (page tải drawer info cho từng task). */
const getTaskCommentsByProject = cache(async (projectId: string): Promise<Map<string, TaskDrawerInfo["comments"]>> => {
  const rows = await prisma.taskComment.findMany({
    where: { task: { feature: { projectId } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, taskId: true, body: true, createdAt: true, author: { select: { name: true, kind: true } } },
  });
  const byTask = new Map<string, TaskDrawerInfo["comments"]>();
  for (const c of rows) {
    const list = byTask.get(c.taskId) ?? [];
    list.push({ id: c.id, author: c.author.name, kind: c.author.kind, body: c.body, when: formatRelativeVi(c.createdAt) });
    byTask.set(c.taskId, list);
  }
  return byTask;
});

const TASK_TARGET = /^(T-\d+)(?:\s|$)/;
const LOG_SCAN_LIMIT = 500;

type Step = TaskDrawerInfo["sessionLog"][number] & { at: Date };

/**
 * Log phiên chạy thật của mọi task trong dự án (F17.4), một lần cho cả màn work:
 * - thao tác trên web (ActivityEvent không có tool) — chuyển stage, block, giao…;
 * - lệnh MCP của agent nhắm vào task (McpLogEntry, target bắt đầu bằng mã task) — kể cả lệnh bị chặn.
 * Sự kiện do lệnh MCP sinh ra (có tool) bỏ qua vì đã có dòng nhật ký tương ứng.
 */
const getTaskStepsByProject = cache(async (projectId: string): Promise<Map<string, Step[]>> => {
  const [events, logs, taskIds] = await Promise.all([
    prisma.activityEvent.findMany({
      where: { projectId, taskId: { not: null }, tool: null },
      select: { taskId: true, text: true, at: true, actor: { select: { name: true } } },
    }),
    prisma.mcpLogEntry.findMany({
      where: { target: { startsWith: "T-" } },
      orderBy: { at: "desc" },
      take: LOG_SCAN_LIMIT,
      select: { tool: true, target: true, result: true, at: true, agent: { select: { name: true } } },
    }),
    prisma.task.findMany({ where: { feature: { projectId } }, select: { id: true } }),
  ]);
  const inProject = new Set(taskIds.map((t) => t.id));
  const byTask = new Map<string, Step[]>();
  const push = (taskId: string, step: Step) => byTask.set(taskId, [...(byTask.get(taskId) ?? []), step]);

  for (const e of events) push(e.taskId!, { text: `${e.actor.name}: ${e.text}`, when: formatRelativeVi(e.at), at: e.at });
  for (const l of logs) {
    const taskId = TASK_TARGET.exec(l.target)?.[1];
    if (!taskId || !inProject.has(taskId)) continue;
    const result = COMMAND_RESULT_LABEL[l.result];
    push(taskId, { text: `${l.agent.name} gọi ${l.tool} — ${l.target}${result === "OK" ? "" : ` (${result})`}`, when: formatRelativeVi(l.at), at: l.at });
  }
  for (const steps of byTask.values()) steps.sort((a, b) => a.at.getTime() - b.at.getTime());
  return byTask;
});

/** Tài liệu agent đã đọc (`docs.read`) trong các phiên chạy của từng task (F17.4). */
const getContextDocsByProject = cache(async (projectId: string): Promise<Map<string, string[]>> => {
  const sessions = await prisma.mcpSession.findMany({
    where: { projectId, taskId: { not: null } },
    select: { taskId: true, agentId: true, startedAt: true, endedAt: true },
  });
  if (sessions.length === 0) return new Map();
  const since = new Date(Math.min(...sessions.map((s) => s.startedAt.getTime())) - 60_000);
  const [reads, docs] = await Promise.all([
    prisma.mcpLogEntry.findMany({
      where: { tool: "docs.read", result: "OK", agentId: { in: [...new Set(sessions.map((s) => s.agentId))] }, at: { gte: since } },
      select: { agentId: true, target: true, at: true },
    }),
    prisma.doc.findMany({ where: { projectId }, select: { id: true, title: true } }),
  ]);
  const titles = new Map(docs.map((d) => [d.id, d.title]));
  const byTask = new Map<string, string[]>();
  for (const s of sessions) {
    // Phiên đang mở: chưa có mốc kết thúc.
    for (const r of reads) {
      // Phiên bắt đầu ở lệnh đầu tiên; tài liệu gửi kèm context_get (F24.1) ghi ngay trước lệnh đó → nới 60 giây.
      if (r.agentId !== s.agentId || r.at.getTime() < s.startedAt.getTime() - 60_000 || (s.endedAt && r.at > s.endedAt)) continue;
      const title = titles.get(r.target);
      const list = byTask.get(s.taskId!) ?? [];
      if (title && !list.includes(title)) byTask.set(s.taskId!, [...list, title]);
    }
  }
  return byTask;
});

/** Context docs + log phiên chạy (dữ liệu thật — F17.4) + bình luận (F16.4) cho task drawer. */
export const getTaskDrawerInfo = cache(async (projectId: string, taskId: string): Promise<TaskDrawerInfo | null> => {
  const task = (await getTasksByProject(projectId)).find((t) => t.id === taskId);
  if (!task) return null;

  const [steps, contextDocs, comments] = await Promise.all([
    getTaskStepsByProject(projectId),
    getContextDocsByProject(projectId),
    getTaskCommentsByProject(projectId),
  ]);
  const sessionLog: TaskDrawerInfo["sessionLog"] = (steps.get(taskId) ?? []).map(({ text, when }) => ({ text, when }));
  // Task đang chạy: dòng cuối "Đang chạy" với thời gian tự tăng (F17.5).
  if (task.running) sessionLog.push({ text: "Đang chạy", when: task.running, runningSince: task.runningSince });
  return { contextDocs: contextDocs.get(taskId) ?? [], sessionLog, comments: comments.get(taskId) ?? [] };
});
