import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AgentPrincipal } from "@/lib/auth/agentToken";
import { revalidatePath } from "next/cache";
import { claimTask, listTasksForMember } from "@/lib/domain/tasks";
import { prisma } from "@/lib/prisma";
import { recordToolCall, type ToolCallRecord } from "./audit";

// MCP server của Meridian (F16, ADR-022). Mỗi request HTTP dựng một instance mới gắn với agent đã xác thực
// (stateless — Cloud Run có thể nhiều instance / scale về 0, ADR-016). Tool chỉ là lớp vỏ: nghiệp vụ ở lib/domain.
// Tên tool không có dấu chấm (client MCP chỉ nhận ^[a-zA-Z0-9_-]{1,64}$); nhật ký/UI hiển thị dạng `tasks.list`.

const TASK_STAGES = ["BA", "TA", "Dev", "Review", "Done"] as const;

export const SERVER_INFO = { name: "meridian", version: "0.1.0" } as const;

function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

type Logged = Omit<ToolCallRecord, "agentId" | "tool">;

/**
 * Bọc handler tool (F16.2): mọi lệnh ghi một dòng nhật ký + cập nhật phiên. Handler trả kèm `log`
 * (target, kết quả, dự án/task); lỗi bất ngờ ghi "Bị chặn" rồi ném tiếp cho SDK trả lỗi JSON-RPC.
 */
async function logged<T>(agent: AgentPrincipal, tool: string, run: () => Promise<{ value: T; log: Logged }>): Promise<T> {
  try {
    const { value, log } = await run();
    await recordToolCall({ agentId: agent.memberId, tool, ...log });
    return value;
  } catch (e) {
    await recordToolCall({ agentId: agent.memberId, tool, target: "lỗi", result: "BiChan" }).catch(() => {});
    throw e;
  }
}

/** Dự án gắn phiên: `projectId` nếu agent thuộc dự án đó; không truyền mà agent chỉ thuộc một dự án → dự án đó. */
async function sessionProject(agentId: string, projectId: string | undefined): Promise<string | null> {
  const memberships = await prisma.projectMember.findMany({ where: { memberId: agentId }, select: { projectId: true } });
  const ids = memberships.map((m) => m.projectId);
  if (projectId) return ids.includes(projectId) ? projectId : null;
  return ids.length === 1 ? ids[0] : null;
}

export function createMeridianMcpServer(agent: AgentPrincipal): McpServer {
  const server = new McpServer(SERVER_INFO, {
    instructions: `Meridian — quản lý dự án cho team người + AI agent. Bạn đang kết nối với vai trò agent "${agent.name}". Dùng tasks_list để xem task trong các dự án bạn thuộc về, tasks_claim để nhận task trước khi làm.`,
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
    async ({ projectId, stage, assigneeId }) =>
      logged(agent, "tasks_list", async () => {
        const tasks = await listTasksForMember(agent.memberId, {
          projectId,
          stage,
          assigneeId: assigneeId === "me" ? agent.memberId : assigneeId,
        });
        return {
          value: json({ count: tasks.length, tasks }),
          log: { target: [projectId ?? "mọi dự án", stage].filter(Boolean).join(" · "), result: "OK", projectId: await sessionProject(agent.memberId, projectId) },
        };
      }),
  );

  server.registerTool(
    "tasks_claim",
    {
      title: "Nhận task",
      description:
        "Nhận một task để làm: task được giao cho agent và chuyển sang 'Đang chạy'. Bị chặn nếu task đã Done, đang bị block, đang được người khác chạy, hoặc agent đã chạy đủ số task đồng thời cho phép (mặc định 2). Claim lại task mình đang chạy không đổi gì.",
      inputSchema: { taskId: z.string().trim().min(1).describe("Mã task, vd T-405") },
    },
    async ({ taskId }) =>
      logged(agent, "tasks_claim", async () => {
        const result = await claimTask(agent.memberId, taskId);
        // Màn work / team / badge của dự án thấy task đang chạy ngay ở lần tải sau.
        if (result.ok && !result.alreadyRunning) revalidatePath("/[project]", "layout");
        return {
          value: result.ok
            ? json({ claimed: true, alreadyRunning: result.alreadyRunning, task: result.task })
            : { ...json({ claimed: false, reason: result.reason }), isError: true },
          log: { target: taskId, result: result.ok ? "OK" : "BiChan", projectId: result.projectId, taskId: result.ok ? taskId : null },
        };
      }),
  );

  return server;
}
