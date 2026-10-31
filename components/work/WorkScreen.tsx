"use client";

import { useEffect, useMemo, useState } from "react";
import { ProposedFeatures } from "./ProposedFeatures";
import type { ProposedFeature } from "@/lib/types";
import Link from "next/link";
import { useCan } from "@/components/auth/PermissionsProvider";
import { useUrlDialog } from "@/components/ui/urlDialog";
import { NEW_FEATURE_PARAM, SPRINTS_PARAM } from "./featureDialogParam";
import type { MemberOption, SprintOption } from "@/lib/types";
import type { ActivityItem, Feature, Member, Task, TaskDrawerInfo, TimelineRow } from "@/lib/types";
import { FeatureSection } from "./FeatureSection";
import { TimelineView } from "./TimelineView";
import { ActivityRail } from "./ActivityRail";
import { TaskDrawer } from "./TaskDrawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { useWorkUrl } from "./workUrl";

export function WorkScreen({
  features,
  filtered = false,
  timeline,
  activity,
  taskDrawerInfo,
  projectAgents,
  proposals = [],
  projectMembers = [],
  sprints = [],
  archivedTask,
  doneDefinition = [],
}: {
  features: Feature[];
  /** Đang áp bộ lọc "Lọc" (F14.3) — features đã lọc ở server. */
  filtered?: boolean;
  timeline: TimelineRow[];
  activity: ActivityItem[];
  taskDrawerInfo: Record<string, TaskDrawerInfo>;
  projectAgents: Member[];
  /** Feature agent đề xuất chờ duyệt (F16.6) */
  proposals?: ProposedFeature[];
  /** Chọn người phụ trách feature (F21.1) */
  projectMembers?: MemberOption[];
  /** Sprint của dự án (F21.3) — xếp task trong drawer */
  sprints?: SprintOption[];
  /** Task đã lưu trữ mở bằng deep link (F21.4) — không có trong `features` */
  archivedTask?: { task: Task; feature: Feature };
  /** Definition of Done của dự án (F22.6) */
  doneDefinition?: string[];
}) {
  const canCreateFeature = useCan("feature.create");
  const { openHref: newFeatureHref } = useUrlDialog(NEW_FEATURE_PARAM);
  const { openHref: sprintsHref } = useUrlDialog(SPRINTS_PARAM);
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
  // F22.2: task đang chờ người duyệt — mở drawer để Duyệt / Trả lại.
  const reviewTasks = useMemo(() => allTasks.filter((t) => t.stage === "Review"), [allTasks]);

  const activeTask = openTaskId
    ? (features.flatMap((f) => f.tasks.map((t) => ({ task: t, feature: f }))).find((x) => x.task.id === openTaskId) ??
      (archivedTask?.task.id === openTaskId ? archivedTask : undefined))
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
          {canCreateFeature && (
            <Link href={newFeatureHref} scroll={false} className="btn btn-secondary">
              <i className="ph ph-plus" aria-hidden /> Feature mới
            </Link>
          )}
          <Link href={sprintsHref} scroll={false} className="btn btn-secondary">
            <i className="ph ph-calendar" aria-hidden /> Sprint
          </Link>
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

        {view === "list" && <ProposedFeatures proposals={proposals} />}
        {view === "list" && reviewTasks.length > 0 && (
          <section className="proposals review-queue" aria-label="Task chờ review">
            <div className="proposals-title">
              <i className="ph ph-seal-check" aria-hidden /> Chờ review <span className="text-muted">({reviewTasks.length})</span>
            </div>
            {reviewTasks.map((t) => (
              <Link key={t.id} href={taskHref(t.id)} scroll={false} className="review-queue-item">
                <span className="mono text-muted">{t.id}</span>
                <span className="review-queue-title">{t.title}</span>
                <span className={`tag ${t.kind === "agent" ? "tag-accent" : "tag-neutral"} nowrap`}>{t.who}</span>
              </Link>
            ))}
          </section>
        )}

        {features.length === 0 && filtered && view === "list" ? (
          <EmptyState
            icon="ph-funnel"
            title="Không có task nào khớp bộ lọc"
            description="Đổi tiêu chí hoặc bấm “Xoá lọc” trong nút Lọc ở header."
          />
        ) : features.length === 0 && view === "list" ? (
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
                members={projectMembers}
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
          sprints={sprints}
          projectTasks={allTasks.map(({ id, title, stage }) => ({ id, title, stage, done: stage === "Done" }))}
          doneDefinition={doneDefinition}
          onClose={closeTask}
        />
      )}
    </div>
  );
}
