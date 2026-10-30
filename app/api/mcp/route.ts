import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { verifyAgentToken } from "@/lib/auth/agentToken";
import { createMeridianMcpServer } from "@/lib/mcp/server";

// Endpoint MCP (F16.1, ADR-022): Streamable HTTP **stateless**, trả JSON — mỗi POST là một request ngắn,
// không mở stream SSE (GET) vì Cloud Run tính tiền suốt thời gian request mở (ADR-016).
// Xác thực: `Authorization: Bearer <token agent>` (F15.5). proxy.ts không chặn /api/mcp (không có session người).

export const dynamic = "force-dynamic";

function unauthorized(message: string): Response {
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32001, message }, id: null },
    { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="meridian-mcp"' } },
  );
}

export async function POST(request: Request): Promise<Response> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match) return unauthorized("Thiếu token agent (Authorization: Bearer <token>)");
  const agent = await verifyAgentToken(match[1]);
  if (!agent) return unauthorized("Token agent không hợp lệ hoặc đã bị thu hồi");

  const server = createMeridianMcpServer(agent);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    // Stateless: đóng ngay sau khi trả lời (response JSON đã có đủ nội dung).
    await server.close();
  }
}

// Không hỗ trợ stream SSE (GET) / kết thúc phiên (DELETE) ở chế độ stateless.
function methodNotAllowed(): Response {
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32000, message: "Chỉ hỗ trợ POST (Streamable HTTP stateless)" }, id: null },
    { status: 405, headers: { Allow: "POST" } },
  );
}

export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;
