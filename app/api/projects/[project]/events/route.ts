import { getSessionMemberId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getActivityEventsAfter } from "@/lib/data/activity";
import { getMcpLogAfter } from "@/lib/data/mcp";

// Sự kiện mới theo con trỏ cho polling ngắn (F17.2, ADR-016): request ngắn, trả ngay — không SSE / LISTEN.
// `?after=<ms>` = con trỏ lần trước. Không có `after` → không trả sự kiện, chỉ trả con trỏ (= bây giờ) để bắt đầu.
// Con trỏ = thời điểm sự kiện mới nhất đã trả (hoặc giữ nguyên nếu không có gì mới).

export const dynamic = "force-dynamic";

const LIMIT = 50;

export async function GET(request: Request, ctx: RouteContext<"/api/projects/[project]/events">): Promise<Response> {
  const { project } = await ctx.params;
  const memberId = await getSessionMemberId();
  if (!memberId) return Response.json({ error: "Chưa đăng nhập" }, { status: 401 });
  // Chỉ thành viên dự án (như layout F15.3 — không lộ dự án có tồn tại hay không).
  const membership = await prisma.projectMember.findUnique({ where: { projectId_memberId: { projectId: project, memberId } } });
  if (!membership) return Response.json({ error: "Không tìm thấy dự án" }, { status: 404 });

  const raw = new URL(request.url).searchParams.get("after");
  if (raw === null) return Response.json({ cursor: String(Date.now()), events: [], mcpLog: [] }, { headers: { "Cache-Control": "no-store" } });
  const afterMs = Number(raw);
  if (!Number.isFinite(afterMs) || afterMs < 0) return Response.json({ error: "Con trỏ không hợp lệ" }, { status: 400 });
  const after = new Date(afterMs);

  const [events, mcpLog] = await Promise.all([getActivityEventsAfter(project, after, LIMIT), getMcpLogAfter(after, LIMIT)]);
  const latest = Math.max(afterMs, events.latest?.getTime() ?? 0, mcpLog.latest?.getTime() ?? 0);
  return Response.json({ cursor: String(latest), events: events.items, mcpLog: mcpLog.items }, { headers: { "Cache-Control": "no-store" } });
}
