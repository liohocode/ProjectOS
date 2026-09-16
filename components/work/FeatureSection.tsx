import type { Feature } from "@/lib/types";
import { TaskRow } from "./TaskRow";
import { initials, stageTagClass } from "./taskStyle";

export function FeatureSection({
  feature,
  open,
  onToggle,
  onOpenTask,
}: {
  feature: Feature;
  open: boolean;
  onToggle: () => void;
  onOpenTask: (taskId: string) => void;
}) {
  return (
    <section className="feature-section">
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
        <span className="avatar avatar-human" style={{ width: 22, height: 22, fontSize: 9.5 }}>
          {initials(feature.owner)}
        </span>
      </div>
      {open && feature.tasks.map((task) => <TaskRow key={task.id} task={task} onOpen={() => onOpenTask(task.id)} />)}
    </section>
  );
}
