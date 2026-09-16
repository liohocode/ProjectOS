import type { ActivityItem } from "@/lib/types";
import { getTasksByProject } from "./features";
import { getPendingRevisionsByProject } from "./docs";

// Activity rail — suy ra từ task (running/blocked/chờ review) và revision
// docs đang chờ duyệt, thay vì một mock rời rạc, để luôn khớp với dữ liệu
// task/doc thật ở các màn khác. Xem docs/features/02-feature-task.md.
export async function getActivityFeed(projectId: string): Promise<ActivityItem[]> {
  const [tasks, pendingRevisions] = await Promise.all([
    getTasksByProject(projectId),
    getPendingRevisionsByProject(projectId),
  ]);

  const running: ActivityItem[] = tasks
    .filter((t) => t.running)
    .map((t) => ({
      who: t.who,
      kind: t.kind,
      text: t.title,
      tool: `tasks.claim ${t.id}`,
      when: t.running!,
      tone: "run",
    }));

  const blocked: ActivityItem[] = tasks
    .filter((t) => t.blocked)
    .map((t) => ({
      who: t.who,
      kind: t.kind,
      text: `${t.id} bị block: ${t.blockedFull ?? t.blocked}`,
      tool: "tasks.comment",
      when: `Hạn ${t.due}`,
      tone: "block",
    }));

  const review: ActivityItem[] = tasks
    .filter((t) => t.status === "Chờ review")
    .map((t) => ({
      who: t.who,
      kind: t.kind,
      text: `${t.title} — đang chờ review`,
      tool: "tasks.update_status",
      when: `Hạn ${t.due}`,
      tone: "review",
    }));

  const docs: ActivityItem[] = pendingRevisions.map((r) => ({
    who: r.who,
    kind: r.agent ? "agent" : "human",
    text: `${r.what} — ${r.docTitle}`,
    tool: "docs.append",
    when: r.when,
    tone: "review",
  }));

  return [...running, ...blocked, ...review, ...docs];
}
