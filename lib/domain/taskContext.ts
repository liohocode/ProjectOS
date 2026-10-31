import { prisma } from "@/lib/prisma";
import type { DocSection } from "@/lib/types";
import { listTasksForMember, type AgentTaskView } from "./tasks";

// `context_get(taskId)` (F24.1): mọi thứ agent cần để bắt đầu một task trong MỘT lệnh — task, feature, tài liệu
// của feature (đầy đủ nội dung), acceptance criteria (F21.6), bình luận, lịch sử chuyển trạng thái, lần bị trả lại gần nhất.

const MAX_DOCS = 5;
const MAX_COMMENTS = 30;

export interface TaskContext {
  task: AgentTaskView;
  /** Mô tả markdown ("Làm gì") của task (F21.7); null = chưa có */
  description: string | null;
  feature: { id: string; name: string; stage: string; owner: string | null };
  docs: { id: string; title: string; version: string; summary: string; sections: DocSection[] }[];
  /** Tài liệu feature còn lại (khi vượt MAX_DOCS) — đọc thêm bằng docs_read */
  moreDocs: { id: string; title: string }[];
  /** Acceptance criteria (F21.6) — agent tick bằng `criteria_check` */
  criteria: { id: string; text: string; done: boolean }[];
  comments: { author: string; body: string; at: string }[];
  history: { at: string; actor: string; via: string; from: string | null; to: string | null; note: string | null }[];
}

export async function getTaskContext(
  agentId: string,
  taskId: string,
  opts: { includeDocs: boolean },
): Promise<{ ok: true; context: TaskContext; projectId: string } | { ok: false; reason: string }> {
  const [view] = (await listTasksForMember(agentId, {})).filter((t) => t.id === taskId);
  if (!view) return { ok: false, reason: `Không tìm thấy task ${taskId} trong dự án của bạn` };

  const [feature, docs, comments, transitions, criteria, detail] = await Promise.all([
    prisma.feature.findUniqueOrThrow({ where: { id: view.featureId }, select: { id: true, name: true, stage: true, owner: { select: { name: true } } } }),
    opts.includeDocs
      ? prisma.doc.findMany({
          where: { featureId: view.featureId },
          orderBy: { updatedAt: "desc" },
          select: { id: true, title: true, version: true, summary: true, sections: true },
        })
      : Promise.resolve([]),
    prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
      take: MAX_COMMENTS,
      select: { body: true, createdAt: true, author: { select: { name: true } } },
    }),
    prisma.taskTransition.findMany({
      where: { taskId },
      orderBy: { at: "asc" },
      select: { at: true, via: true, fromStage: true, toStage: true, fromStatus: true, toStatus: true, note: true, actor: { select: { name: true } } },
    }),
    prisma.taskCriterion.findMany({ where: { taskId }, orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true, text: true, doneAt: true } }),
    prisma.task.findUniqueOrThrow({ where: { id: taskId }, select: { description: true } }),
  ]);

  const describe = (stage: string | null, status: string | null) => [stage, status].filter(Boolean).join(" · ") || null;
  return {
    ok: true,
    projectId: view.projectId,
    context: {
      task: view,
      description: detail.description,
      feature: { id: feature.id, name: feature.name, stage: feature.stage, owner: feature.owner?.name ?? null },
      docs: docs.slice(0, MAX_DOCS).map((d) => ({ ...d, sections: d.sections as unknown as DocSection[] })),
      moreDocs: docs.slice(MAX_DOCS).map(({ id, title }) => ({ id, title })),
      criteria: criteria.map((c) => ({ id: c.id, text: c.text, done: c.doneAt !== null })),
      comments: comments.reverse().map((c) => ({ author: c.author.name, body: c.body, at: c.createdAt.toISOString() })),
      history: transitions.map((t) => ({
        at: t.at.toISOString(),
        actor: t.actor.name,
        via: t.via,
        from: describe(t.fromStage, t.fromStatus),
        to: describe(t.toStage, t.toStatus),
        note: t.note,
      })),
    },
  };
}
