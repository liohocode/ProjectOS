import type { ProjectQuality } from "@/lib/data/quality";
import { formatDuration, formatRate } from "@/lib/qualityMetrics";
import { QualitySprintFilter } from "./QualitySprintFilter";

/** Chỉ số chất lượng của dự án đang mở (F22.5) — server component, tính từ lịch sử chuyển trạng thái. */
export function QualityPanel({
  projectName,
  quality,
  sprints = [],
  sprintId = "",
}: {
  projectName: string;
  quality: ProjectQuality;
  /** F22.7: lọc theo sprint */
  sprints?: { id: string; label: string }[];
  sprintId?: string;
}) {
  const { project, byMember } = quality;
  return (
    <section className="quality-panel" aria-label="Chỉ số chất lượng">
      <div className="quality-head">
        <h5 className="quality-title">
          <i className="ph ph-gauge" aria-hidden /> Chất lượng — {projectName}
        </h5>
        {sprints.length > 0 && <QualitySprintFilter sprints={sprints} value={sprintId} />}
      </div>
      <div className="quality-stats">
        <Stat label="Cycle time trung vị (Dev → Done)" value={formatDuration(project.medianCycleMs)} hint={`${project.measured} task có số liệu`} />
        <Stat label="Tỉ lệ bị trả lại sau review" value={formatRate(project.returnRate)} hint={`${project.returnedTasks}/${project.reviewed} task đã qua Review`} />
        <Stat label="Tổng số lần trả lại" value={String(project.totalReturns)} />
        <Stat label="Thời gian bị block" value={formatDuration(project.totalBlockedMs || null)} hint={`${project.blockedTasks} task từng bị block`} />
      </div>
      {byMember.length === 0 ? (
        <p className="quality-empty">Chưa có task nào qua Review từ khi Meridian ghi lịch sử trạng thái — số liệu sẽ có khi task đi qua cổng review.</p>
      ) : (
        <div className="quality-table">
          <table className="table">
            <thead>
              <tr>
                <th>Người / agent</th>
                <th>Cycle time trung vị</th>
                <th>Task đã qua Review</th>
                <th>Bị trả lại</th>
                <th>Bị block</th>
              </tr>
            </thead>
            <tbody>
              {byMember.map((r) => (
                <tr key={r.memberId}>
                  <td>
                    {r.name} {r.kind === "agent" && <span className="tag tag-accent">agent</span>}
                  </td>
                  <td>{formatDuration(r.summary.medianCycleMs)}</td>
                  <td>{r.summary.reviewed}</td>
                  <td>
                    {formatRate(r.summary.returnRate)} <span className="text-muted">({r.summary.totalReturns} lần)</span>
                  </td>
                  <td>{formatDuration(r.summary.totalBlockedMs || null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="quality-note">Tính từ lịch sử chuyển trạng thái và lịch sử block (có từ 31/10/2026); task cũ không có lịch sử không được tính. Block chưa gỡ tính tới hiện tại.</p>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="quality-stat">
      <div className="quality-stat-value">{value}</div>
      <div className="quality-stat-label">{label}</div>
      {hint && <div className="quality-stat-hint">{hint}</div>}
    </div>
  );
}
