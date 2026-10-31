import type { SectionDiff } from "@/lib/diffSections";
import type { AgentConfigValues } from "@/lib/agentConfig";
import type { TaskLinks } from "@/lib/taskLinks";

export type ScreenId = "inbox" | "portfolio" | "docs" | "work" | "team" | "mcp";

export interface Project {
  id: string;
  code: string;
  name: string;
  status: string;
  desc: string;
  sprint: string;
  /** Sprint hiện tại (F21.3) — null = dự án chưa có sprint */
  currentSprintId: string | null;
  /** Lưu trữ (F13.7) — ẩn khỏi project switcher, hiện mờ ở portfolio */
  archived: boolean;
}

export type TaskStage = "BA" | "TA" | "Dev" | "Review" | "Done";
export type MemberKind = "human" | "agent";

/** Một acceptance criterion của task (F21.6). */
export interface TaskCriterionView {
  id: string;
  text: string;
  done: boolean;
  /** Người / agent đã tick */
  doneBy: string | null;
}

/** Tham chiếu ngắn tới task khác (F21.8). */
export interface TaskRef {
  id: string;
  title: string;
  stage: TaskStage;
  done: boolean;
}

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
  /** ISO — thời điểm bắt đầu chạy, để client tự tăng "chạy N phút" (F17.5) */
  runningSince?: string;
  /** Liên kết code (F22.4) — PR, branch, commit */
  links: TaskLinks;
  /** Sprint task thuộc về (F21.3); null = chưa xếp */
  sprintId: string | null;
  /** Acceptance criteria (F21.6), theo thứ tự */
  criteria: TaskCriterionView[];
  /** Đã lưu trữ (F21.4) — chỉ có khi mở bằng deep link */
  archived?: true;
  /** F21.7: mô tả markdown ("Làm gì"), cỡ, mã trong kế hoạch (vd "F21.3"), cần người quyết định */
  description?: string;
  size?: "S" | "M" | "L";
  code?: string;
  needsDecision?: true;
  /** F21.8: task này phụ thuộc (done = đã Done) / các task đang chờ task này */
  dependsOn: TaskRef[];
  blocking: TaskRef[];
}

export interface Feature {
  id: string;
  name: string;
  stage: TaskStage;
  /** Tên owner; "Chưa giao" khi feature đã lên kế hoạch nhưng chưa giao cho ai */
  owner: string;
  ownerKind: MemberKind | null;
  /** Giá trị gốc để sửa (F21.1) */
  ownerId: string | null;
  /** "YYYY-MM-DD" — kế hoạch cho timeline (F21.1); null = chưa lên kế hoạch */
  plannedStart: string | null;
  plannedEnd: string | null;
  pct: number;
  docs: number;
  tasks: Task[];
  /** Lưu trữ (F21.10) — chỉ có ở trang chi tiết mở bằng link */
  archived?: true;
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

export type RevisionStatus = "pending" | "approved" | "rejected";

export interface DocRevision {
  id: string;
  who: string;
  agent: boolean;
  what: string;
  when: string;
  /** F12.1 — pending: chờ duyệt (hiện nút Duyệt), approved, rejected */
  status: RevisionStatus;
  /** F12.3 — chỉ revision đang chờ có nội dung đề xuất: thay đổi so với bản hiện tại */
  diff?: SectionDiff[];
  summaryChange?: { from: string; to: string };
  rejectedReason?: string;
  /** F12.4 — revision đã duyệt có người duyệt (revision cũ/seed có thể không có) */
  approvedBy?: string;
  approvedWhen?: string;
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

/** Một dòng trong dialog "Xem log" của người (F13.4) — có id để phân trang. */
export interface MemberActivityEntry extends MemberActivity {
  id: string;
}

/** Token agent trong danh sách (F15.5) — không bao giờ chứa token gốc / hash. */
export interface AgentTokenInfo {
  id: string;
  name: string;
  lastFour: string;
  created: string;
  /** null = chưa dùng lần nào */
  lastUsed: string | null;
  revoked: boolean;
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
  /** [label, value][] — agent-only configuration rows (dựng từ AgentConfig, F13.5) */
  config?: [string, string][];
  /** Giá trị có cấu trúc cho form sửa cấu hình (F13.5) — chỉ agent */
  agentConfig?: AgentConfigValues;
  /** Email Google đăng nhập (chỉ người) + quyền quản trị — form "Sửa thành viên" (F20.2) */
  email: string | null;
  isTechLead: boolean;
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
  /** id sự kiện (F17.1) — khoá React + loại trùng khi polling (F17.3) */
  id?: string;
  who: string;
  kind: MemberKind;
  text: string;
  tool: string;
  when: string;
  tone: ActivityTone;
  /** Mục gắn với một task → rail mở task đó qua `?task=` (F14.1). */
  taskId?: string;
  /** ISO — mục "đang chạy": `when` tự tăng phía client (F17.5) */
  runningSince?: string;
}

export interface TaskDrawerInfo {
  contextDocs: string[];
  /** `runningSince` (ISO): bước "Đang chạy" — `when` tự tăng phía client (F17.5) */
  sessionLog: { text: string; when: string; runningSince?: string }[];
  /** Bình luận trên task (F16.4), cũ trước */
  comments: { id: string; author: string; kind: MemberKind; body: string; when: string }[];
}

export interface McpServer {
  id: string;
  name: string;
  status: "online" | "limited";
  url: string;
  tools: string[];
  clients: number;
  commandsPerDay: number;
  /** null = chưa nhận lệnh nào */
  lastCommandAgo: string | null;
  /** Server nội bộ của Meridian (meridian-core, meridian-docs) — không sửa/xoá được */
  internal: boolean;
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
  /** id dòng — khoá React + cursor phân trang (F14.4) */
  id: string;
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

/** Một trang dữ liệu (F14.4): `nextCursor` = id dòng cuối nếu còn trang sau, null nếu hết. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** Feature agent đề xuất chờ lead duyệt (F16.6) */
/** Sprint của dự án (F21.3) — chọn trong bộ lọc / drawer / dialog sprint. */
export interface SprintOption {
  id: string;
  name: string;
  /** "Sprint 14 · 12–26/08" */
  label: string;
  current: boolean;
}

export interface ProposedFeature {
  id: string;
  name: string;
  proposal: string;
  proposedBy: string;
  when: string;
}
