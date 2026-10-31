"use client";

import Link from "next/link";
import type { ProposedFeature } from "@/lib/types";
import type { InboxRevision, InboxTask } from "@/lib/inbox";
import { RevisionItem } from "@/components/docs/RevisionItem";
import { TaskReviewBox } from "@/components/work/TaskReviewBox";
import { ProposedFeatures } from "@/components/work/ProposedFeatures";
import { EmptyState } from "@/components/ui/EmptyState";

/** Inbox "Cần tôi xử lý" (F25.2): gom việc chờ duyệt của dự án — duyệt / trả lại tại chỗ. */
export function InboxScreen({
  projectId,
  revisions,
  reviewTasks,
  proposals,
  blockedTasks,
  canReviewAnything,
  doneDefinition = [],
}: {
  projectId: string;
  revisions: InboxRevision[];
  reviewTasks: InboxTask[];
  proposals: ProposedFeature[];
  blockedTasks: InboxTask[];
  /** Người dùng có ít nhất một quyền duyệt — không thì giải thích vì sao inbox chỉ có task bị block. */
  canReviewAnything: boolean;
  /** Definition of Done của dự án (F22.6) */
  doneDefinition?: string[];
}) {
  const total = revisions.length + reviewTasks.length + proposals.length + blockedTasks.length;
  const taskHref = (id: string) => `/${projectId}/work?task=${id}`;

  return (
    <div className="inbox-main">
      <p className="inbox-summary">
        {total > 0 ? `${total} việc đang chờ` : "Không có việc nào đang chờ"}
        {!canReviewAnything && " · bạn chưa có quyền duyệt ở dự án này nên chỉ thấy task bị block"}
      </p>

      {total === 0 && (
        <EmptyState
          icon="ph-tray"
          title="Đã xử lý hết"
          description="Revision tài liệu, task chờ review, feature agent đề xuất và task bị block sẽ hiện ở đây."
        />
      )}

      {reviewTasks.length > 0 && (
        <section className="inbox-section" aria-label="Task chờ review">
          <h5 className="inbox-section-title">
            <i className="ph ph-seal-check" aria-hidden /> Task chờ review <span className="text-muted">({reviewTasks.length})</span>
          </h5>
          {reviewTasks.map((t) => (
            <div className="inbox-item" key={t.id}>
              <TaskLine task={t} href={taskHref(t.id)} />
              <TaskReviewBox taskId={t.id} compact doneDefinition={doneDefinition} />
            </div>
          ))}
        </section>
      )}

      {revisions.length > 0 && (
        <section className="inbox-section" aria-label="Revision chờ duyệt">
          <h5 className="inbox-section-title">
            <i className="ph ph-files" aria-hidden /> Revision tài liệu chờ duyệt <span className="text-muted">({revisions.length})</span>
          </h5>
          {revisions.map((rev) => (
            <div className="inbox-item" key={rev.id}>
              <Link href={`/${projectId}/docs?doc=${rev.docId}`} className="inbox-item-link">
                <i className="ph ph-file-text" aria-hidden /> {rev.docTitle}
              </Link>
              <RevisionItem rev={rev} projectId={projectId} />
            </div>
          ))}
        </section>
      )}

      {proposals.length > 0 && (
        <div className="inbox-section">
          <ProposedFeatures proposals={proposals} />
        </div>
      )}

      {blockedTasks.length > 0 && (
        <section className="inbox-section" aria-label="Task bị block">
          <h5 className="inbox-section-title">
            <i className="ph ph-warning" aria-hidden /> Task bị block <span className="text-muted">({blockedTasks.length})</span>
          </h5>
          {blockedTasks.map((t) => (
            <div className="inbox-item" key={t.id}>
              <TaskLine task={t} href={taskHref(t.id)} />
              <span className="inbox-blocked">{t.blocked}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function TaskLine({ task, href }: { task: InboxTask; href: string }) {
  return (
    <Link href={href} className="inbox-task">
      <span className="mono text-muted">{task.id}</span>
      <span className="inbox-task-title">{task.title}</span>
      <span className={`tag ${task.kind === "agent" ? "tag-accent" : "tag-neutral"} nowrap`}>{task.who}</span>
      <span className="inbox-task-meta">
        {task.featureId} · {task.featureName}
        {task.since && ` · vào Review ${task.since.toLowerCase()}`}
      </span>
    </Link>
  );
}
