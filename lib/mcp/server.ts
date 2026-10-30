import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AgentPrincipal } from "@/lib/auth/agentToken";
import { listTasksForMember } from "@/lib/domain/tasks";

// MCP server của Meridian (F16, ADR-022). Mỗi request HTTP dựng một instance mới gắn với agent đã xác thực
// (stateless — Cloud Run có thể nhiều instance / scale về 0, ADR-016). Tool chỉ là lớp vỏ: nghiệp vụ ở lib/domain.
// Tên tool không có dấu chấm (client MCP chỉ nhận ^[a-zA-Z0-9_-]{1,64}$); nhật ký/UI hiển thị dạng `tasks.list`.

const TASK_STAGES = ["BA", "TA", "Dev", "Review", "Done"] as const;

export const SERVER_INFO = { name: "meridian", version: "0.1.0" } as const;

function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

export function createMeridianMcpServer(agent: AgentPrincipal): McpServer {
  const server = new McpServer(SERVER_INFO, {
    instructions: `Meridian — quản lý dự án cho team người + AI agent. Bạn đang kết nối với vai trò agent "${agent.name}". Dùng tasks_list để xem task trong các dự án bạn thuộc về.`,
  });

  server.registerTool(
    "tasks_list",
    {
      title: "Liệt kê task",
      description:
        "Liệt kê task trong các dự án agent thuộc về (tối đa 200). Lọc tuỳ chọn theo dự án, stage (BA/TA/Dev/Review/Done) và người được giao.",
      inputSchema: {
        projectId: z.string().trim().min(1).optional().describe("Id dự án, vd rv-web"),
        stage: z.enum(TASK_STAGES).optional().describe("Stage của task"),
        assigneeId: z.string().trim().min(1).optional().describe("Member id người/agent được giao; 'me' = chính agent này"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ projectId, stage, assigneeId }) => {
      const tasks = await listTasksForMember(agent.memberId, {
        projectId,
        stage,
        assigneeId: assigneeId === "me" ? agent.memberId : assigneeId,
      });
      return json({ count: tasks.length, tasks });
    },
  );

  return server;
}
