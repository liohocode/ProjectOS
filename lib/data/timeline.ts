import type { TimelineRow } from "@/lib/types";

// Vị trí (start/len theo tuần T1–T8) không có trong dữ liệu feature gốc —
// bổ sung riêng cho view Timeline. Xem docs/features/02-feature-task.md.
const TIMELINE_BY_PROJECT: Record<string, TimelineRow[]> = {
  "rv-web": [
    { featureId: "FEAT-118", name: "FEAT-118 Listing rework", owner: "Linh", kind: "human", start: 1, len: 5, label: "Dev · 62%" },
    { featureId: "FEAT-119", name: "FEAT-119 Search & filter", owner: "Atlas", kind: "agent", start: 3, len: 4, label: "Agent · 2 task" },
    { featureId: "FEAT-120", name: "FEAT-120 Agent integration", owner: "Vega", kind: "agent", start: 2, len: 3, label: "Review" },
    { featureId: "FEAT-124", name: "FEAT-124 Mobile parity", owner: "Bảo", kind: "agent", start: 5, len: 3, label: "BA đang phân tích" },
    { featureId: null, name: "FEAT-126 Docs index nâng cấp", owner: "Chưa giao", kind: "none", start: 7, len: 2, label: "Chưa bắt đầu" },
  ],
  "rv-app": [
    { featureId: "FEAT-201", name: "FEAT-201 Onboarding lại từ đầu", owner: "Bảo", kind: "agent", start: 1, len: 3, label: "BA đang phân tích" },
    { featureId: "FEAT-205", name: "FEAT-205 Push notification", owner: "Linh", kind: "human", start: 2, len: 4, label: "Dev · 55%" },
    { featureId: "FEAT-208", name: "FEAT-208 Offline cache", owner: "Vega", kind: "agent", start: 4, len: 3, label: "TA · 1 task" },
    { featureId: null, name: "FEAT-212 Đồng bộ thông báo", owner: "Chưa giao", kind: "none", start: 6, len: 2, label: "Chưa bắt đầu" },
  ],
  crm: [
    { featureId: "FEAT-301", name: "FEAT-301 Pipeline deal", owner: "Nam", kind: "human", start: 1, len: 5, label: "Dev · 74%" },
    { featureId: "FEAT-304", name: "FEAT-304 Import dữ liệu khách", owner: "Atlas", kind: "agent", start: 4, len: 3, label: "Review · 88%" },
    { featureId: null, name: "FEAT-309 Báo cáo doanh số", owner: "Chưa giao", kind: "none", start: 6, len: 2, label: "Chưa bắt đầu" },
  ],
};

export async function getTimelineByProject(projectId: string): Promise<TimelineRow[]> {
  return TIMELINE_BY_PROJECT[projectId] ?? [];
}
