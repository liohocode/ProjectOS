// Cấu hình agent có cấu trúc (F13.5) ↔ các dòng hiển thị ở panel thành viên. Thuần — dùng chung cho seed và lib/data.

export const DOCS_WRITE_PERMISSIONS = ["read_only", "append_review", "append_edit_spec"] as const;
export type DocsWritePermission = (typeof DOCS_WRITE_PERMISSIONS)[number];

export const DOCS_WRITE_LABEL: Record<DocsWritePermission, string> = {
  read_only: "Chỉ đọc",
  append_review: "Append (chờ review)",
  append_edit_spec: "Append + sửa spec",
};

export interface AgentConfigValues {
  model: string;
  mcpServers: string[];
  docsWritePermission: DocsWritePermission;
  maxConcurrentTasks: number;
  canProposeFeatures: boolean;
  /** Member id */
  canAssignTo: string[];
  extra: [string, string][];
}

export const DEFAULT_AGENT_CONFIG: AgentConfigValues = {
  model: "",
  mcpServers: [],
  docsWritePermission: "read_only",
  maxConcurrentTasks: 2,
  canProposeFeatures: false,
  canAssignTo: [],
  extra: [],
};

const splitList = (value: string) =>
  value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Mảng hiển thị cũ (`Member.config`, trước F13.5) → cấu hình có cấu trúc. Dòng không nhận ra đi vào `extra`.
 * `nameToId`: tên agent → member id (cho "Được phép giao task: Cho Atlas, Scout").
 */
export function parseLegacyConfig(rows: [string, string][], nameToId: (name: string) => string | undefined): AgentConfigValues {
  const config: AgentConfigValues = { ...DEFAULT_AGENT_CONFIG, mcpServers: [], canAssignTo: [], extra: [] };
  for (const [label, value] of rows) {
    if (label === "Model") config.model = value;
    else if (label === "MCP server") config.mcpServers = splitList(value);
    else if (label === "Tool đặc thù" && value.includes("features.propose")) config.canProposeFeatures = true;
    else if (label === "Được phép giao task") {
      config.canAssignTo = splitList(value.replace(/^Cho\s+/i, "")).flatMap((name) => nameToId(name) ?? []);
    } else if (label === "Quyền ghi docs") {
      const perm = DOCS_WRITE_PERMISSIONS.find((p) => DOCS_WRITE_LABEL[p] === value);
      if (!perm) throw new Error(`Quyền ghi docs không hợp lệ: "${value}"`);
      config.docsWritePermission = perm;
    } else if (label === "Task đồng thời") {
      const max = /tối đa\s*(\d+)/.exec(value) ?? /(\d+)/.exec(value);
      if (max) config.maxConcurrentTasks = Number(max[1]);
    } else config.extra.push([label, value]);
  }
  return config;
}

/** Cấu hình → các dòng [nhãn, giá trị] hiển thị ở panel (thứ tự cố định). `idToName`: member id → tên. */
export function agentConfigRows(config: AgentConfigValues, idToName: (id: string) => string | undefined): [string, string][] {
  const rows: [string, string][] = [
    ["Model", config.model || "Chưa đặt"],
    ["MCP server", config.mcpServers.length ? config.mcpServers.join(", ") : "Chưa kết nối"],
  ];
  if (config.canProposeFeatures) rows.push(["Tool đặc thù", "features.propose"]);
  if (config.canAssignTo.length) rows.push(["Được phép giao task", `Cho ${config.canAssignTo.map((id) => idToName(id) ?? id).join(", ")}`]);
  rows.push(["Task đồng thời", `tối đa ${config.maxConcurrentTasks}`]);
  rows.push(["Quyền ghi docs", DOCS_WRITE_LABEL[config.docsWritePermission]]);
  return [...rows, ...config.extra];
}
