"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PermissionAction } from "@/lib/auth/permissions";

// Quyền của người đang đăng nhập trên dự án đang mở (F15.6) — layout tính bằng can() (F15.4) rồi truyền xuống.
// Chỉ để ẩn/khoá nút; server action vẫn tự kiểm tra.
const PermissionsContext = createContext<Record<PermissionAction, boolean> | null>(null);

export function PermissionsProvider({ value, children }: { value: Record<PermissionAction, boolean>; children: ReactNode }) {
  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

/** Ngoài provider (vd test component rời) → coi như được phép, để action tự chặn. */
export function useCan(action: PermissionAction): boolean {
  return useContext(PermissionsContext)?.[action] ?? true;
}
