import { prisma } from "@/lib/prisma";
import { DEFAULT_AGENT_CONFIG, type DocsWritePermission } from "@/lib/agentConfig";

// Luật governance trước mỗi lệnh MCP (F16.7, FR-AG-06/07): server được cấu hình cho agent, quyền ghi docs,
// rate limit theo token. Quyền theo dự án nằm trong từng nghiệp vụ (agent chỉ thấy dự án mình thuộc).
// Không giữ gì trong RAM (Cloud Run nhiều instance / scale về 0, ADR-016): rate limit đếm từ nhật ký trong DB.

export const RATE_LIMIT_PER_MINUTE = 60;

/** Tool thuộc server nội bộ nào — agent phải có server đó trong `AgentConfig.mcpServers`. */
export const TOOL_SERVER: Record<string, "meridian-core" | "meridian-docs"> = {
  tasks_list: "meridian-core",
  tasks_claim: "meridian-core",
  tasks_update_status: "meridian-core",
  tasks_comment: "meridian-core",
  features_propose: "meridian-core",
  docs_read: "meridian-docs",
  docs_search: "meridian-docs",
  docs_append: "meridian-docs",
};

/** Tool ghi tài liệu — chặn khi quyền ghi docs là "Chỉ đọc". */
const DOC_WRITE_TOOLS = new Set(["docs_append"]);

export interface AgentPolicy {
  mcpServers: string[];
  docsWritePermission: DocsWritePermission;
  canProposeFeatures: boolean;
}

/** Agent chưa có AgentConfig (hiếm — mọi agent tạo từ F13.2 đều có) → cấu hình mặc định, không có server nào. */
export async function loadAgentPolicy(agentId: string): Promise<AgentPolicy> {
  const config = await prisma.agentConfig.findUnique({
    where: { memberId: agentId },
    select: { mcpServers: true, docsWritePermission: true, canProposeFeatures: true },
  });
  return config ?? { mcpServers: [], docsWritePermission: DEFAULT_AGENT_CONFIG.docsWritePermission, canProposeFeatures: false };
}

/** Lý do chặn theo cấu hình agent, hoặc null nếu được gọi. */
export function checkToolAllowed(policy: AgentPolicy, tool: string): string | null {
  const server = TOOL_SERVER[tool];
  if (server && !policy.mcpServers.includes(server)) return `Agent chưa được cấu hình MCP server ${server} — nhờ tech lead thêm ở panel agent`;
  if (DOC_WRITE_TOOLS.has(tool) && policy.docsWritePermission === "read_only") return "Quyền ghi docs của agent là \"Chỉ đọc\" — không đề xuất sửa tài liệu được";
  if (tool === "features_propose" && !policy.canProposeFeatures) return "Agent không được phép đề xuất feature";
  return null;
}

/** Quá RATE_LIMIT_PER_MINUTE lệnh (kể cả lệnh bị chặn) trong 60 giây gần nhất của token → lý do chặn. */
export async function checkRateLimit(tokenId: string, now: Date = new Date()): Promise<string | null> {
  const recent = await prisma.mcpLogEntry.count({ where: { tokenId, at: { gt: new Date(now.getTime() - 60_000) } } });
  return recent >= RATE_LIMIT_PER_MINUTE ? `Vượt giới hạn ${RATE_LIMIT_PER_MINUTE} lệnh/phút — thử lại sau ít giây` : null;
}
