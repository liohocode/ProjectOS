"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { useCan } from "@/components/auth/PermissionsProvider";
import { Field } from "@/components/ui/Field";
import { Markdown } from "@/components/ui/Markdown";
import { setFeatureArchived, updateFeatureContent } from "@/lib/actions/features";
import { moveTask } from "@/lib/actions/tasks";
import type { ActionResult } from "@/lib/actions/result";
import { MoveButtons } from "./MoveButtons";
import type { FeatureDetail } from "@/lib/data/features";
import { initials, stageTagClass } from "./taskStyle";

/** Trang chi tiết feature (F21.9). Nội dung markdown sửa được bởi tech lead / người tạo dự án (`feature.manage`). */
export function FeatureDetailView({ projectId, detail }: { projectId: string; detail: FeatureDetail }) {
  const { feature, goal, scope, notes, docs } = detail;
  const canEdit = useCan("feature.manage");
  const canWrite = useCan("task.write");
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const done = feature.tasks.filter((t) => t.stage === "Done").length;

  function run(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onSuccess?.();
      else setError(result.error);
    });
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const value = (k: string) => String(data.get(k) ?? "");
    setError(null);
    startTransition(async () => {
      const result = await updateFeatureContent(feature.id, { goal: value("goal"), scope: value("scope"), notes: value("notes") });
      if (result.ok) setEditing(false);
      else setError(result.error);
    });
  }

  return (
    <div className="feature-detail">
      <Link href={`/${projectId}/work`} className="feature-back">
        <i className="ph ph-arrow-left" aria-hidden /> Feature & Task
      </Link>
      <div className="feature-detail-head">
        <span className="trow-id nowrap">{feature.id}</span>
        <h4>{feature.name}</h4>
        <span className={stageTagClass(feature.stage)}>{feature.stage}</span>
        {canEdit && !editing && !feature.archived && (
          <span className="feature-edit">
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
              <i className="ph ph-pencil-simple" aria-hidden /> Sửa nội dung
            </button>{" "}
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmArchive(true)} disabled={isPending}>
              <i className="ph ph-archive" aria-hidden /> Lưu trữ
            </button>
          </span>
        )}
      </div>
      {feature.archived && (
        <div className="drawer-warning drawer-archived" role="status">
          <i className="ph ph-archive" aria-hidden /> Feature đã lưu trữ — feature và task của nó không hiện trong danh sách, timeline, inbox và MCP.
          {canEdit && (
            <button type="button" className="btn btn-secondary" disabled={isPending} onClick={() => run(() => setFeatureArchived(feature.id, false))}>
              Khôi phục
            </button>
          )}
        </div>
      )}
      {confirmArchive && !feature.archived && (
        <div className="drawer-section" role="region" aria-label="Lưu trữ feature">
          <div className="drawer-section-title">Lưu trữ {feature.id}?</div>
          <p className="review-box-hint">Feature và {feature.tasks.length} task của nó sẽ ẩn khỏi danh sách, timeline, inbox và MCP; lịch sử giữ nguyên. Khôi phục được từ trang này.</p>
          <div className="dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmArchive(false)} disabled={isPending}>
              Huỷ
            </button>
            <button type="button" className="btn btn-primary" disabled={isPending} onClick={() => run(() => setFeatureArchived(feature.id, true), () => setConfirmArchive(false))}>
              Lưu trữ
            </button>
          </div>
        </div>
      )}
      {error && !editing && (
        <div className="drawer-warning" role="alert">
          <i className="ph ph-warning-circle" aria-hidden /> {error}
        </div>
      )}
      <div className="feature-detail-meta">
        <span>
          <span className={`avatar ${feature.ownerKind ? `avatar-${feature.ownerKind}` : "avatar-none"}`} style={{ width: 18, height: 18, fontSize: 8 }}>
            {feature.ownerKind ? initials(feature.owner) : <i className="ph ph-user" aria-hidden />}
          </span>{" "}
          {feature.owner}
        </span>
        <span>
          {feature.pct}% · {done}/{feature.tasks.length} task xong
        </span>
        {feature.plannedStart && feature.plannedEnd && (
          <span>
            Kế hoạch {feature.plannedStart} → {feature.plannedEnd}
          </span>
        )}
      </div>

      {editing ? (
        <form className="dialog-form feature-content-form" onSubmit={onSubmit} aria-label="Sửa nội dung feature">
          <Field label="Mục tiêu (markdown)" htmlFor="fd-goal">
            <textarea id="fd-goal" name="goal" className="input" rows={4} maxLength={10_000} defaultValue={goal ?? ""} />
          </Field>
          <Field label="Phạm vi (markdown)" htmlFor="fd-scope" hint="Trong / ngoài phạm vi">
            <textarea id="fd-scope" name="scope" className="input" rows={5} maxLength={10_000} defaultValue={scope ?? ""} />
          </Field>
          <Field label="Quyết định / ghi chú (markdown)" htmlFor="fd-notes" hint="Quyết định phát sinh, lệch spec, việc mới phát hiện">
            <textarea id="fd-notes" name="notes" className="input" rows={8} maxLength={50_000} defaultValue={notes ?? ""} />
          </Field>
          {error && (
            <div className="drawer-warning" role="alert">
              <i className="ph ph-warning-circle" aria-hidden /> Không lưu được: {error}
            </div>
          )}
          <div className="dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)} disabled={isPending}>
              Huỷ
            </button>
            <button type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending ? "Đang lưu…" : "Lưu"}
            </button>
          </div>
        </form>
      ) : (
        <>
          <ContentSection title="Mục tiêu" body={goal} />
          <ContentSection title="Phạm vi" body={scope} />
        </>
      )}

      <section className="feature-detail-section" aria-label="Task của feature">
        <h5>Task ({feature.tasks.length})</h5>
        {feature.tasks.length === 0 ? (
          <p className="text-muted feature-empty">Chưa có task.</p>
        ) : (
          <ul className="feature-task-list">
            {feature.tasks.map((t) => (
              <li key={t.id} className="feature-task-row">
                {canWrite && !feature.archived && <MoveButtons label={t.id} onMove={(dir) => moveTask(t.id, dir)} />}
                <Link href={`/${projectId}/work?task=${t.id}`} className="feature-task">
                  <span className="mono text-muted">{t.id}</span>
                  {t.code && <span className="mono text-muted">{t.code}</span>}
                  <span className={stageTagClass(t.stage)}>{t.stage}</span>
                  <span className="feature-task-title">{t.title}</span>
                  {t.size && <span className="tag tag-neutral">{t.size}</span>}
                  {t.needsDecision && <span className="tag tag-decision">Cần quyết định</span>}
                  <span className="text-muted nowrap">{t.who}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="feature-detail-section" aria-label="Tài liệu của feature">
        <h5>Tài liệu ({docs.length})</h5>
        {docs.length === 0 ? (
          <p className="text-muted feature-empty">Chưa có tài liệu gắn feature này.</p>
        ) : (
          <ul className="feature-task-list">
            {docs.map((d) => (
              <li key={d.id}>
                <Link href={`/${projectId}/docs?doc=${d.id}`} className="feature-task">
                  <i className="ph ph-file-text" aria-hidden />
                  <span className="feature-task-title">{d.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!editing && <ContentSection title="Quyết định / ghi chú" body={notes} />}
    </div>
  );
}

function ContentSection({ title, body }: { title: string; body: string | null }) {
  return (
    <section className="feature-detail-section" aria-label={title}>
      <h5>{title}</h5>
      {body ? <Markdown>{body}</Markdown> : <p className="text-muted feature-empty">Chưa có.</p>}
    </section>
  );
}
