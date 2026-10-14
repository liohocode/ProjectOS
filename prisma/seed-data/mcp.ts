import type { McpLogEntry, McpServer, McpSession } from "@/lib/types";

// Chỉ danh sách server — đủ cho footer/nav sidebar. Bảng "Phiên chạy" và
// "Nhật ký lệnh" của màn MCP sẽ được thêm khi triển khai màn đó
// (xem docs/features/F05-mcp-screen.md).
const MCP_SERVERS: McpServer[] = [
  {
    id: "meridian-core",
    name: "meridian-core",
    status: "online",
    url: "wss://mcp.internal/meridian-core",
    tools: ["tasks.list", "tasks.claim", "tasks.update_status", "features.propose"],
    clients: 4,
    commandsPerDay: 1284,
    lastCommandAgo: "12 giây trước",
  },
  {
    id: "meridian-docs",
    name: "meridian-docs",
    status: "online",
    url: "wss://mcp.internal/meridian-docs",
    tools: ["docs.read", "docs.search", "docs.append", "docs.index"],
    clients: 3,
    commandsPerDay: 512,
    lastCommandAgo: "2 phút trước",
  },
  {
    id: "redis-tools",
    name: "redis-tools",
    status: "limited",
    url: "wss://mcp.internal/redis-tools",
    tools: ["cache.inspect", "cache.flush"],
    clients: 2,
    commandsPerDay: 96,
    lastCommandAgo: "18 phút trước",
  },
];

export async function getMcpServers(): Promise<McpServer[]> {
  return MCP_SERVERS;
}

// Bảng cắt ngang nhiều dự án — không filter theo project đang mở, theo đúng
// spec màn MCP. Xem docs/features/F05-mcp-screen.md.
const MCP_SESSIONS: McpSession[] = [
  { id: "sess-8f2a", agent: "Atlas", projectId: "rv-web", taskId: "T-405", durationMin: 14, toolCalls: 6, tokens: "182K", result: "Đang chạy" },
  { id: "sess-6c11", agent: "Vega", projectId: "rv-web", taskId: "T-407", durationMin: 3, toolCalls: 2, tokens: "54K", result: "Đang chạy" },
  { id: "sess-3d90", agent: "Bảo", projectId: "rv-web", taskId: "T-430", durationMin: 6, toolCalls: 4, tokens: "71K", result: "Đang chạy" },
  { id: "sess-a412", agent: "Atlas", projectId: "rv-web", taskId: "T-396", durationMin: 22, toolCalls: 11, tokens: "240K", result: "Chờ review" },
  { id: "sess-77e0", agent: "Vega", projectId: "rv-web", taskId: "T-402", durationMin: 9, toolCalls: 5, tokens: "88K", result: "Bị chặn" },
  { id: "sess-1b6f", agent: "Vega", projectId: "rv-app", taskId: "T-530", durationMin: 8, toolCalls: 4, tokens: "63K", result: "Đang chạy" },
  { id: "sess-e209", agent: "Atlas", projectId: "crm", taskId: "T-620", durationMin: 31, toolCalls: 14, tokens: "310K", result: "Chờ review" },
  { id: "sess-5a77", agent: "Atlas", projectId: "crm", taskId: "T-624", durationMin: 12, toolCalls: 6, tokens: "95K", result: "Xong" },
];

const MCP_LOG: McpLogEntry[] = [
  { at: "14:32:08", agent: "Atlas", tool: "tasks.claim", target: "T-405", result: "OK" },
  { at: "14:31:02", agent: "Vega", tool: "tasks.assign", target: "T-418 → Atlas", result: "OK" },
  { at: "14:26:47", agent: "Bảo", tool: "features.propose", target: "3 feature con — Mobile parity", result: "Chờ review" },
  { at: "14:21:15", agent: "Atlas", tool: "tasks.comment", target: "T-418 (chờ ADR-11)", result: "Chờ review" },
  { at: "14:14:33", agent: "Scout", tool: "docs.index", target: "12 tài liệu", result: "OK" },
  { at: "14:10:02", agent: "Vega", tool: "cache.flush", target: "filters:*", result: "Bị chặn" },
  { at: "12:08:51", agent: "Atlas", tool: "docs.append", target: "PRD Listing v3 §Tiêu chí hoàn thành", result: "Chờ review" },
  { at: "11:58:20", agent: "Trung Hiếu", tool: "docs.review", target: "Revision PRD Listing v3", result: "OK" },
];

export async function getMcpSessions(): Promise<McpSession[]> {
  return MCP_SESSIONS;
}

export async function getMcpLog(): Promise<McpLogEntry[]> {
  return MCP_LOG;
}
