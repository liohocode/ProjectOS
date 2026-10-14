"use client";

import { useEffect } from "react";
// Message khớp DB_UNAVAILABLE_MESSAGE trong lib/dbErrors.ts (không import vì file đó dành cho server).

// Lỗi mất kết nối Postgres (container chưa chạy / sai DATABASE_URL). Ở production Next ẩn
// message lỗi server (chỉ còn digest) → chỉ nhận diện được khi chạy dev.
const DB_DOWN = /DB_UNAVAILABLE/;

export function ErrorState({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const dbDown = DB_DOWN.test(error.message);

  return (
    <div className="error-state" role="alert">
      <i className={`ph ${dbDown ? "ph-database" : "ph-warning-circle"} error-state-icon`} aria-hidden />
      <h4>{dbDown ? "Chưa kết nối được database" : "Có lỗi khi tải trang này"}</h4>
      {dbDown ? (
        <p className="text-muted">
          Postgres chưa chạy hoặc <code>DATABASE_URL</code> sai. Ở máy dev, chạy <code>docker compose up -d</code> rồi bấm
          &quot;Thử lại&quot;.
        </p>
      ) : (
        <p className="text-muted">Thử tải lại. Nếu vẫn lỗi, báo cho team kèm mã lỗi bên dưới.</p>
      )}
      <div className="error-state-actions">
        <button type="button" className="btn btn-primary" onClick={() => retry()}>
          <i className="ph ph-arrows-clockwise" aria-hidden /> Thử lại
        </button>
      </div>
      {error.digest && <p className="error-state-digest">Mã lỗi: {error.digest}</p>}
    </div>
  );
}
