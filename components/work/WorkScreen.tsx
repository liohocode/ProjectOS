"use client";

import { useEffect, useMemo, useState } from "react";
import type { ActivityItem, Feature, Member, TaskDrawerInfo, TimelineRow } from "@/lib/types";
import { FeatureSection } from "./FeatureSection";
import { TimelineView } from "./TimelineView";
import { ActivityRail } from "./ActivityRail";
import { TaskDrawer } from "./TaskDrawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { useWorkUrl } from "./workUrl";

export function WorkScreen({
  features,
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
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [railOpen, setRailOpen] = useState(true);
  // Task đang mở và view nằm trong URL (F14.1) — copy link là mở lại đúng chỗ.
  const { taskId: openTaskId, view, taskHref, openTask, closeTask, setView } = useWorkUrl();

  // Link `#feature-FEAT-118` (kết quả tìm kiếm F14.2) từ màn khác → cuộn tới feature sau khi màn work hiện.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith("feature-")) document.getElementById(hash)?.scrollIntoView({ block: "start" });
  }, []);

  const allTasks = useMemo(() => features.flatMap((f) => f.tasks), [features]);
  const blockedTasks = useMemo(() => allTasks.filter((t) => t.blocked), [allTasks]);

  const activeTask = openTaskId
    ? features.flatMap((f) => f.tasks.map((t) => ({ task: t, feature: f }))).find((x) => x.task.id === openTaskId)
    : undefined;

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
            <button type="button" className="btn btn-ghost" onClick={() => openTask(blockedTasks[0].id)}>
              Xem tất cả
            </button>
          </div>
        )}

        {features.length === 0 ? (
          <EmptyState
            icon="ph-cube"
            title="Dự án chưa có feature nào"
            description="Khi BA agent hoặc lead tạo feature và chia task, chúng sẽ hiện ở đây theo từng feature."
          />
        ) : view === "list" ? (
          <div className="list-area">
            {features.map((feature) => (
              <FeatureSection
                key={feature.id}
                feature={feature}
                open={!closed[feature.id]}
                onToggle={() => setClosed((c) => ({ ...c, [feature.id]: !c[feature.id] }))}
                onOpenTask={openTask}
              />
            ))}
          </div>
        ) : timeline.length === 0 ? (
          <EmptyState
            icon="ph-chart-bar-horizontal"
            title="Chưa có kế hoạch nào trong 8 tuần tới"
            description="Feature chưa có ngày bắt đầu/kết thúc hoặc dự án chưa có sprint hiện tại."
          />
        ) : (
          <TimelineView rows={timeline} />
        )}
      </div>

      {railOpen && <ActivityRail items={activity} taskHref={taskHref} onClose={() => setRailOpen(false)} />}

      {activeTask && (
        <TaskDrawer
          key={activeTask.task.id}
          task={activeTask.task}
          feature={activeTask.feature}
          info={taskDrawerInfo[activeTask.task.id]}
          agents={projectAgents}
          onClose={closeTask}
        />
      )}
    </div>
  );
}
