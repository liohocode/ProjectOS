import type { CSSProperties } from "react";
import type { Task } from "@/lib/types";

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
