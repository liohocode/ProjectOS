import Link from "next/link";
import { phaseTitle, type PhaseProgress, type TaskPick } from "@/lib/roadmap";
import { EmptyState } from "@/components/ui/EmptyState";
import { stageTagClass } from "@/components/work/taskStyle";

const pct = (done: number, total: number) => (total ? Math.round((done / total) * 100) : 0);

/** Màn Roadmap (F28.4) — server component, chỉ đọc. Thay `docs/ROADMAP.md` khi kế hoạch đã lên DB (F28.5). */
export function RoadmapScreen({ projectId, groups, decisions, next }: { projectId: string; groups: PhaseProgress[]; decisions: TaskPick[]; next: TaskPick[] }) {
  const done = groups.reduce((s, g) => s + g.done, 0);
  const total = groups.reduce((s, g) => s + g.total, 0);
  const taskHref = (id: string) => `/${projectId}/work?task=${id}`;
  const featureHref = (id: string) => `/${projectId}/work/features/${encodeURIComponent(id)}`;

  if (groups.length === 0) {
    return (
      <div className="roadmap-main">
        <EmptyState icon="ph-flag-banner" title="Chưa có kế hoạch" description="Tạo feature (và phase khi import kế hoạch) để xem tiến độ ở đây." />
      </div>
    );
  }

  const pickList = (items: TaskPick[], empty: string) =>
    items.length === 0 ? (
      <p className="text-muted roadmap-empty">{empty}</p>
    ) : (
      <ul className="roadmap-picks">
        {items.map(({ task, feature }) => (
          <li key={task.id}>
            <Link href={taskHref(task.id)} className="roadmap-pick">
              <span className="mono text-muted">{task.code ?? task.id}</span>
              <span className="roadmap-pick-title">{task.title}</span>
              <span className="text-muted nowrap roadmap-pick-feature">{feature.id}</span>
            </Link>
          </li>
        ))}
      </ul>
    );

  return (
    <div className="roadmap-main">
      <div className="roadmap-summary">
        <strong>
          {done}/{total} task xong
        </strong>{" "}
        ({pct(done, total)}%) · {groups.length} phase · {groups.reduce((s, g) => s + g.features.length, 0)} feature
        <div className="frow-progress-track roadmap-total">
          <div className="frow-progress-fill" style={{ width: `${pct(done, total)}%` }} />
        </div>
      </div>

      <div className="roadmap-side">
        <section className="roadmap-box" aria-label="Việc nên nhận tiếp">
          <h5>
            <i className="ph ph-arrow-right" aria-hidden /> Việc nên nhận tiếp
          </h5>
          {pickList(next, "Không còn task nào sẵn sàng — xem quyết định đang mở hoặc phụ thuộc.")}
        </section>
        <section className="roadmap-box" aria-label="Quyết định đang mở">
          <h5>
            <i className="ph ph-question" aria-hidden /> Quyết định đang mở <span className="text-muted">({decisions.length})</span>
          </h5>
          {pickList(decisions, "Không có quyết định nào đang chờ.")}
        </section>
      </div>

      {groups.map((g) => (
        <section className="roadmap-phase" key={g.phase?.id ?? "none"} aria-label={g.phase ? `Phase ${g.phase.code}` : "Chưa xếp phase"}>
          <div className="roadmap-phase-head">
            <h5>{phaseTitle(g.phase)}</h5>
            <span className="text-muted">
              {g.done}/{g.total} task · {pct(g.done, g.total)}%
            </span>
          </div>
          {g.phase?.goal && <p className="roadmap-phase-goal">{g.phase.goal}</p>}
          <ul className="roadmap-features">
            {g.features.map((f) => {
              const fDone = f.tasks.filter((t) => t.stage === "Done").length;
              const waiting = f.dependsOn.filter((d) => d.stage !== "Done");
              return (
                <li key={f.id}>
                  <Link href={featureHref(f.id)} className="roadmap-feature">
                    <span className="mono text-muted roadmap-feature-id">{f.id}</span>
                    <span className="roadmap-feature-name">{f.name}</span>
                    <span className={stageTagClass(f.stage)}>{f.stage}</span>
                    {waiting.length > 0 && <span className="text-muted nowrap roadmap-wait">chờ {waiting.map((d) => d.id).join(", ")}</span>}
                    <span className="frow-progress roadmap-feature-bar">
                      <span className="frow-progress-track">
                        <span className="frow-progress-fill" style={{ width: `${f.pct}%` }} />
                      </span>
                      <span className="frow-pct">
                        {fDone}/{f.tasks.length}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
