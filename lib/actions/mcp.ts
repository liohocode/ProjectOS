"use server";

import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/currentUser";
import { getMcpLog, getMcpSessions } from "@/lib/data/mcp";
import { parseMcpFilter } from "@/lib/filters";
import type { McpLogEntry, McpSession, Page } from "@/lib/types";
import { fail, type ActionResult } from "./result";

// "Xem thêm" ở bảng MCP (F14.4) — chỉ đọc; trang kế tiếp sau `cursor`, cùng bộ lọc với trang đầu.
const cursorSchema = z.string().trim().min(1, "Thiếu vị trí trang");

export async function loadMoreMcpSessions(
  cursor: string,
  filter: Record<string, string | undefined>,
): Promise<ActionResult<{ page: Page<McpSession> }>> {
  await getCurrentUserId(); // chưa đăng nhập → /login
  const parsed = cursorSchema.safeParse(cursor);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const f = parseMcpFilter(filter);
  return { ok: true, page: await getMcpSessions({ cursor: parsed.data, agent: f.agent, project: f.project, result: f.result }) };
}

export async function loadMoreMcpLog(
  cursor: string,
  filter: Record<string, string | undefined>,
): Promise<ActionResult<{ page: Page<McpLogEntry> }>> {
  await getCurrentUserId();
  const parsed = cursorSchema.safeParse(cursor);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  return { ok: true, page: await getMcpLog({ cursor: parsed.data, agent: parseMcpFilter(filter).agent }) };
}
