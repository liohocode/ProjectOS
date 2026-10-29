"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { useUrlDialog } from "@/components/ui/urlDialog";
import { editDoc } from "@/lib/actions/docs";

const FORM_ID = "edit-doc-form";
export const EDIT_DIALOG_PARAM = "edit";

/** Nút "Sửa" ở thân tài liệu — đặt `?edit=1` (ADR-018), page render `EditDocDialog`. */
export function EditDocButton() {
  const { openHref } = useUrlDialog(EDIT_DIALOG_PARAM);
  return (
    <Link href={openHref} scroll={false} className="btn btn-secondary doc-edit-btn">
      <i className="ph ph-pencil-simple" aria-hidden /> Sửa
    </Link>
  );
}

/** Người sửa trực tiếp (F12.6): lưu = áp vào bản chính + tăng version + dòng lịch sử "Đã duyệt bởi <người sửa>". */
export function EditDocDialog({
  projectId,
  docId,
  title,
  version,
  summary,
  markdown,
}: {
  projectId: string;
  docId: string;
  title: string;
  version: string;
  summary: string;
  markdown: string;
}) {
  const { close } = useUrlDialog(EDIT_DIALOG_PARAM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await editDoc({
        docId,
        projectId,
        baseVersion: version,
        what: String(form.get("what") ?? ""),
        summary: String(form.get("summary") ?? ""),
        content: String(form.get("content") ?? ""),
      });
      if (result.ok) close();
      else setError(result.error);
    });
  }

  return (
    <Dialog
      title={`Sửa tài liệu · ${title}`}
      onClose={close}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={close} disabled={isPending}>
            Huỷ
          </button>
          <button type="submit" form={FORM_ID} className="btn btn-primary" disabled={isPending}>
            {isPending ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </>
      }
    >
      <form id={FORM_ID} className="dialog-form" onSubmit={onSubmit}>
        <Field label="Tóm tắt" htmlFor="ed-summary">
          <textarea id="ed-summary" name="summary" className="input textarea" rows={2} required maxLength={2000} defaultValue={summary} />
        </Field>
        <Field label="Nội dung" htmlFor="ed-content" hint="Mỗi dòng “## Tiêu đề” mở một mục; đoạn văn cách nhau bằng dòng trống.">
          <textarea id="ed-content" name="content" className="input textarea textarea-code" rows={14} required defaultValue={markdown} />
        </Field>
        <Field label="Mô tả thay đổi" htmlFor="ed-what" hint={`Tuỳ chọn — hiện trong lịch sử. Lưu sẽ tăng version từ ${version}.`}>
          <input id="ed-what" name="what" className="input" maxLength={300} placeholder="Sửa trực tiếp" />
        </Field>
        {error && (
          <div className="drawer-warning" role="alert">
            <i className="ph ph-warning-circle" aria-hidden /> Không lưu được: {error}
          </div>
        )}
      </form>
    </Dialog>
  );
}
