import type { DocBody } from "@/lib/types";
import { ApproveButton } from "./ApproveButton";

export function DocBodyView({ body, projectId }: { body: DocBody; projectId: string }) {
  return (
    <div className="doc-body-area">
      <div className="doc-body-inner">
        <div className="doc-meta-row">
          <span className="tag tag-neutral nowrap">{body.version}</span>
          <span className="tag tag-outline nowrap">{body.status}</span>
          <span>
            Sửa lần cuối {body.updated} · {body.author}
          </span>
        </div>
        <h3>{body.title}</h3>
        <p className="text-muted">{body.summary}</p>

        <div className="doc-info-cards">
          <div className="doc-info-card">
            <div className="doc-info-card-label">Gắn với feature</div>
            <div className="doc-info-card-value" style={{ color: "var(--color-accent-300)" }}>
              {body.feature}
            </div>
          </div>
          <div className="doc-info-card">
            <div className="doc-info-card-label">Trạng thái index</div>
            <div className="doc-info-card-value">{body.indexed}</div>
          </div>
          <div className="doc-info-card">
            <div className="doc-info-card-label">Agent đã đọc</div>
            <div className="doc-info-card-value">{body.readBy}</div>
          </div>
        </div>

        {body.sections.map((section) => (
          <div className="doc-section" key={section.heading}>
            <h5>{section.heading}</h5>
            {section.paras.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ))}

        <div className="revision-block">
          <h6 style={{ marginBottom: "var(--space-2)" }}>Revision chờ duyệt và lịch sử</h6>
          {body.history.map((rev) => (
            <div className="revision-row" key={rev.id}>
              <span className={`tag ${rev.agent ? "tag-accent" : "tag-neutral"} nowrap revision-tag`}>{rev.who}</span>
              <span className="revision-what">{rev.what}</span>
              <span className="revision-when">{rev.when}</span>
              {rev.status === "pending" && <ApproveButton revisionId={rev.id} projectId={projectId} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
