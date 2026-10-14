import type { ReactNode } from "react";

/** Trạng thái rỗng dùng chung: icon Phosphor + tiêu đề + mô tả + hành động tuỳ chọn. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`empty-state${compact ? " empty-state-compact" : ""}`}>
      <i className={`ph ${icon} empty-state-icon`} aria-hidden />
      <div className="empty-state-title">{title}</div>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
