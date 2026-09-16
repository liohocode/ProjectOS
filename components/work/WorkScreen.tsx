"use client";

import { useMemo, useState } from "react";
import type { ActivityItem, Feature, Member, TaskDrawerInfo, TaskStage, TimelineRow } from "@/lib/types";
import { FeatureSection } from "./FeatureSection";
import { TimelineView } from "./TimelineView";
import { ActivityRail } from "./ActivityRail";
import { TaskDrawer } from "./TaskDrawer";

type View = "list" | "timeline";

export function WorkScreen({
  features: initialFeatures,
  timeline,
  activity,
  taskDrawerInfo,
  projectAgents,
}: {
  features: Feature[];
  timeline: TimelineRow[];
  activity: ActivityItem[];
  taskDrawerInfo: Record<string, TaskDrawerInfo>;
  projectAgents: Member[];
}) {
  const [features, setFeatures] = useState(initialFeatures);
  const [view, setView] = useState<View>("list");
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [railOpen, setRailOpen] = useState(true);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const allTasks = useMemo(() => features.flatMap((f) => f.tasks), [features]);
  const blockedTasks = useMemo(() => allTasks.filter((t) => t.blocked), [allTasks]);

  const activeTask = openTaskId
    ? features.flatMap((f) => f.tasks.map((t) => ({ task: t, feature: f }))).find((x) => x.task.id === openTaskId)
    : undefined;

  function updateTask(taskId: string, patch: Partial<Feature["tasks"][number]>) {
    setFeatures((prev) => prev.map((f) => ({ ...f, tasks: f.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) })));
  }

  function cycleStage(taskId: string, current: TaskStage) {
    const order: TaskStage[] = ["BA", "TA", "Dev", "Review", "Done"];
    const next = order[(order.indexOf(current) + 1) % order.length];
    updateTask(taskId, { stage: next });
  }

  function assignAgent(taskId: string, agent: Member) {
    updateTask(taskId, { who: agent.name, kind: "agent" });
  }

  return (
    <div className="work-shell">
      <div className="work-main">
        <div className="work-toolbar">
          <div className="seg">
            <label className="seg-opt">
              <input type="radio" checked={view === "list"} onChange={() => setView("list")} />
              <i className="ph ph-list-dashes" aria-hidden /> Theo feature
            </label>
            <label className="seg-opt">
              <input type="radio" checked={view === "timeline"} onChange={() => setView("timeline")} />
              <i className="ph ph-chart-bar-horizontal" aria-hidden /> Timeline
            </label>
          </div>
          <span className="work-toolbar-sprint">{allTasks.length} task</span>
          <div className="work-toolbar-spacer" />
          <button type="button" className="btn btn-secondary" onClick={() => setRailOpen((v) => !v)}>
            <i className="ph ph-activity" aria-hidden /> {railOpen ? "Ẩn activity" : "Activity feed"}
          </button>
        </div>

        {blockedTasks.length > 0 && (
          <div className="banner-block">
            <i className="ph ph-warning banner-block-icon" aria-hidden />
            <span className="banner-block-text">
              {blockedTasks.length} task đang bị block — {blockedTasks.map((t) => `${t.id} (${t.blocked})`).join(", ")}
            </span>
            <button type="button" className="btn btn-ghost" onClick={() => setOpenTaskId(blockedTasks[0].id)}>
              Xem tất cả
            </button>
          </div>
        )}

        {view === "list" ? (
          <div className="list-area">
            {features.map((feature) => (
              <FeatureSection
                key={feature.id}
                feature={feature}
                open={!closed[feature.id]}
                onToggle={() => setClosed((c) => ({ ...c, [feature.id]: !c[feature.id] }))}
                onOpenTask={setOpenTaskId}
              />
            ))}
          </div>
        ) : (
          <TimelineView rows={timeline} />
        )}
      </div>

      {railOpen && <ActivityRail items={activity} onClose={() => setRailOpen(false)} />}

      {activeTask && (
        <TaskDrawer
          task={activeTask.task}
          feature={activeTask.feature}
          info={taskDrawerInfo[activeTask.task.id]}
          agents={projectAgents}
          onClose={() => setOpenTaskId(null)}
          onCycleStage={() => cycleStage(activeTask.task.id, activeTask.task.stage)}
          onAssignAgent={(agent) => assignAgent(activeTask.task.id, agent)}
        />
      )}
    </div>
  );
}
