import type { Feature, Task, TaskDrawerInfo } from "@/lib/types";
import { initials, stageTagClass } from "./taskStyle";

export function TaskDrawer({
  task,
  feature,
  info,
  onClose,
}: {
  task: Task;
  feature: Feature;
  info: TaskDrawerInfo | undefined;
  onClose: () => void;
}) {
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <span className="trow-id nowrap">{task.id}</span>
          <span className={stageTagClass(task.stage)}>{task.stage}</span>
          <span className={`tag ${task.kind === "agent" ? "tag-accent" : "tag-neutral"} nowrap`}>
            {task.kind === "agent" ? task.who : "Người"}
          </span>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Đóng">
            <i className="ph ph-x" aria-hidden />
          </button>
        </div>
        <h4>{task.title}</h4>

        {task.blocked && <div className="drawer-warning">{task.blockedFull ?? task.blocked}</div>}

        <div className="drawer-meta">
          <div className="drawer-meta-row">
            <span className="drawer-meta-label">Feature</span>
            <span>{feature.name}</span>
          </div>
          <div className="drawer-meta-row">
            <span className="drawer-meta-label">Người/agent</span>
            <span className="trow-assignee">
              <span className={`avatar ${task.kind === "agent" ? "avatar-agent" : "avatar-human"}`} style={{ width: 18, height: 18, fontSize: 8 }}>
                {initials(task.who)}
              </span>
              {task.who}
            </span>
          </div>
          <div className="drawer-meta-row">
            <span className="drawer-meta-label">Stage</span>
            <span>{task.stage}</span>
          </div>
          <div className="drawer-meta-row">
            <span className="drawer-meta-label">Ước lượng</span>
            <span>{task.est}</span>
          </div>
          <div className="drawer-meta-row">
            <span className="drawer-meta-label">Hạn</span>
            <span>{task.due}</span>
          </div>
        </div>

        {info && info.contextDocs.length > 0 && (
          <div className="drawer-section">
            <div className="drawer-section-title">Context agent đã pull</div>
            {info.contextDocs.map((doc) => (
              <div className="drawer-doc-item" key={doc}>
                <i className="ph ph-file-text" aria-hidden /> {doc}
              </div>
            ))}
          </div>
        )}

        {info && info.sessionLog.length > 0 && (
          <div className="drawer-section">
            <div className="drawer-section-title">Log phiên chạy</div>
            {info.sessionLog.map((step, i) => (
              <div className="drawer-log-item" key={i}>
                <span className="drawer-log-dot" />
                <div>
                  <div>{step.text}</div>
                  <div className="drawer-log-when">{step.when}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="drawer-footer">
          <button type="button" className="btn btn-secondary">
            Chuyển stage
          </button>
          <button type="button" className="btn btn-primary">
            Giao cho agent
          </button>
        </div>
      </div>
    </div>
  );
}
