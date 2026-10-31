import type { Task } from "@/lib/types";
import { initials, stageTagClass, taskRowStyle } from "./taskStyle";
import { buttonLikeProps } from "@/components/ui/a11y";
import { RunningTime } from "@/components/ui/RunningTime";

export function TaskRow({ task, onOpen }: { task: Task; onOpen: () => void }) {
  return (
    <div className="trow rowhover" style={taskRowStyle(task)} aria-label={`${task.id}: ${task.title}`} {...buttonLikeProps(onOpen)}>
      <span className="trow-id nowrap">{task.id}</span>
      <span className={`${stageTagClass(task.stage)} c-stage`}>{task.stage}</span>
      <span className="trow-title">
        {task.code && <span className="trow-code mono">{task.code}</span>}
        {task.title}
        {task.needsDecision && <span className="tag tag-decision trow-decision">Cần quyết định</span>}
      </span>
      <span className={`trow-flag${task.blocked ? " is-blocked" : task.running ? " is-running" : ""}`}>
        {task.blocked && (
          <>
            <i className="ph ph-warning" aria-hidden />
            <span>{task.blocked}</span>
          </>
        )}
        {/* F21.8: còn phụ thuộc chưa xong */}
        {!task.blocked && !task.running && task.stage !== "Done" && task.dependsOn.some((d) => !d.done) && (
          <>
            <i className="ph ph-link" aria-hidden />
            <span>chờ {task.dependsOn.filter((d) => !d.done).map((d) => d.id).join(", ")}</span>
          </>
        )}
        {!task.blocked && task.running && (
          <>
            <i className="ph ph-circle-notch" aria-hidden />
            <span>{task.runningSince ? <RunningTime since={task.runningSince} label={task.running} /> : task.running}</span>
          </>
        )}
      </span>
      <span className="trow-assignee">
        <span className={`avatar ${task.kind === "agent" ? "avatar-agent" : "avatar-human"}`} style={{ width: 18, height: 18, fontSize: 8 }}>
          {initials(task.who)}
        </span>
        <span className="asg-name nowrap">{task.who}</span>
      </span>
      <span className="c-status nowrap">{task.status}</span>
      <span className="c-est nowrap">{task.est}</span>
    </div>
  );
}
