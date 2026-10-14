// Bản chụp dữ liệu timeline mock gốc (trước đây ở lib/data/timeline.ts) — nguồn để seed
// ngày kế hoạch của feature (Feature.plannedStart/plannedEnd). Vị trí tính theo tuần T1–T8
// từ ngày bắt đầu sprint hiện tại. featureId null = feature đã lên kế hoạch nhưng chưa giao
// (seed tạo mới feature đó, không owner). Type cục bộ, không import lib/types (ADR-007).

export interface TimelineSeedRow {
  featureId: string | null;
  name: string;
  start: number;
  len: number;
}

export const TIMELINE_BY_PROJECT: Record<string, TimelineSeedRow[]> = {
  "rv-web": [
    { featureId: "FEAT-118", name: "FEAT-118 Listing rework", start: 1, len: 5 },
    { featureId: "FEAT-119", name: "FEAT-119 Search & filter", start: 3, len: 4 },
    { featureId: "FEAT-120", name: "FEAT-120 Agent integration", start: 2, len: 3 },
    { featureId: "FEAT-124", name: "FEAT-124 Mobile parity", start: 5, len: 3 },
    { featureId: null, name: "FEAT-126 Docs index nâng cấp", start: 7, len: 2 },
  ],
  "rv-app": [
    { featureId: "FEAT-201", name: "FEAT-201 Onboarding lại từ đầu", start: 1, len: 3 },
    { featureId: "FEAT-205", name: "FEAT-205 Push notification", start: 2, len: 4 },
    { featureId: "FEAT-208", name: "FEAT-208 Offline cache", start: 4, len: 3 },
    { featureId: null, name: "FEAT-212 Đồng bộ thông báo", start: 6, len: 2 },
  ],
  crm: [
    { featureId: "FEAT-301", name: "FEAT-301 Pipeline deal", start: 1, len: 5 },
    { featureId: "FEAT-304", name: "FEAT-304 Import dữ liệu khách", start: 4, len: 3 },
    { featureId: null, name: "FEAT-309 Báo cáo doanh số", start: 6, len: 2 },
  ],
};
