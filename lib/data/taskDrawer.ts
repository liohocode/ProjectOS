import { cache } from "react";
import type { Task, TaskDrawerInfo } from "@/lib/types";
import { getFeaturesByProject } from "./features";
import { getDocGroupsByProject } from "./docs";

const STAGE_ASSIGNER: Record<string, string> = {
  BA: "Bảo (BA agent)",
  TA: "Vega (TA agent)",
  Dev: "Vega (TA agent)",
  Review: "Vega (TA agent)",
  Done: "Vega (TA agent)",
};

/**
 * Context docs + log phiên chạy cho task drawer — suy ra từ feature/task thật
 * bằng một mẫu chung, thay vì viết tay cho từng task. Thay bằng log thật ở docs/features/F17-realtime-activity.md (F17.4).
 */
export const getTaskDrawerInfo = cache(async (projectId: string, taskId: string): Promise<TaskDrawerInfo | null> => {
  const features = await getFeaturesByProject(projectId);
  const feature = features.find((f) => f.tasks.some((t) => t.id === taskId));
  const task = feature?.tasks.find((t) => t.id === taskId);
  if (!feature || !task) return null;

  const groups = await getDocGroupsByProject(projectId);
  const featureGroup = groups.find((g) => g.name.startsWith(feature.id));
  const contextDocs = task.kind === "agent" ? featureGroup?.items.slice(0, 3).map((i) => i.title) ?? [] : [];

  return { contextDocs, sessionLog: buildSessionLog(task, contextDocs.length) };
});

function buildSessionLog(task: Task, contextDocCount: number): { text: string; when: string }[] {
  const log: { text: string; when: string }[] = [];

  if (task.kind === "agent") {
    log.push({ text: `${STAGE_ASSIGNER[task.stage]} chia task và giao cho ${task.who}`, when: "5 giờ trước" });
    log.push({ text: `${task.who} claim task qua tasks.claim`, when: "4 giờ trước" });
    if (contextDocCount > 0) {
      log.push({ text: `Pull ${contextDocCount} tài liệu context qua docs.read`, when: "4 giờ trước" });
    }
  } else {
    log.push({ text: `${task.who} nhận task`, when: "5 giờ trước" });
  }

  if (task.blocked) {
    log.push({ text: `Bị block: ${task.blockedFull ?? task.blocked}`, when: "1 giờ trước" });
  } else if (task.running) {
    log.push({ text: `Đang chạy — ${task.running}`, when: "vừa xong" });
  } else if (task.status === "Chờ review") {
    log.push({ text: "Đẩy commit, mở PR chờ review", when: "1 giờ trước" });
    log.push({ text: "Chờ review của Trung Hiếu", when: "30 phút trước" });
  } else if (task.status === "Xong") {
    log.push({ text: "Merge PR, đánh dấu task Xong", when: `Hoàn thành ${task.due}` });
  } else {
    log.push({ text: `Trạng thái hiện tại: ${task.status}`, when: `Hạn ${task.due}` });
  }

  return log;
}
