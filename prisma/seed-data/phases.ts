// Phase của kế hoạch + phụ thuộc giữa feature (F28.1) — dữ liệu mẫu cho rv-web.
export const PHASES_BY_PROJECT: Record<string, { code: string; name: string; goal?: string; features: string[] }[]> = {
  "rv-web": [
    { code: "1", name: "Đăng tin mới", goal: "Người bán đăng tin nhanh, không mất dữ liệu", features: ["FEAT-118", "FEAT-126"] },
    { code: "2", name: "Tìm kiếm & agent", goal: "Bộ lọc nhanh, agent làm việc qua MCP", features: ["FEAT-119", "FEAT-120", "FEAT-124"] },
  ],
};

/** [feature, phụ thuộc] */
export const FEATURE_DEPENDENCIES: [string, string][] = [["FEAT-120", "FEAT-118"]];
