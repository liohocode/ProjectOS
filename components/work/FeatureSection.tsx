"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useCan } from "@/components/auth/PermissionsProvider";
import { FeatureDialog } from "./FeatureDialog";
import type { Feature, MemberOption } from "@/lib/types";
import { TaskRow } from "./TaskRow";
import { initials, stageTagClass } from "./taskStyle";

export function FeatureSection({
  feature,
  open,
  onToggle,
  onOpenTask,
  members,
}: {
  feature: Feature;
  /** Thành viên dự án — chọn người phụ trách khi sửa (F21.1) */
  members: MemberOption[];
  open: boolean;
  onToggle: () => void;
  onOpenTask: (taskId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const canEdit = useCan("feature.manage");
  const projectId = usePathname().split("/")[1];
  return (
    <section className="feature-section" id={`feature-${feature.id}`}>
      <div className="frow">
        <button type="button" className="frow-caret" onClick={onToggle} aria-label={open ? "Thu gọn" : "Mở rộng"}>
          <i className={`ph ${open ? "ph-caret-down" : "ph-caret-right"}`} aria-hidden />
        </button>
        <span className="trow-id nowrap">{feature.id}</span>
        <span className="frow-name">{feature.name}</span>
        <span className={`${stageTagClass(feature.stage)} f-stage`}>{feature.stage}</span>
        <span className="text-muted nowrap f-docs" style={{ fontSize: 11 }}>
          <i className="ph ph-file-text" aria-hidden /> {feature.docs} docs
        </span>
        <div className="frow-progress f-bar">
          <div className="frow-progress-track">
            <div className="frow-progress-fill" style={{ width: `${feature.pct}%` }} />
          </div>
          <span className="frow-pct">{feature.pct}%</span>
        </div>
        <span
          className={`avatar ${feature.ownerKind ? `avatar-${feature.ownerKind}` : "avatar-none"}`}
          style={{ width: 22, height: 22, fontSize: 9.5 }}
          title={feature.owner}
        >
          {feature.ownerKind ? initials(feature.owner) : <i className="ph ph-user" aria-hidden />}
        </span>
        {canEdit && (
          <button type="button" className="btn btn-ghost btn-icon frow-edit" aria-label={`Sửa ${feature.id}`} title="Sửa feature" onClick={() => setEditing(true)}>
            <i className="ph ph-pencil-simple" aria-hidden />
          </button>
        )}
      </div>
      {editing && <FeatureDialog projectId={projectId} feature={feature} members={members} onClose={() => setEditing(false)} />}
      {open && feature.tasks.length === 0 && (
        <div className="trow-empty">
          Chưa có task{feature.ownerKind ? "" : " · chưa giao cho ai"}
        </div>
      )}
      {open && feature.tasks.map((task) => <TaskRow key={task.id} task={task} onOpen={() => onOpenTask(task.id)} />)}
    </section>
  );
}
