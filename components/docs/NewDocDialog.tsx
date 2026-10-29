"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { useUrlDialog } from "@/components/ui/urlDialog";
import { createDoc } from "@/lib/actions/docs";

const FORM_ID = "new-doc-form";
const CONTENT_PLACEHOLDER = "## Bối cảnh\nVì sao cần tài liệu này…\n\n## Phạm vi\nTrong / ngoài phạm vi…";

/** "Tài liệu mới" (F12.5) — mở bằng `?new=1` (ADR-018); tạo xong chuyển sang `?doc=<id>`. */
export function NewDocDialog({ projectId, features }: { projectId: string; features: { id: string; name: string }[] }) {
  const router = useRouter();
  const { close } = useUrlDialog();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await createDoc({
        projectId,
        featureId: String(form.get("featureId") ?? ""),
        title: String(form.get("title") ?? ""),
        summary: String(form.get("summary") ?? ""),
        content: String(form.get("content") ?? ""),
      });
      if (result.ok) router.push(`/${projectId}/docs?doc=${encodeURIComponent(result.docId)}`, { scroll: false });
      else setError(result.error);
    });
  }

  return (
    <Dialog
      title="Tài liệu mới"
      onClose={close}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={close} disabled={isPending}>
            Huỷ
          </button>
          <button type="submit" form={FORM_ID} className="btn btn-primary" disabled={isPending}>
            {isPending ? "Đang tạo…" : "Tạo tài liệu"}
          </button>
        </>
      }
    >
      <form id={FORM_ID} className="dialog-form" onSubmit={onSubmit}>
        <Field label="Tiêu đề" htmlFor="nd-title">
          <input id="nd-title" name="title" className="input" required maxLength={200} placeholder="vd: Đặc tả thanh toán" />
        </Field>
        <Field label="Gắn với feature" htmlFor="nd-feature">
          <select id="nd-feature" name="featureId" className="input" defaultValue="">
            <option value="">Kho tri thức chung</option>
            {features.map((f) => (
              <option key={f.id} value={f.id}>
                {f.id} · {f.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tóm tắt" htmlFor="nd-summary">
          <textarea id="nd-summary" name="summary" className="input textarea" rows={2} required maxLength={2000} />
        </Field>
        <Field label="Nội dung" htmlFor="nd-content" hint="Mỗi dòng “## Tiêu đề” mở một mục; đoạn văn cách nhau bằng dòng trống.">
          <textarea id="nd-content" name="content" className="input textarea textarea-code" rows={10} required placeholder={CONTENT_PLACEHOLDER} />
        </Field>
        {error && (
          <div className="drawer-warning" role="alert">
            <i className="ph ph-warning-circle" aria-hidden /> Không tạo được: {error}
          </div>
        )}
      </form>
    </Dialog>
  );
}
