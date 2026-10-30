"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Member, MemberOption } from "@/lib/types";
import { initials } from "@/components/work/taskStyle";
import { AssignTaskDialog, type AssignableFeature } from "./AssignTaskDialog";
import { MemberLogDialog } from "./MemberLogDialog";
import { AgentConfigDialog } from "./AgentConfigDialog";
import { RemoveMemberDialog } from "./RemoveMemberDialog";

export function MemberPanel({
  member,
  inProject,
  assignable,
  mcpServers,
  agents,
  onRemoved,
}: {
  member: Member;
  /** Chỉ thành viên của dự án đang mở mới giao task được (xem "Toàn tổ chức" thì có thể không) */
  inProject: boolean;
  assignable: AssignableFeature[];
  /** Id MCP server đã đăng ký — form cấu hình agent (F13.5) */
  mcpServers: string[];
  agents: MemberOption[];
  /** Gỡ khỏi dự án xong (F13.7) — màn team bỏ chọn thành viên */
  onRemoved: () => void;
}) {
  const [assigning, setAssigning] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [editingConfig, setEditingConfig] = useState(false);
  const [removing, setRemoving] = useState(false);
  const projectId = usePathname().split("/")[1];
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
          <div className="panel-section-title panel-section-title-row">
            Cấu hình agent
            {member.agentConfig && (
              <button type="button" className="btn btn-ghost panel-section-action" onClick={() => setEditingConfig(true)}>
                <i className="ph ph-pencil-simple" aria-hidden /> Sửa
              </button>
            )}
          </div>
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
        {inProject && (
          <button type="button" className="btn btn-ghost" aria-label="Gỡ khỏi dự án" title="Gỡ khỏi dự án" onClick={() => setRemoving(true)}>
            <i className="ph ph-user-minus" aria-hidden />
          </button>
        )}
        {/* F13.4 — agent: nhật ký lệnh MCP lọc theo agent (F14.3); người: dialog hoạt động */}
        {member.kind === "agent" ? (
          <Link className="btn btn-secondary" href={`/${projectId}/mcp?agent=${encodeURIComponent(member.id)}`}>
            Xem log
          </Link>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={() => setShowLog(true)}>
            Xem log
          </button>
        )}
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
      {editingConfig && member.agentConfig && (
        <AgentConfigDialog member={member} config={member.agentConfig} mcpServers={mcpServers} agents={agents} onClose={() => setEditingConfig(false)} />
      )}
      {removing && (
        <RemoveMemberDialog
          member={member}
          projectId={projectId}
          onClose={() => setRemoving(false)}
          onRemoved={() => {
            setRemoving(false);
            onRemoved();
          }}
        />
      )}
      {showLog && <MemberLogDialog member={member} onClose={() => setShowLog(false)} />}
      {assigning && <AssignTaskDialog member={member} features={assignable} onClose={() => setAssigning(false)} />}
    </aside>
  );
}
