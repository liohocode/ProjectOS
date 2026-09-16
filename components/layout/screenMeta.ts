import type { ScreenId } from "@/lib/types";

export interface ScreenMeta {
  kicker: string;
  title: string;
  searchPlaceholder: string;
  primaryAction: string;
}

export const SCREEN_META: Record<ScreenId, ScreenMeta> = {
  portfolio: {
    kicker: "Portfolio",
    title: "Tất cả dự án đang phát triển",
    searchPlaceholder: "Tìm feature, task, docs…",
    primaryAction: "Dự án mới",
  },
  docs: {
    kicker: "Module 1",
    title: "Docs gắn feature và kho tri thức",
    searchPlaceholder: "Tìm feature, task, docs…",
    primaryAction: "Tài liệu mới",
  },
  work: {
    kicker: "Module 2",
    title: "Feature · Task · Timeline",
    searchPlaceholder: "Tìm feature, task, docs…",
    primaryAction: "Task mới",
  },
  team: {
    kicker: "Module 3",
    title: "Dev và AI coding agents",
    searchPlaceholder: "Tìm feature, task, docs…",
    primaryAction: "Thêm thành viên",
  },
  mcp: {
    kicker: "Module 4",
    title: "Kết nối MCP cho agent",
    searchPlaceholder: "Tìm feature, task, docs…",
    primaryAction: "Kết nối server",
  },
};

export const NAV_ITEMS: { id: ScreenId; label: string; icon: string }[] = [
  { id: "portfolio", label: "Tất cả dự án", icon: "ph-squares-four" },
  { id: "docs", label: "Docs dự án", icon: "ph-files" },
  { id: "work", label: "Feature & Task", icon: "ph-list-dashes" },
  { id: "team", label: "Dev & AI agents", icon: "ph-users-three" },
  { id: "mcp", label: "MCP", icon: "ph-plugs-connected" },
];
