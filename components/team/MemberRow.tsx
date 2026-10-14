import type { Member } from "@/lib/types";
import { initials } from "@/components/work/taskStyle";
import { buttonLikeProps } from "@/components/ui/a11y";

function statusColor(status: string) {
  if (status === "Đang chạy" || status === "Đang làm" || status === "Đang review") return "var(--color-accent)";
  if (status === "Chờ") return "var(--color-neutral-600)";
  return "var(--color-success)";
}

export function MemberRow({
  member,
  selected,
  onSelect,
}: {
  member: Member;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`mrow rowhover${selected ? " is-selected" : ""}`}
      aria-pressed={selected}
      aria-label={`${member.name} — ${member.role}`}
      {...buttonLikeProps(onSelect)}
    >
      <span className={`avatar ${member.kind === "agent" ? "avatar-agent" : "avatar-human"}`} style={{ width: 22, height: 22, fontSize: 9.5 }}>
        {initials(member.name)}
      </span>
      <div className="mrow-name">
        <span className="nowrap">{member.name}</span>
        <span className="mrow-handle nowrap">{member.handle}</span>
      </div>
      <span className={`tag ${member.kind === "agent" ? "tag-accent" : "tag-neutral"} nowrap`}>{member.role}</span>
      <span className="m-skills nowrap">
        {member.skills.map((s) => (
          <span className="tag tag-neutral nowrap" key={s} style={{ marginRight: 4 }}>
            {s}
          </span>
        ))}
      </span>
      <span className="m-current nowrap">{member.current}</span>
      <span className="mrow-status nowrap">
        <span className="status-dot" style={{ background: statusColor(member.status) }} />
        {member.status}
      </span>
    </div>
  );
}
