import { Fragment } from "react";
import type { TimelineRow } from "@/lib/types";

const WEEKS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"];

export function TimelineView({ rows }: { rows: TimelineRow[] }) {
  return (
    <div>
      <div className="timeline-grid">
        <div />
        {WEEKS.map((w) => (
          <div className="timeline-week-label" key={w}>
            {w}
          </div>
        ))}
        {rows.map((row, i) => (
          <Fragment key={row.name}>
            <div className="timeline-row-label" style={{ gridColumn: 1, gridRow: i + 2 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  flex: "none",
                  borderRadius: "50%",
                  background: row.kind === "none" ? "var(--color-neutral-700)" : "var(--color-accent)",
                }}
              />
              <span>{row.name}</span>
              <span className="timeline-row-owner">· {row.owner}</span>
            </div>
            <div
              className="timeline-bar-cell"
              style={{ gridColumn: `${row.start + 1} / span ${row.len}`, gridRow: i + 2 }}
            >
              <div className={`timeline-bar kind-${row.kind}`}>{row.label}</div>
            </div>
          </Fragment>
        ))}
      </div>
      <div className="timeline-legend">
        <span className="timeline-legend-item">
          <span className="timeline-legend-dot" style={{ background: "var(--color-accent-600)" }} /> Người thực hiện
        </span>
        <span className="timeline-legend-item">
          <span
            className="timeline-legend-dot"
            style={{ background: "color-mix(in srgb, var(--color-accent) 12%, transparent)", boxShadow: "inset 0 0 0 1px var(--color-accent)" }}
          />{" "}
          AI agent
        </span>
        <span className="timeline-legend-item">
          <span className="timeline-legend-dot" style={{ background: "var(--color-neutral-800)" }} /> Chưa bắt đầu
        </span>
      </div>
    </div>
  );
}
