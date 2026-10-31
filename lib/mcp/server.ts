import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AgentPrincipal } from "@/lib/auth/agentToken";
import { revalidatePath } from "next/cache";
import { appendDocForAgent, readDocForAgent, searchDocsForAgent } from "@/lib/domain/agentDocs";
import { proposeFeature } from "@/lib/domain/features";
import { getTaskContext } from "@/lib/domain/taskContext";
import { AGENT_STAGES, AGENT_STATUSES, claimTask, commentOnTask, listTasksForMember, updateTaskByAgent } from "@/lib/domain/tasks";
import { prisma } from "@/lib/prisma";
import { recordToolCall, type ToolCallRecord } from "./audit";
import { checkRateLimit, checkToolAllowed, loadAgentPolicy, type AgentPolicy } from "./governance";

// MCP server của Meridian (F16, ADR-022). Mỗi request HTTP dựng một instance mới gắn với agent đã xác thực
// (stateless — Cloud Run có thể nhiều instance / scale về 0, ADR-016). Tool chỉ là lớp vỏ: nghiệp vụ ở lib/domain.
// Tên tool không có dấu chấm (client MCP chỉ nhận ^[a-zA-Z0-9_-]{1,64}$); nhật ký/UI hiển thị dạng `tasks.list`.

const TASK_STAGES = ["BA", "TA", "Dev", "Review", "Done"] as const;

export const SERVER_INFO = { name: "meridian", version: "0.1.0" } as const;

function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

type Logged = Omit<ToolCallRecord, "agentId" | "tool" | "tokenId">;
type ToolResult = ReturnType<typeof json> & { isError?: boolean };

/**
 * Bọc handler tool (F16.2 + F16.7): kiểm tra governance (rate limit theo token, server/quyền theo cấu hình agent) —
 * bị chặn thì trả lỗi cho agent và ghi "Bị chặn"; được thì chạy handler rồi ghi một dòng nhật ký + cập nhật phiên.
 * Handler trả kèm `log` (target, kết quả, dự án/task); lỗi bất ngờ ghi "Bị chặn" rồi ném tiếp cho SDK.
 */
async function logged(
  agent: AgentPrincipal,
  policy: () => Promise<AgentPolicy>,
  tool: string,
  run: () => Promise<{ value: ToolResult; log: Logged }>,
): Promise<ToolResult> {
  const base = { agentId: agent.memberId, tokenId: agent.tokenId, tool };
  const denied = (await checkRateLimit(agent.tokenId)) ?? checkToolAllowed(await policy(), tool);
  if (denied) {
    await recordToolCall({ ...base, target: denied.includes("lệnh/phút") ? "rate limit" : "không đủ quyền", result: "BiChan" });
    return { ...json({ denied: true, reason: denied }), isError: true };
  }
  try {
    const { value, log } = await run();
    await recordToolCall({ ...base, ...log });
    return value;
  } catch (e) {
    await recordToolCall({ ...base, target: "lỗi", result: "BiChan" }).catch(() => {});
    throw e;
  }
}

/** Ghi dòng nhật ký `docs.read` cho tài liệu gửi kèm context_get (không gắn token → không tính vào rate limit). */
async function recordDocReads(agent: AgentPrincipal, docIds: string[]) {
  if (docIds.length === 0) return;
  await prisma.mcpLogEntry.createMany({ data: docIds.map((id) => ({ agentId: agent.memberId, tool: "docs.read", target: id, result: "OK" as const })) });
}

/** Dự án gắn phiên: `projectId` nếu agent thuộc dự án đó; không truyền mà agent chỉ thuộc một dự án → dự án đó. */
async function sessionProject(agentId: string, projectId: string | undefined): Promise<string | null> {
  const memberships = await prisma.projectMember.findMany({ where: { memberId: agentId }, select: { projectId: true } });
  const ids = memberships.map((m) => m.projectId);
  if (projectId) return ids.includes(projectId) ? projectId : null;
  return ids.length === 1 ? ids[0] : null;
}

export function createMeridianMcpServer(agent: AgentPrincipal): McpServer {
  // Cấu hình agent đọc tối đa một lần mỗi request (lệnh đầu tiên cần tới).
  let policyPromise: Promise<AgentPolicy> | null = null;
  const policy = () => (policyPromise ??= loadAgentPolicy(agent.memberId));

  const server = new McpServer(SERVER_INFO, {
    instructions: `Meridian — quản lý dự án cho team người + AI agent. Bạn đang kết nối với vai trò agent "${agent.name}". Dùng tasks_list để xem task trong các dự án bạn thuộc về, tasks_claim để nhận task, rồi context_get để lấy đủ ngữ cảnh (feature, tài liệu, bình luận, lý do bị trả lại) trước khi làm.`,
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
      logged(agent, policy, "tasks_list", async () => {
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
    "context_get",
    {
      title: "Ngữ cảnh task",
      description:
        "Lấy đủ ngữ cảnh để làm một task trong một lệnh: task (kèm lần bị trả lại gần nhất), feature, tài liệu của feature (đầy đủ nội dung, tối đa 5 — còn lại đọc bằng docs_read), bình luận, lịch sử chuyển trạng thái.",
      inputSchema: { taskId: z.string().trim().min(1).describe("Mã task, vd T-405") },
      annotations: { readOnlyHint: true },
    },
    async ({ taskId }) =>
      logged(agent, policy, "context_get", async () => {
        // Tài liệu chỉ kèm khi agent được cấu hình meridian-docs (governance F16.7).
        const includeDocs = (await policy()).mcpServers.includes("meridian-docs");
        const result = await getTaskContext(agent.memberId, taskId, { includeDocs });
        if (result.ok) {
          // Tài liệu đã gửi kèm tính là "đã đọc" trong phiên của task → drawer hiện "Context agent đã pull" (F17.4).
          await recordDocReads(agent, result.context.docs.map((d) => d.id));
        }
        return {
          value: result.ok
            ? json({ ...result.context, ...(!includeDocs && { docsNote: "Agent chưa được cấu hình meridian-docs — không kèm tài liệu" }) })
            : { ...json({ reason: result.reason }), isError: true },
          log: { target: taskId, result: result.ok ? "OK" : "BiChan", projectId: result.ok ? result.projectId : null, taskId: result.ok ? taskId : null },
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
      logged(agent, policy, "tasks_claim", async () => {
        const result = await claimTask(agent.memberId, taskId);
        // Màn work / team / badge của dự án thấy task đang chạy ngay ở lần tải sau.
        if (result.ok && !result.alreadyRunning) revalidatePath("/[project]", "layout");
        return {
          value: result.ok
            ? json({ claimed: true, alreadyRunning: result.alreadyRunning, task: result.task })
            : { ...json({ claimed: false, reason: result.reason }), isError: true },
          log: {
            target: taskId,
            result: result.ok ? "OK" : "BiChan",
            projectId: result.projectId,
            taskId: result.ok ? taskId : null,
            ...(result.ok && !result.alreadyRunning && { event: { type: "task", tone: "run", text: result.task.title, taskId } }),
          },
        };
      }),
  );

  server.registerTool(
    "tasks_update_status",
    {
      title: "Cập nhật task",
      description:
        "Cập nhật stage và/hoặc trạng thái task đang giao cho agent. Không tự đánh dấu Done (chuyển sang stage Review để người duyệt). Đổi trạng thái sẽ rời 'Đang chạy' (nhả task khỏi giới hạn task đồng thời).",
      inputSchema: {
        taskId: z.string().trim().min(1).describe("Mã task, vd T-405"),
        stage: z.enum(AGENT_STAGES).optional().describe("Stage mới"),
        status: z.enum(AGENT_STATUSES).optional().describe("Trạng thái mới"),
      },
    },
    async ({ taskId, stage, status }) =>
      logged(agent, policy, "tasks_update_status", async () => {
        const result = await updateTaskByAgent(agent.memberId, taskId, { stage, status });
        if (result.ok) revalidatePath("/[project]", "layout");
        return {
          value: result.ok ? json({ updated: true, task: result.task }) : { ...json({ updated: false, reason: result.reason }), isError: true },
          log: {
            target: [taskId, stage, status].filter(Boolean).join(" → "),
            result: result.ok ? (stage === "Review" || status === "Chờ review" ? "ChoReview" : "OK") : "BiChan",
            projectId: result.projectId,
            taskId: result.ok ? taskId : null,
            ...(result.ok && {
              event: {
                type: "task",
                tone: stage === "Review" || status === "Chờ review" ? "review" : "ok",
                text: `${result.task.title} → ${[stage, status].filter(Boolean).join(" · ")}`,
                taskId,
              },
            }),
          },
        };
      }),
  );

  server.registerTool(
    "tasks_comment",
    {
      title: "Bình luận task",
      description: "Ghi bình luận (tiến độ, câu hỏi, ghi chú bàn giao) lên một task trong dự án của agent — hiện ở mục Bình luận của task.",
      inputSchema: {
        taskId: z.string().trim().min(1).describe("Mã task, vd T-405"),
        body: z.string().trim().min(1).max(4000).describe("Nội dung bình luận (văn bản thường)"),
      },
    },
    async ({ taskId, body }) =>
      logged(agent, policy, "tasks_comment", async () => {
        const result = await commentOnTask(agent.memberId, taskId, body);
        if (result.ok) revalidatePath("/[project]/work", "page");
        return {
          value: result.ok ? json({ commented: true, commentId: result.commentId }) : { ...json({ commented: false, reason: result.reason }), isError: true },
          log: {
            target: taskId,
            result: result.ok ? "OK" : "BiChan",
            projectId: result.projectId,
            taskId: result.ok ? taskId : null,
            ...(result.ok && { event: { type: "task", tone: "ok", text: `Bình luận ${taskId}: ${body.slice(0, 120)}`, taskId } }),
          },
        };
      }),
  );

  server.registerTool(
    "features_propose",
    {
      title: "Đề xuất feature",
      description:
        "Đề xuất một feature mới cho dự án (chỉ agent được phép đề xuất — thường là BA agent). Feature ở trạng thái chờ duyệt, lead duyệt mới vào danh sách chính. Gọi nhiều lần để đề xuất nhiều feature con.",
      inputSchema: {
        projectId: z.string().trim().min(1).describe("Id dự án"),
        name: z.string().trim().min(1).max(120).describe("Tên feature"),
        description: z.string().trim().min(1).max(4000).describe("Mô tả: mục tiêu, phạm vi, vì sao cần"),
      },
    },
    async ({ projectId, name, description }) =>
      logged(agent, policy, "features_propose", async () => {
        const result = await proposeFeature(agent.memberId, { projectId, name, description });
        if (result.ok) revalidatePath("/[project]/work", "page");
        return {
          value: result.ok
            ? json({ proposed: true, featureId: result.featureId, status: "Chờ lead duyệt" })
            : { ...json({ proposed: false, reason: result.reason }), isError: true },
          log: {
            target: result.ok ? `${result.featureId} ${name}` : name,
            result: result.ok ? "ChoReview" : "BiChan",
            projectId: result.projectId,
            ...(result.ok && { event: { type: "feature", tone: "review", text: `Đề xuất ${result.featureId} ${name}`, featureId: result.featureId } }),
          },
        };
      }),
  );

  server.registerTool(
    "docs_read",
    {
      title: "Đọc tài liệu",
      description: "Đọc toàn bộ một tài liệu (tóm tắt + các mục) trong dự án của agent.",
      inputSchema: { docId: z.string().trim().min(1).describe("Id tài liệu, vd mcp-spec") },
      annotations: { readOnlyHint: true },
    },
    async ({ docId }) =>
      logged(agent, policy, "docs_read", async () => {
        const result = await readDocForAgent(agent, docId);
        return {
          value: result.ok ? json(result.doc) : { ...json({ reason: result.reason }), isError: true },
          log: { target: docId, result: result.ok ? "OK" : "BiChan", projectId: result.ok ? result.doc.projectId : null },
        };
      }),
  );

  server.registerTool(
    "docs_search",
    {
      title: "Tìm tài liệu",
      description: "Tìm tài liệu theo từ khoá (tiêu đề, tóm tắt, nội dung; không phân biệt dấu) trong các dự án của agent. Tối đa 10 kết quả.",
      inputSchema: {
        query: z.string().trim().min(2).max(200).describe("Từ khoá"),
        projectId: z.string().trim().min(1).optional().describe("Giới hạn trong một dự án"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ query, projectId }) =>
      logged(agent, policy, "docs_search", async () => {
        const hits = await searchDocsForAgent(agent.memberId, query, projectId);
        return {
          value: json({ count: hits.length, docs: hits }),
          log: { target: `"${query}"`, result: "OK", projectId: await sessionProject(agent.memberId, projectId) },
        };
      }),
  );

  server.registerTool(
    "docs_append",
    {
      title: "Đề xuất sửa tài liệu",
      description:
        "Đề xuất thay đổi một tài liệu. KHÔNG sửa trực tiếp: luôn tạo revision chờ người duyệt. `content` (markdown: `## Mục`, đoạn cách nhau bằng dòng trống) thay toàn bộ nội dung khi được duyệt — đọc bằng docs_read và gửi lại đủ các mục; `summary` thay tóm tắt. Cần ít nhất một trong hai.",
      inputSchema: {
        docId: z.string().trim().min(1).describe("Id tài liệu"),
        what: z.string().trim().min(1).max(300).describe("Mô tả ngắn thay đổi, hiện trong lịch sử revision"),
        summary: z.string().trim().max(2000).optional().describe("Tóm tắt mới"),
        content: z.string().max(100_000).optional().describe("Toàn bộ nội dung mới dạng markdown"),
      },
    },
    async ({ docId, what, summary, content }) =>
      logged(agent, policy, "docs_append", async () => {
        const result = await appendDocForAgent(agent.memberId, { docId, what, summary, content });
        // Badge "Docs" (revision chờ duyệt) + danh sách revision.
        if (result.ok) revalidatePath("/[project]", "layout");
        return {
          value: result.ok
            ? json({ proposed: true, revisionId: result.revisionId, status: "Chờ review — người duyệt sẽ áp vào tài liệu" })
            : { ...json({ proposed: false, reason: result.reason }), isError: true },
          log: {
            target: docId,
            result: result.ok ? "ChoReview" : "BiChan",
            projectId: result.projectId,
            ...(result.ok && { event: { type: "doc", tone: "review", text: `${what} — ${docId}`, docId } }),
          },
        };
      }),
  );

  return server;
}
