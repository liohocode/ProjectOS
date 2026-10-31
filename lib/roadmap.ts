import type { Feature, ProjectPhaseView, Task } from "@/lib/types";

// Màn Roadmap (F28.4) — hàm thuần trên feature / task / phase đã tải.

export interface PhaseProgress {
  phase: ProjectPhaseView | null;
  features: Feature[];
  done: number;
  total: number;
}

const taskDone = (t: Task) => t.stage === "Done";

/** Gom feature theo phase (thứ tự phase; feature chưa xếp phase ở cuối), kèm số task xong / tổng. */
export function groupByPhase(features: readonly Feature[], phases: readonly ProjectPhaseView[]): PhaseProgress[] {
  const groups: PhaseProgress[] = phases.map((phase) => ({ phase, features: [], done: 0, total: 0 }));
  const byId = new Map(groups.map((g) => [g.phase!.id, g]));
  const none: PhaseProgress = { phase: null, features: [], done: 0, total: 0 };
  for (const f of features) {
    const g = (f.phase && byId.get(f.phase.id)) || none;
    g.features.push(f);
    g.total += f.tasks.length;
    g.done += f.tasks.filter(taskDone).length;
  }
  return [...groups, ...(none.features.length ? [none] : [])].filter((g) => g.features.length > 0);
}

export interface TaskPick {
  task: Task;
  feature: Feature;
}

/** Task cần người quyết định, chưa Done. */
export function openDecisions(features: readonly Feature[]): TaskPick[] {
  return features.flatMap((feature) => feature.tasks.filter((t) => t.needsDecision && !taskDone(t)).map((task) => ({ task, feature })));
}

/** Tiêu đề phase: "Phase 7 — Quản lý công việc"; phase chưa có tên riêng (import đặt "Phase 7") → "Phase 7". */
export function phaseTitle(phase: { code: string; name: string } | null): string {
  if (!phase) return "Chưa xếp phase";
  return phase.name === `Phase ${phase.code}` ? phase.name : `Phase ${phase.code} — ${phase.name}`;
}

/**
 * Việc nên nhận tiếp: task chưa bắt đầu (không Done, không đang làm / chạy, không block, không chờ quyết định), mọi phụ thuộc
 * task đã Done và feature không còn chờ feature khác chưa Done. Thứ tự: phase → feature → task (thứ tự hiện có).
 */
export function nextTasks(groups: readonly PhaseProgress[], limit = 8): TaskPick[] {
  const out: TaskPick[] = [];
  for (const g of groups) {
    for (const feature of g.features) {
      if (feature.dependsOn.some((d) => d.stage !== "Done")) continue;
      for (const task of feature.tasks) {
        if (taskDone(task) || task.running || task.blocked || task.needsDecision || task.stage === "Review" || task.status === "Đang làm") continue;
        if (task.dependsOn.some((d) => !d.done)) continue;
        out.push({ task, feature });
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}
