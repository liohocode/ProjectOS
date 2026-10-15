"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { trapTab } from "./a11y";

/**
 * Dialog dùng chung (.dialog-backdrop/.dialog trong globals.css): Esc hoặc click nền để đóng,
 * focus vào ô nhập đầu tiên khi mở, Tab xoay vòng bên trong, đóng thì trả focus về chỗ cũ.
 */
export function Dialog({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>("input, select, textarea");
    (first ?? ref.current)?.focus();
    return () => opener?.focus?.();
  }, []);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    trapTab(e, ref.current);
  }

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog" ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onKeyDown={onKeyDown}>
        <div className="dialog-head">
          <h5 id={titleId}>{title}</h5>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Đóng">
            <i className="ph ph-x" aria-hidden />
          </button>
        </div>
        {children}
        {footer && <div className="dialog-actions">{footer}</div>}
      </div>
    </div>
  );
}
