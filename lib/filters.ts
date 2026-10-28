import type { DocGroup, Feature, McpLogEntry, McpSession, TaskStage } from "@/lib/types";

// Bộ lọc theo màn (F14.3): tiêu chí nằm trong URL search params, áp ở server bằng hàm thuần
// trên dữ liệu đã tải (lib/data/* giữ chữ ký + cache() theo tham số nguyên thuỷ — ADR-019).

export type FilterScreen = "work" | "docs" | "mcp";
type SearchParams = Record<string, string | string[] | undefined> | URLSearchParams;

export const TASK_STAGES: readonly TaskStage[] = ["BA", "TA", "Dev", "Review", "Done"];
/** Kết quả phiên MCP: khoá enum Prisma (giá trị trong URL) → nhãn hiển thị (lib/data/mcpLabels). */
export const SESSION_RESULT_KEYS = ["DangChay", "ChoReview", "BiChan", "Xong"] as const;

export const FILTER_KEYS: Record<FilterScreen, readonly string[]> = {
  work: ["stage", "who", "blocked", "running"],
  docs: ["agent", "pending"],
  mcp: ["agent", "project", "result"],
};

function param(params: SearchParams, key: string): string | undefined {
  const v = params instanceof URLSearchParams ? params.get(key) : params[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s ? s : undefined;
}

export interface WorkFilter {
  stage?: TaskStage;
  who?: string;
  blocked?: boolean;
  running?: boolean;
}
export interface DocsFilter {
  agent?: boolean;
  pending?: boolean;
}
export interface McpFilter {
  agent?: string;
  project?: string;
  result?: (typeof SESSION_RESULT_KEYS)[number];
}

export function parseWorkFilter(params: SearchParams): WorkFilter {
  const stage = param(params, "stage");
  return {
    stage: TASK_STAGES.includes(stage as TaskStage) ? (stage as TaskStage) : undefined,
    who: param(params, "who"),
    blocked: param(params, "blocked") === "1" || undefined,
    running: param(params, "running") === "1" || undefined,
  };
}

export function parseDocsFilter(params: SearchParams): DocsFilter {
  return { agent: param(params, "agent") === "1" || undefined, pending: param(params, "pending") === "1" || undefined };
}

export function parseMcpFilter(params: SearchParams): McpFilter {
  const result = param(params, "result");
  return {
    agent: param(params, "agent"),
    project: param(params, "project"),
    result: (SESSION_RESULT_KEYS as readonly string[]).includes(result ?? "") ? (result as McpFilter["result"]) : undefined,
  };
}

/** Số tiêu chí đang bật — hiện trên nút "Lọc" (giá trị không hợp lệ không tính). */
export function countActiveFilters(screen: FilterScreen, params: SearchParams): number {
  const parsed = screen === "work" ? parseWorkFilter(params) : screen === "docs" ? parseDocsFilter(params) : parseMcpFilter(params);
  return Object.values(parsed).filter((v) => v !== undefined).length;
}

/** Lọc task trong từng feature; khi có tiêu chí, ẩn feature không còn task nào khớp. */
export function filterFeatures(features: Feature[], f: WorkFilter): Feature[] {
  if (!f.stage && !f.who && !f.blocked && !f.running) return features;
  return features
    .map((feature) => ({
      ...feature,
      tasks: feature.tasks.filter(
        (t) =>
          (!f.stage || t.stage === f.stage) &&
          (!f.who || t.assigneeId === f.who) &&
          (!f.blocked || Boolean(t.blocked)) &&
          (!f.running || Boolean(t.running)),
      ),
    }))
    .filter((feature) => feature.tasks.length > 0);
}

/** Lọc tài liệu trong cây; bỏ nhóm rỗng. `pendingDocIds` = tài liệu có revision chờ duyệt. */
export function filterDocGroups(groups: DocGroup[], f: DocsFilter, pendingDocIds: readonly string[]): DocGroup[] {
  if (!f.agent && !f.pending) return groups;
  const pending = new Set(pendingDocIds);
  return groups
    .map((g) => ({ ...g, items: g.items.filter((d) => (!f.agent || d.agent) && (!f.pending || pending.has(d.id))) }))
    .filter((g) => g.items.length > 0);
}

export function filterSessions(sessions: McpSession[], f: McpFilter, resultLabel: Record<string, string>): McpSession[] {
  return sessions.filter(
    (s) =>
      (!f.agent || s.agentId === f.agent) &&
      (!f.project || s.projectId === f.project) &&
      (!f.result || s.result === resultLabel[f.result]),
  );
}

/** Nhật ký lệnh chỉ lọc theo agent (kết quả lệnh khác tập kết quả phiên). */
export function filterLog(log: McpLogEntry[], f: McpFilter): McpLogEntry[] {
  return f.agent ? log.filter((e) => e.agentId === f.agent) : log;
}
