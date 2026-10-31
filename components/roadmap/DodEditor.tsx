"use client";

import { useState, useTransition } from "react";
import { useCan } from "@/components/auth/PermissionsProvider";
import { setDoneDefinition } from "@/lib/actions/projects";

/** Definition of Done của dự án (F22.6) — mọi người xem; tech lead / người tạo dự án sửa (mỗi dòng một mục). */
export function DodEditor({ projectId, items }: { projectId: string; items: string[] }) {
  const canEdit = useCan("feature.manage");
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(items.join("\n"));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="roadmap-box roadmap-dod" aria-label="Definition of Done">
      <h5>
        <i className="ph ph-list-checks" aria-hidden /> Definition of Done
        {canEdit && !editing && (
          <button type="button" className="btn btn-ghost roadmap-dod-edit" onClick={() => setEditing(true)}>
            Sửa
          </button>
        )}
      </h5>
      {editing ? (
        <form
          className="dialog-form"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              const result = await setDoneDefinition(projectId, text);
              if (result.ok) setEditing(false);
              else setError(result.error);
            });
          }}
        >
          <textarea
            className="input"
            rows={5}
            aria-label="Các mục Definition of Done"
            placeholder={"Mỗi dòng một mục, vd:\nCó test cho thay đổi\nPR đã review\nCập nhật tài liệu"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {error && (
            <span className="revision-error" role="alert">
              <i className="ph ph-warning-circle" aria-hidden /> {error}
            </span>
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
      ) : items.length === 0 ? (
        <p className="text-muted roadmap-empty">Chưa có — task sang Done không cần tick thêm mục nào.</p>
      ) : (
        <ul className="roadmap-dod-list">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
