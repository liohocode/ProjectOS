"use client";

import { useCan } from "@/components/auth/PermissionsProvider";
import { Markdown } from "@/components/ui/Markdown";
import { approveTaskProposal, rejectTaskProposal } from "@/lib/actions/features";
import type { ProposedTask } from "@/lib/types";
import { ProposalRow } from "./ProposedFeatures";

/** "Task đề xuất — chờ duyệt" (F24.2): agent chia task qua MCP `tasks_create`; tech lead / người tạo dự án duyệt → thành task thật. */
export function ProposedTasks({ proposals, showFeature = true }: { proposals: ProposedTask[]; showFeature?: boolean }) {
  const canReview = useCan("feature.review");
  if (proposals.length === 0) return null;
  return (
    <section className="proposals" aria-label="Task đề xuất — chờ duyệt">
      <div className="proposals-title">
        <i className="ph ph-list-plus" aria-hidden /> Task đề xuất — chờ duyệt <span className="text-muted">({proposals.length})</span>
      </div>
      {proposals.map((p) => (
        <ProposalRow
          key={p.id}
          id={p.id}
          label={p.featureId}
          name={p.title}
          proposedBy={p.proposedBy}
          when={p.when}
          canReview={canReview}
          rejectLabel="Từ chối task"
          onApprove={() => approveTaskProposal(p.id)}
          onReject={(reason) => rejectTaskProposal(p.id, reason)}
        >
          <span className="proposal-meta text-muted">
            {[showFeature && p.featureName, p.stage, p.size && `cỡ ${p.size}`, `làm: ${p.assignee ?? p.proposedBy}`].filter(Boolean).join(" · ")}
          </span>
          {p.description && <Markdown className="proposal-desc">{p.description}</Markdown>}
          {p.criteria.length > 0 && (
            <ul className="proposal-criteria" aria-label="Tiêu chí hoàn thành">
              {p.criteria.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
        </ProposalRow>
      ))}
    </section>
  );
}
