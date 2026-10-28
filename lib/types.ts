export type ScreenId = "portfolio" | "docs" | "work" | "team" | "mcp";

export interface Project {
  id: string;
  code: string;
  name: string;
  status: string;
  desc: string;
  sprint: string;
}

export type TaskStage = "BA" | "TA" | "Dev" | "Review" | "Done";
export type MemberKind = "human" | "agent";

export interface Task {
  id: string;
  stage: TaskStage;
  title: string;
  /** Member id người/agent thực hiện — lọc `?who=` (F14.3) */
  assigneeId: string;
  who: string;
  kind: MemberKind;
  status: string;
  est: string;
  due: string;
  /** Giá trị gốc để sửa (F11.6): story point, null = chưa ước lượng */
  estimatePoints: number | null;
  /** Giá trị gốc để sửa (F11.6): "YYYY-MM-DD", null = chưa có hạn */
  dueIso: string | null;
  blocked?: string;
  blockedFull?: string;
  running?: string;
}

export interface Feature {
  id: string;
  name: string;
  stage: TaskStage;
  /** Tên owner; "Chưa giao" khi feature đã lên kế hoạch nhưng chưa giao cho ai */
  owner: string;
  ownerKind: MemberKind | null;
  pct: number;
  docs: number;
  tasks: Task[];
}

export interface DocItem {
  id: string;
  title: string;
  agent: boolean;
}

export interface DocGroup {
  name: string;
  icon: string;
  items: DocItem[];
}

export interface DocRevision {
  id: string;
  who: string;
  agent: boolean;
  what: string;
  when: string;
  pending?: boolean;
}

export interface DocSection {
  heading: string;
  paras: string[];
}

export interface DocBody {
  title: string;
  version: string;
  status: string;
  updated: string;
  author: string;
  feature: string;
  indexed: string;
  readBy: string;
  summary: string;
  sections: DocSection[];
  history: DocRevision[];
}

export interface MemberActivity {
  icon: string;
  text: string;
  when: string;
}

export interface Member {
  id: string;
  name: string;
  handle: string;
  kind: MemberKind;
  role: string;
  skills: string[];
  current: string;
  status: string;
  /** [label, level, percent][] — level is a display string (Cao/Trung bình/Cơ bản/Không dùng) */
  skillRows: [string, string, number][];
  activity: MemberActivity[];
  /** [label, value][] — agent-only configuration rows */
  config?: [string, string][];
}

export interface TimelineRow {
  featureId: string | null;
  name: string;
  owner: string;
  kind: MemberKind | "none";
  start: number;
  len: number;
  label: string;
}

export type ActivityTone = "run" | "ok" | "review" | "block";

export interface ActivityItem {
  who: string;
  kind: MemberKind;
  text: string;
  tool: string;
  when: string;
  tone: ActivityTone;
  /** Mục gắn với một task → rail mở task đó qua `?task=` (F14.1). */
  taskId?: string;
}

export interface TaskDrawerInfo {
  contextDocs: string[];
  sessionLog: { text: string; when: string }[];
}

export interface McpServer {
  id: string;
  name: string;
  status: "online" | "limited";
  url: string;
  tools: string[];
  clients: number;
  commandsPerDay: number;
  lastCommandAgo: string;
}

export type SessionResult = "Xong" | "Đang chạy" | "Chờ review" | "Bị chặn";

export interface McpSession {
  id: string;
  /** Member id của agent — lọc `?agent=` (F14.3) */
  agentId: string;
  agent: string;
  projectId: string;
  taskId: string;
  durationMin: number;
  toolCalls: number;
  tokens: string;
  result: SessionResult;
}

export type CommandResult = "OK" | "Chờ review" | "Bị chặn";

export interface McpLogEntry {
  at: string;
  agentId: string;
  agent: string;
  tool: string;
  target: string;
  result: CommandResult;
}

/** Kết quả ô tìm kiếm header (F14.2), mỗi nhóm tối đa SEARCH_LIMIT. */
export interface SearchResults {
  tasks: { id: string; title: string; featureId: string }[];
  features: { id: string; name: string }[];
  docs: { id: string; title: string }[];
}

/** Lựa chọn trong panel "Lọc" (F14.3) — chỉ id + tên, không tải hồ sơ đầy đủ. */
export interface MemberOption {
  id: string;
  name: string;
  kind: MemberKind;
}
