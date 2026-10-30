"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { deleteMcpServer } from "@/lib/actions/mcpServers";
import type { McpServer } from "@/lib/types";
import { McpServerDialog } from "./McpServerDialog";
import { useCan } from "@/components/auth/PermissionsProvider";

/** Sửa / xoá server ngoài trên thẻ (F13.6). Server nội bộ không có nút. */
export function ServerCardActions({ server }: { server: McpServer }) {
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const allowed = useCan("mcpServer.manage");
  const close = () => {
    setMode(null);
    setError(null);
  };

  if (!allowed) return null;
  return (
    <>
      <div className="mcp-server-actions">
        <button type="button" className="btn btn-ghost" aria-label={`Sửa ${server.name}`} onClick={() => setMode("edit")}>
          <i className="ph ph-pencil-simple" aria-hidden />
        </button>
        <button type="button" className="btn btn-ghost" aria-label={`Xoá ${server.name}`} onClick={() => setMode("delete")}>
          <i className="ph ph-trash" aria-hidden />
        </button>
      </div>
      {mode === "edit" && <McpServerDialog server={server} onClose={close} />}
      {mode === "delete" && (
        <Dialog
          title={`Xoá server ${server.name}?`}
          onClose={close}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={close} disabled={isPending}>
                Huỷ
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteMcpServer(server.id);
                    if (result.ok) close();
                    else setError(result.error);
                  })
                }
              >
                {isPending ? "Đang xoá…" : "Xoá server"}
              </button>
            </>
          }
        >
          <p>Agent đang cấu hình dùng server này sẽ bị gỡ khỏi danh sách MCP server của chúng.</p>
          {error && (
            <div className="drawer-warning" role="alert">
              <i className="ph ph-warning-circle" aria-hidden /> {error}
            </div>
          )}
        </Dialog>
      )}
    </>
  );
}
