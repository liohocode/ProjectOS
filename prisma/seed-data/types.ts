// Hình dạng dữ liệu mock GỐC (chụp lại từ lib/types.ts lúc chuyển sang Prisma).
// Cố tình tách khỏi lib/types: type của app sẽ tiếp tục thay đổi theo schema,
// còn dữ liệu seed là snapshot cố định (ADR-007). Đừng import lib/types trong prisma/seed-data/.

export type SeedTaskStage = "BA" | "TA" | "Dev" | "Review" | "Done";
export type SeedMemberKind = "human" | "agent";

export interface SeedProject {
  id: string;
  code: string;
  name: string;
  status: string;
  desc: string;
  /** Nhãn hiển thị, vd "Sprint 14 · 12–26/08" — seed parse thành model Sprint */
  sprint: string;
}

export interface SeedTask {
  id: string;
  stage: SeedTaskStage;
  title: string;
  who: string;
  kind: SeedMemberKind;
  status: string;
  est: string;
  due: string;
  blocked?: string;
  blockedFull?: string;
  running?: string;
  /** Liên kết code (F22.4) */
  prUrl?: string;
  branch?: string;
  /** F21.7: mô tả markdown, cỡ, cần người quyết định */
  description?: string;
  size?: "S" | "M" | "L";
  needsDecision?: boolean;
  /** Acceptance criteria (F21.6); done = người / agent thực hiện đã tick */
  criteria?: { text: string; done?: boolean }[];
  /** Lịch sử chuyển stage mẫu (F22.1) — cho chỉ số chất lượng F22.5. `by` mặc định người thực hiện; note = lý do trả lại */
  history?: { from: SeedTaskStage | null; to: SeedTaskStage; daysAgo: number; note?: string; by?: string }[];
}

export interface SeedFeature {
  id: string;
  name: string;
  /** F21.9: nội dung trang chi tiết (markdown) */
  goal?: string;
  scope?: string;
  notes?: string;
  stage: SeedTaskStage;
  owner: string;
  pct: number;
  docs: number;
  tasks: SeedTask[];
}

export interface SeedMember {
  id: string;
  name: string;
  handle: string;
  kind: SeedMemberKind;
  /** Email đăng nhập Google — chỉ người (F15.2). Dữ liệu mẫu dùng @example.com; DEV_LOGIN_EMAIL thay cho "hieu". */
  email?: string;
  role: string;
  /** Quyền quản trị (F15.4) */
  isTechLead?: boolean;
  skills: string[];
  current: string;
  status: string;
  skillRows: [string, string, number][];
  activity: { icon: string; text: string; when: string }[];
  config?: [string, string][];
}

export interface SeedMcpServer {
  id: string;
  name: string;
  status: "online" | "limited";
  url: string;
  tools: string[];
  clients: number;
  commandsPerDay: number;
  lastCommandAgo: string;
}

export interface SeedMcpSession {
  id: string;
  agent: string;
  projectId: string;
  taskId: string;
  durationMin: number;
  toolCalls: number;
  tokens: string;
  result: "Xong" | "Đang chạy" | "Chờ review" | "Bị chặn";
}

export interface SeedMcpLogEntry {
  at: string;
  agent: string;
  tool: string;
  target: string;
  result: "OK" | "Chờ review" | "Bị chặn";
}
