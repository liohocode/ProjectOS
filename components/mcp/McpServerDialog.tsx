"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { createMcpServer, updateMcpServer } from "@/lib/actions/mcpServers";
import type { McpServer } from "@/lib/types";

const FORM_ID = "mcp-server-form";

/** "Kết nối server" (F13.6, mở bằng `?new=1`) hoặc sửa server ngoài (truyền `server`). */
export function McpServerDialog({ server, onClose }: { server?: McpServer; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const input = { name: String(form.get("name") ?? ""), url: String(form.get("url") ?? ""), tools: String(form.get("tools") ?? "") };
    setError(null);
    startTransition(async () => {
      const result = server ? await updateMcpServer(server.id, input) : await createMcpServer(input);
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  return (
    <Dialog
      title={server ? `Sửa server · ${server.name}` : "Kết nối server"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isPending}>
            Huỷ
          </button>
          <button type="submit" form={FORM_ID} className="btn btn-primary" disabled={isPending}>
            {isPending ? "Đang lưu…" : server ? "Lưu" : "Kết nối"}
          </button>
        </>
      }
    >
      <form id={FORM_ID} className="dialog-form" onSubmit={onSubmit}>
        <Field label="Tên server" htmlFor="ms-name">
          <input id="ms-name" name="name" className="input" required maxLength={60} defaultValue={server?.name} placeholder="vd: github-tools" />
        </Field>
        <Field label="URL" htmlFor="ms-url">
          <input id="ms-url" name="url" type="url" className="input" required defaultValue={server?.url} placeholder="https://mcp.example.com/sse" />
        </Field>
        <Field label="Tool" htmlFor="ms-tools" hint="Cách nhau bằng dấu phẩy hoặc xuống dòng">
          <textarea id="ms-tools" name="tools" className="input textarea textarea-code" rows={3} defaultValue={server?.tools.join(", ")} placeholder="repo.read, pr.create" />
        </Field>
        {!server && <p className="field-hint">Server mới ở trạng thái “Giới hạn” cho tới khi Meridian kiểm tra kết nối được.</p>}
        {error && (
          <div className="drawer-warning" role="alert">
            <i className="ph ph-warning-circle" aria-hidden /> Không lưu được: {error}
          </div>
        )}
      </form>
    </Dialog>
  );
}
