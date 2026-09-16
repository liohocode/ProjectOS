import type { ActivityItem } from "@/lib/types";
import { initials } from "./taskStyle";

export function ActivityRail({ items, onClose }: { items: ActivityItem[]; onClose: () => void }) {
  return (
    <aside className="rail">
      <div className="rail-header">
        <span className="rail-title">Agent đang làm gì</span>
        <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Đóng activity feed">
          <i className="ph ph-x" aria-hidden />
        </button>
      </div>
      {items.length === 0 && <p className="text-muted" style={{ fontSize: 12 }}>Chưa có hoạt động nào.</p>}
      {items.map((item, i) => (
        <div className={`rail-item tone-${item.tone}`} key={i}>
          <span
            className={`avatar ${item.kind === "agent" ? "avatar-agent" : "avatar-human"}`}
            style={{ width: 20, height: 20, fontSize: 8.5 }}
          >
            {initials(item.who)}
          </span>
          <div>
            <div className="rail-item-text">{item.text}</div>
            <div className="rail-item-meta">
              {item.tool} · <span className="rail-item-when">{item.when}</span>
            </div>
          </div>
        </div>
      ))}
    </aside>
  );
}
