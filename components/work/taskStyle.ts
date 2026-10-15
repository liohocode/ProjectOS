import type { CSSProperties } from "react";
import type { Task, TaskStage } from "@/lib/types";

export function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function taskRowStyle(task: Task): CSSProperties {
  const border = task.blocked
    ? ", inset 2px 0 0 var(--color-warning)"
    : task.kind === "agent"
      ? ", inset 2px 0 0 var(--color-accent)"
      : "";
  return { boxShadow: `inset 0 -1px 0 color-mix(in srgb, var(--color-text) 7%, transparent)${border}` };
}

export function stageTagClass(stage: string) {
  return stage === "Done" ? "tag tag-neutral nowrap" : "tag tag-outline nowrap";
}

const STAGE_ORDER: TaskStage[] = ["BA", "TA", "Dev", "Review", "Done"];

/** Stage kế tiếp khi bấm "Chuyển stage" — xoay vòng BA → TA → Dev → Review → Done → BA. */
export function nextStage(stage: TaskStage): TaskStage {
  return STAGE_ORDER[(STAGE_ORDER.indexOf(stage) + 1) % STAGE_ORDER.length];
}
