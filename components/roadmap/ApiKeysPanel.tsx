"use client";

import { useState, useTransition } from "react";
import { useCan } from "@/components/auth/PermissionsProvider";
import { addApiCredential, revokeApiCredential } from "@/lib/actions/credentials";
import type { ApiCredentialView } from "@/lib/types";

const PROJECT_SCOPE = "";

/**
 * API key của dự án / feature (F29.2, ADR-025) — dùng khi chạy agent từ web (F29.3+). Ai cũng thấy key nào đang gắn
 * (chỉ 4 ký tự cuối); chỉ tech lead gắn / thu hồi. Key đã lưu không bao giờ hiện lại.
 */
export function ApiKeysPanel({
  projectId,
  credentials,
  features,
  encryptionReady,
}: {
  projectId: string;
  credentials: ApiCredentialView[];
  features: { id: string; name: string }[];
  /** Server có MERIDIAN_ENCRYPTION_KEY — không có thì không gắn được */
  encryptionReady: boolean;
}) {
  const canManage = useCan("credential.manage");
  const [adding, setAdding] = useState(false);
  const [scope, setScope] = useState(PROJECT_SCOPE);
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onSuccess?.();
      else setError(result.error ?? "Không thực hiện được");
    });
  }

  return (
    <section className="roadmap-box roadmap-dod" aria-label="API key">
      <h5>
        <i className="ph ph-key" aria-hidden /> API key chạy agent
        {canManage && encryptionReady && !adding && (
          <button type="button" className="btn btn-ghost roadmap-dod-edit" onClick={() => setAdding(true)}>
            Gắn key
          </button>
        )}
      </h5>
      {credentials.length === 0 ? (
        <p className="text-muted roadmap-empty">Chưa gắn key nào — cần khi chạy agent trực tiếp từ web.</p>
      ) : (
        <ul className="apikey-list">
          {credentials.map((c) => (
            <li key={c.id} className="apikey-item">
              <span className="tag tag-neutral nowrap">{c.featureId ? `${c.featureId} · ${c.featureName}` : "Cả dự án"}</span>
              <span className="apikey-label">{c.label}</span>
              <span className="mono text-muted">
                {c.provider} …{c.last4}
              </span>
              <span className="text-muted apikey-meta">
                {c.createdBy} · {c.when}
              </span>
              {canManage && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={isPending}
                  aria-label={`Thu hồi ${c.label}`}
                  onClick={() => run(() => revokeApiCredential(c.id))}
                >
                  Thu hồi
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canManage && !encryptionReady && (
        <p className="text-muted roadmap-empty">Server chưa cấu hình khoá mã hoá (MERIDIAN_ENCRYPTION_KEY) — chưa gắn được key.</p>
      )}
      {adding && (
        <form
          className="dialog-form apikey-form"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => addApiCredential({ projectId, featureId: scope || null, provider: "anthropic", label, key }),
              () => {
                setAdding(false);
                setLabel("");
                setKey("");
                setScope(PROJECT_SCOPE);
              },
            );
          }}
        >
          <label className="apikey-field">
            <span>Phạm vi</span>
            <select className="input" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value={PROJECT_SCOPE}>Cả dự án</option>
              {features.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.id} · {f.name} (ghi đè)
                </option>
              ))}
            </select>
          </label>
          <label className="apikey-field">
            <span>Tên gợi nhớ</span>
            <input className="input" value={label} maxLength={60} placeholder="vd Anthropic — team Web" onChange={(e) => setLabel(e.target.value)} />
          </label>
          <label className="apikey-field">
            <span>API key Anthropic</span>
            <input
              className="input mono"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={key}
              placeholder="sk-ant-…"
              onChange={(e) => setKey(e.target.value)}
            />
          </label>
          <p className="text-muted apikey-hint">Key được mã hoá và không hiện lại sau khi lưu. Gắn key mới cho cùng phạm vi sẽ thu hồi key cũ.</p>
          <div className="dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setAdding(false)} disabled={isPending}>
              Huỷ
            </button>
            <button type="submit" className="btn btn-primary" disabled={isPending || !label.trim() || !key.trim()}>
              {isPending ? "Đang lưu…" : "Lưu key"}
            </button>
          </div>
        </form>
      )}
      {error && (
        <span className="revision-error" role="alert">
          <i className="ph ph-warning-circle" aria-hidden /> {error}
        </span>
      )}
    </section>
  );
}
