"use client";

import { useMemo, useState } from "react";
import type { Member } from "@/lib/types";
import { PipelineCards } from "./PipelineCards";
import { MemberRow } from "./MemberRow";
import { MemberPanel } from "./MemberPanel";
import type { AssignableFeature } from "./AssignTaskDialog";
import { EmptyState } from "@/components/ui/EmptyState";

type Filter = "all" | "human" | "agent" | "org";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Dự án này" },
  { id: "human", label: "Người" },
  { id: "agent", label: "AI agent" },
  { id: "org", label: "Toàn tổ chức" },
];

export function TeamScreen({
  pipeline,
  projectTeam,
  orgTeam,
  defaultSelectedId,
  assignable,
}: {
  pipeline: { stage: string; agent: Member }[];
  projectTeam: Member[];
  orgTeam: Member[];
  defaultSelectedId: string | null;
  assignable: AssignableFeature[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(defaultSelectedId);

  const shown = useMemo(() => {
    const source = filter === "org" ? orgTeam : projectTeam;
    if (filter === "all" || filter === "org") return source;
    return source.filter((m) => m.kind === filter);
  }, [filter, orgTeam, projectTeam]);

  const selected = orgTeam.find((m) => m.id === selectedId) ?? shown[0];

  return (
    <div className="team-shell">
      <div className="team-main">
        <PipelineCards pipeline={pipeline} />

        <div className="team-toolbar">
          <div className="seg">
            {FILTERS.map((f) => (
              <label className="seg-opt" key={f.id}>
                <input type="radio" checked={filter === f.id} onChange={() => setFilter(f.id)} />
                {f.label}
              </label>
            ))}
          </div>
          <span className="team-toolbar-note">{shown.length} thành viên</span>
        </div>

        {shown.length === 0 ? (
          <EmptyState
            icon="ph-users-three"
            title={filter === "all" ? "Dự án chưa có thành viên nào" : "Không có thành viên nào khớp bộ lọc"}
            description={filter === "org" ? "Tổ chức chưa có thành viên." : "Chọn \"Toàn tổ chức\" để xem mọi người và agent."}
          />
        ) : (
          <div className="member-list">
            {shown.map((member) => (
              <MemberRow key={member.id} member={member} selected={member.id === selected?.id} onSelect={() => setSelectedId(member.id)} />
            ))}
          </div>
        )}
      </div>

      {selected && <MemberPanel key={selected.id} member={selected} inProject={projectTeam.some((m) => m.id === selected.id)} assignable={assignable} />}
    </div>
  );
}
