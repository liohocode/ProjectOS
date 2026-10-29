"use client";

import { useState } from "react";
import type { Member } from "@/lib/types";
import { initials } from "@/components/work/taskStyle";
import { AssignTaskDialog, type AssignableFeature } from "./AssignTaskDialog";

export function MemberPanel({
  member,
  inProject,
  assignable,
}: {
  member: Member;
  /** Chỉ thành viên của dự án đang mở mới giao task được (xem "Toàn tổ chức" thì có thể không) */
  inProject: boolean;
  assignable: AssignableFeature[];
}) {
  const [assigning, setAssigning] = useState(false);
  return (
    <aside className="team-aside">
      <div className="panel-header">
        <span className={`avatar ${member.kind === "agent" ? "avatar-agent" : "avatar-human"}`} style={{ width: 36, height: 36, fontSize: 14 }}>
          {initials(member.name)}
        </span>
        <div>
          <div className="panel-header-name">{member.name}</div>
          <div className="panel-header-sub">
            {member.handle} · {member.role}
          </div>
        </div>
      </div>

      {member.kind === "agent" && member.config && (
        <div className="panel-section">
          <div className="panel-section-title">Cấu hình agent</div>
          {member.config.map(([label, value]) => (
            <div className="config-row" key={label}>
              <span className="config-row-label">{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="panel-section">
        <div className="panel-section-title">Skills</div>
        {member.skillRows.map(([label, level, pct]) => (
          <div className="skill-row" key={label}>
            <div className="skill-row-top">
              <span>{label}</span>
              <span className="text-muted">{level}</span>
            </div>
            <div className="skill-bar-track">
              <div
                className="skill-bar-fill"
                style={{ width: `${pct}%`, background: pct > 70 ? "var(--color-accent)" : "var(--color-accent-700)" }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="panel-section">
        <div className="panel-section-title">Hoạt động gần đây</div>
        {member.activity.map((a, i) => (
          <div className="panel-activity-item" key={i}>
            <i className={`ph ${a.icon}`} aria-hidden />
            <div>
              <div>{a.text}</div>
              <div className="text-muted" style={{ fontSize: 11 }}>
                {a.when}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="panel-footer">
        <button type="button" className="btn btn-secondary">
          Xem log
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!inProject}
          title={inProject ? undefined : "Thành viên chưa thuộc dự án này — thêm vào dự án trước"}
          onClick={() => setAssigning(true)}
        >
          Giao task
        </button>
      </div>
      {assigning && <AssignTaskDialog member={member} features={assignable} onClose={() => setAssigning(false)} />}
    </aside>
  );
}
