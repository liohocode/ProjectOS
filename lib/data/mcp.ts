import type { McpServer } from "@/lib/types";

// Chỉ danh sách server — đủ cho footer/nav sidebar. Bảng "Phiên chạy" và
// "Nhật ký lệnh" của màn MCP sẽ được thêm khi triển khai màn đó
// (xem docs/features/05-mcp.md).
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
