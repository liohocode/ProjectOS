import type { ScreenId } from "@/lib/types";
import type { PermissionAction } from "@/lib/auth/permissions";

export interface ScreenMeta {
  kicker: string;
  title: string;
  searchPlaceholder: string;
  /** Màn không có nút chính (inbox) → bỏ trống */
  primary?: {
    label: string;
    /** true khi page.tsx của màn đã render dialog cho `?new=1` (ADR-018); false → nút chưa hoạt động. */
    dialog: boolean;
    /** Quyền cần để dùng nút chính (F15.6) */
    permission: PermissionAction;
  };
}

export const SCREEN_META: Record<ScreenId, ScreenMeta> = {
  inbox: {
    kicker: "Inbox",
    title: "Cần tôi xử lý",
    searchPlaceholder: "Tìm feature, task, docs…",
  },
  portfolio: {
    kicker: "Portfolio",
    title: "Tất cả dự án đang phát triển",
    searchPlaceholder: "Tìm feature, task, docs…",
    primary: { label: "Dự án mới", dialog: true, permission: "project.create" },
  },
  roadmap: {
    kicker: "Roadmap",
    title: "Kế hoạch theo phase",
    searchPlaceholder: "Tìm feature, task, docs…",
  },
  docs: {
    kicker: "Module 1",
    title: "Docs gắn feature và kho tri thức",
    searchPlaceholder: "Tìm feature, task, docs…",
    primary: { label: "Tài liệu mới", dialog: true, permission: "doc.create" },
  },
  work: {
    kicker: "Module 2",
    title: "Feature · Task · Timeline",
    searchPlaceholder: "Tìm feature, task, docs…",
    primary: { label: "Task mới", dialog: true, permission: "task.write" },
  },
  team: {
    kicker: "Module 3",
    title: "Dev và AI coding agents",
    searchPlaceholder: "Tìm feature, task, docs…",
    primary: { label: "Thêm thành viên", dialog: true, permission: "member.manage" },
  },
  mcp: {
    kicker: "Module 4",
    title: "Kết nối MCP cho agent",
    searchPlaceholder: "Tìm feature, task, docs…",
    primary: { label: "Kết nối server", dialog: true, permission: "mcpServer.manage" },
  },
};

export const NAV_ITEMS: { id: ScreenId; label: string; icon: string }[] = [
  { id: "inbox", label: "Cần tôi xử lý", icon: "ph-tray" },
  { id: "portfolio", label: "Tất cả dự án", icon: "ph-squares-four" },
  { id: "docs", label: "Docs dự án", icon: "ph-files" },
  { id: "roadmap", label: "Roadmap", icon: "ph-flag-banner" },
  { id: "work", label: "Feature & Task", icon: "ph-list-dashes" },
  { id: "team", label: "Dev & AI agents", icon: "ph-users-three" },
  { id: "mcp", label: "MCP", icon: "ph-plugs-connected" },
];
