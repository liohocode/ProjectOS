"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { createAgentToken, loadAgentTokens, revokeAgentToken } from "@/lib/actions/agentTokens";
import type { AgentTokenInfo, Member } from "@/lib/types";

/** Mục "Token MCP" trong panel agent (F15.5) — chỉ tech lead thấy (cùng quyền sửa cấu hình agent). */
export function AgentTokensSection({ member }: { member: Member }) {
  const [tokens, setTokens] = useState<AgentTokenInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<AgentTokenInfo | null>(null);
  const [, startTransition] = useTransition();

  function reload() {
    startTransition(async () => {
      const result = await loadAgentTokens(member.id);
      if (result.ok) {
        setTokens(result.tokens);
        setError(null);
      } else setError(result.error);
    });
  }
  // Tải khi mở panel agent.
  useEffect(reload, [member.id]);

  return (
    <div className="panel-section">
      <div className="panel-section-title panel-section-title-row">
        Token MCP
        <button type="button" className="btn btn-ghost panel-section-action" onClick={() => setCreating(true)}>
          <i className="ph ph-plus" aria-hidden /> Tạo token
        </button>
      </div>
      {tokens === null && !error && <div className="text-muted token-empty">Đang tải…</div>}
      {tokens?.length === 0 && <div className="text-muted token-empty">Chưa có token — agent chưa kết nối được MCP server.</div>}
      {tokens?.map((t) => (
        <div className={`token-row${t.revoked ? " is-revoked" : ""}`} key={t.id}>
          <div className="token-row-main">
            <span className="token-row-name">{t.name}</span>
            <span className="mono text-muted">…{t.lastFour}</span>
          </div>
          <div className="token-row-meta">
            {t.revoked ? "Đã thu hồi" : `Tạo ${t.created} · ${t.lastUsed ? `dùng ${t.lastUsed}` : "chưa dùng"}`}
          </div>
          {!t.revoked && (
            <button type="button" className="btn btn-ghost token-row-revoke" aria-label={`Thu hồi token ${t.name}`} onClick={() => setRevoking(t)}>
              Thu hồi
            </button>
          )}
        </div>
      ))}
      {error && (
        <div className="drawer-warning" role="alert">
          <i className="ph ph-warning-circle" aria-hidden /> {error}
        </div>
      )}
      {creating && (
        <CreateTokenDialog
          member={member}
          onClose={() => {
            setCreating(false);
            reload();
          }}
        />
      )}
      {revoking && (
        <RevokeTokenDialog
          token={revoking}
          onClose={(changed) => {
            setRevoking(null);
            if (changed) reload();
          }}
        />
      )}
    </div>
  );
}

function CreateTokenDialog({ member, onClose }: { member: Member; onClose: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") ?? "");
    startTransition(async () => {
      const result = await createAgentToken(member.id, name);
      if (result.ok) setToken(result.token);
      else setError(result.error);
    });
  }

  return (
    <Dialog
      title={`Tạo token MCP cho ${member.name}`}
      onClose={onClose}
      footer={
        token ? (
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Đã lưu token
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isPending}>
              Huỷ
            </button>
            <button type="submit" form="agent-token-form" className="btn btn-primary" disabled={isPending}>
              {isPending ? "Đang tạo…" : "Tạo token"}
            </button>
          </>
        )
      }
    >
      {token ? (
        <div className="token-reveal">
          <p>Sao chép token ngay — Meridian chỉ lưu bản băm, đóng hộp thoại này là không xem lại được.</p>
          <code className="token-reveal-value mono" aria-label="Token mới">
            {token}
          </code>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigator.clipboard?.writeText(token).then(() => setCopied(true), () => setCopied(false))}
          >
            <i className={`ph ${copied ? "ph-check" : "ph-copy"}`} aria-hidden /> {copied ? "Đã sao chép" : "Sao chép"}
          </button>
        </div>
      ) : (
        <form id="agent-token-form" onSubmit={submit}>
          <Field label="Tên token" htmlFor="token-name" hint="Để nhận ra token, vd máy hoặc công cụ dùng nó">
            <input id="token-name" name="name" className="input" maxLength={60} placeholder="Claude Code trên laptop Hiếu" required />
          </Field>
          {error && (
            <div className="drawer-warning" role="alert">
              <i className="ph ph-warning-circle" aria-hidden /> {error}
            </div>
          )}
        </form>
      )}
    </Dialog>
  );
}

function RevokeTokenDialog({ token, onClose }: { token: AgentTokenInfo; onClose: (changed: boolean) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  return (
    <Dialog
      title={`Thu hồi token ${token.name}?`}
      onClose={() => onClose(false)}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={() => onClose(false)} disabled={isPending}>
            Huỷ
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await revokeAgentToken(token.id);
                if (result.ok) onClose(true);
                else setError(result.error);
              })
            }
          >
            {isPending ? "Đang thu hồi…" : "Thu hồi token"}
          </button>
        </>
      }
    >
      <p>Agent dùng token này sẽ bị từ chối ngay ở lệnh MCP tiếp theo. Không khôi phục được — cần thì tạo token mới.</p>
      {error && (
        <div className="drawer-warning" role="alert">
          <i className="ph ph-warning-circle" aria-hidden /> {error}
        </div>
      )}
    </Dialog>
  );
}
