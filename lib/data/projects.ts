import type { Project } from "@/lib/types";

const PROJECTS: Project[] = [
  {
    id: "rv-web",
    code: "RV",
    name: "Rever Web v3",
    status: "Đang chạy",
    desc: "Làm lại luồng đăng tin, bộ lọc và tích hợp MCP cho agent.",
    sprint: "Sprint 14 · 12–26/08",
  },
  {
    id: "rv-app",
    code: "MA",
    name: "Rever Mobile App",
    status: "Đang chạy",
    desc: "Đưa các tính năng web lên app, ưu tiên onboarding và thông báo.",
    sprint: "Sprint 9 · 11–25/08",
  },
  {
    id: "crm",
    code: "CR",
    name: "Agent CRM nội bộ",
    status: "Chuẩn bị release",
    desc: "CRM cho sales, đang ở giai đoạn hoàn thiện import dữ liệu.",
    sprint: "Sprint 22 · 18/08–01/09",
  },
];

export async function getProjects(): Promise<Project[]> {
  return PROJECTS;
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  return PROJECTS.find((p) => p.id === id);
}
