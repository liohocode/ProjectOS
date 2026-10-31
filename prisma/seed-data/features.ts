import type { SeedFeature as Feature } from "./types";

const FEATURES_BY_PROJECT: Record<string, Feature[]> = {
  "rv-web": [
    {
      id: "FEAT-118",
      name: "Listing rework",
      stage: "Dev",
      owner: "Trần Mỹ Linh",
      pct: 62,
      docs: 4,
      tasks: [
        { id: "T-401", stage: "Dev", title: "Form đăng tin — bước 1 và 2", who: "Trần Mỹ Linh", kind: "human", status: "Đang làm", est: "5đ", due: "22/08" },
        { id: "T-412", stage: "TA", title: "Chuẩn hoá bảng listing_attributes", who: "Nguyễn Nam", kind: "human", status: "Đang làm", est: "3đ", due: "25/08" },
        { id: "T-418", stage: "Dev", title: "Viết migration cho trường pháp lý", who: "Atlas", kind: "agent", status: "Chờ", est: "2đ", due: "26/08", blocked: "chờ ADR-11", blockedFull: "Bị block: cần ADR-11 chốt cách versioning schema trước khi agent sinh migration." },
        { id: "T-396", stage: "Review", title: "Lưu nháp tự động 30 giây", who: "Atlas", kind: "agent", status: "Chờ review", est: "2đ", due: "20/08", prUrl: "https://github.com/rever/web/pull/412", branch: "feat/T-396-autosave" },
        { id: "T-390", stage: "Done", title: "Trang chi tiết tin — layout mới", who: "Trần Mỹ Linh", kind: "human", status: "Xong", est: "5đ", due: "18/08" },
      ],
    },
    {
      id: "FEAT-119",
      name: "Search & filter",
      stage: "Dev",
      owner: "Atlas",
      pct: 45,
      docs: 3,
      tasks: [
        { id: "T-405", stage: "Dev", title: "Sinh test cho API bộ lọc", who: "Atlas", kind: "agent", status: "Đang chạy", est: "3đ", due: "21/08", running: "chạy 14 phút" },
        { id: "T-407", stage: "Dev", title: "Cache kết quả bộ lọc ở Redis", who: "Vega", kind: "agent", status: "Đang chạy", est: "2đ", due: "22/08", running: "chạy 3 phút" },
        { id: "T-409", stage: "TA", title: "Chốt chỉ số p95 cho bộ lọc", who: "Nguyễn Nam", kind: "human", status: "Đang làm", est: "1đ", due: "21/08" },
      ],
    },
    {
      id: "FEAT-120",
      name: "Agent integration (MCP)",
      stage: "Review",
      owner: "Vega",
      pct: 78,
      docs: 5,
      tasks: [
        { id: "T-399", stage: "Review", title: "Rate limit cho MCP server", who: "Nguyễn Nam", kind: "human", status: "Chờ review", est: "3đ", due: "20/08" },
        { id: "T-388", stage: "Done", title: "Tool docs.append + luồng review", who: "Vega", kind: "agent", status: "Xong", est: "5đ", due: "18/08" },
        { id: "T-402", stage: "Dev", title: "Giới hạn quyền ghi theo role agent", who: "Vega", kind: "agent", status: "Chờ", est: "3đ", due: "24/08", blocked: "thiếu spec role", blockedFull: "Bị block: bảng phân quyền theo role agent chưa được người xác nhận trong MCP tool spec." },
      ],
    },
    {
      id: "FEAT-124",
      name: "Mobile parity",
      stage: "BA",
      owner: "Bảo",
      pct: 12,
      docs: 2,
      tasks: [
        { id: "T-430", stage: "BA", title: "Phân tích yêu cầu và chia feature con", who: "Bảo", kind: "agent", status: "Đang chạy", est: "—", due: "27/08", running: "chạy 6 phút" },
        { id: "T-431", stage: "BA", title: "Đối chiếu tính năng web vs mobile", who: "Bảo", kind: "agent", status: "Chờ", est: "—", due: "28/08" },
      ],
    },
  ],
  "rv-app": [
    {
      id: "FEAT-201",
      name: "Onboarding lại từ đầu",
      stage: "BA",
      owner: "Bảo",
      pct: 20,
      docs: 3,
      tasks: [
        { id: "T-511", stage: "BA", title: "Phân tích drop-off theo bước", who: "Bảo", kind: "agent", status: "Đang chạy", est: "—", due: "24/08", running: "chạy 2 phút" },
        { id: "T-514", stage: "TA", title: "Chốt cấu trúc màn hình onboarding", who: "Vega", kind: "agent", status: "Chờ", est: "2đ", due: "26/08" },
      ],
    },
    {
      id: "FEAT-205",
      name: "Push notification",
      stage: "Dev",
      owner: "Trần Mỹ Linh",
      pct: 55,
      docs: 2,
      tasks: [
        { id: "T-520", stage: "Dev", title: "Đăng ký device token", who: "Trần Mỹ Linh", kind: "human", status: "Đang làm", est: "3đ", due: "23/08" },
        { id: "T-522", stage: "Dev", title: "Sinh test cho service gửi push", who: "Atlas", kind: "agent", status: "Chờ", est: "2đ", due: "25/08", blocked: "chờ khoá FCM", blockedFull: "Bị block: chưa có khoá FCM ở môi trường staging nên agent không chạy được test tích hợp." },
      ],
    },
    {
      id: "FEAT-208",
      name: "Offline cache",
      stage: "TA",
      owner: "Vega",
      pct: 30,
      docs: 2,
      tasks: [
        { id: "T-530", stage: "TA", title: "Chọn chiến lược cache và invalidate", who: "Vega", kind: "agent", status: "Đang chạy", est: "3đ", due: "27/08", running: "chạy 8 phút" },
      ],
    },
  ],
  crm: [
    {
      id: "FEAT-301",
      name: "Pipeline deal",
      stage: "Dev",
      owner: "Nguyễn Nam",
      pct: 74,
      docs: 4,
      tasks: [
        { id: "T-610", stage: "Dev", title: "Kéo thả deal giữa các stage", who: "Nguyễn Nam", kind: "human", status: "Đang làm", est: "5đ", due: "24/08" },
        { id: "T-612", stage: "Review", title: "Refactor query pipeline", who: "Atlas", kind: "agent", status: "Chờ review", est: "3đ", due: "22/08" },
      ],
    },
    {
      id: "FEAT-304",
      name: "Import dữ liệu khách",
      stage: "Review",
      owner: "Atlas",
      pct: 88,
      docs: 3,
      tasks: [
        { id: "T-620", stage: "Review", title: "Validate và map cột CSV", who: "Atlas", kind: "agent", status: "Chờ review", est: "5đ", due: "21/08" },
        { id: "T-624", stage: "Done", title: "Sinh test cho bộ mapping", who: "Atlas", kind: "agent", status: "Xong", est: "2đ", due: "19/08" },
      ],
    },
  ],
};

export async function getFeaturesByProject(projectId: string): Promise<Feature[]> {
  return FEATURES_BY_PROJECT[projectId] ?? [];
}

export async function getTasksByProject(projectId: string) {
  const features = await getFeaturesByProject(projectId);
  return features.flatMap((f) => f.tasks);
}
