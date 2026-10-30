"use server";

import { authorize } from "@/lib/auth/authorize";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { INTERNAL_MCP_SERVERS } from "@/lib/data/mcp";
import { fail, ok, type ActionResult } from "./result";
import { recordActivity } from "./_activity";

// MCP server ngoài (F13.6). Kiểm tra sức khoẻ thật là F16.8 — server mới để trạng thái "limited".

const serverSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên server").max(60, "Tên tối đa 60 ký tự"),
  url: z
    .string()
    .trim()
    .url("URL không hợp lệ")
    .refine((u) => /^(https?|wss?):\/\//.test(u), "URL phải bắt đầu bằng http(s):// hoặc ws(s)://"),
  /** Cách nhau bằng dấu phẩy hoặc xuống dòng */
  tools: z.string().trim().max(2000, "Danh sách tool quá dài"),
});

export type McpServerInput = z.input<typeof serverSchema>;

const parseTools = (tools: string) => [...new Set(tools.split(/[,\n]/).map((t) => t.trim()).filter(Boolean))];

// Thẻ server ở màn MCP + footer "MCP: n/m server online" ở sidebar mọi dự án.
const revalidateServerViews = () => revalidatePath("/[project]", "layout");

export async function createMcpServer(input: McpServerInput): Promise<ActionResult<{ serverId: string }>> {
  const denied = await authorize("mcpServer.manage");
  if (denied) return fail(denied);
  const parsed = serverSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const data = parsed.data;

  if (await prisma.mcpServer.findFirst({ where: { url: data.url }, select: { id: true } })) return fail("Đã có server dùng URL này");
  const base = slugify(data.name, "mcp-server");
  const taken = new Set((await prisma.mcpServer.findMany({ where: { id: { startsWith: base } }, select: { id: true } })).map((s) => s.id));
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;

  await prisma.mcpServer.create({
    data: { id, name: data.name, url: data.url, tools: parseTools(data.tools), status: "limited", clients: 0, commandsPerDay: 0, lastCommandAt: null },
  });
  await recordActivity("ph-plugs-connected", `Kết nối MCP server ${data.name}`);
  revalidateServerViews();
  return { ok: true, serverId: id };
}

const serverIdSchema = z.string().trim().min(1, "Thiếu server");

async function editableServer(id: string): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  if (INTERNAL_MCP_SERVERS.includes(id)) return { ok: false, error: "Không sửa/xoá được server nội bộ của Meridian" };
  const row = await prisma.mcpServer.findUnique({ where: { id }, select: { name: true } });
  return row ? { ok: true, name: row.name } : { ok: false, error: "Không tìm thấy server" };
}

export async function updateMcpServer(serverId: string, input: McpServerInput): Promise<ActionResult> {
  const denied = await authorize("mcpServer.manage");
  if (denied) return fail(denied);
  const id = serverIdSchema.safeParse(serverId);
  if (!id.success) return fail(id.error.issues[0].message);
  const parsed = serverSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const server = await editableServer(id.data);
  if (!server.ok) return server;
  if (await prisma.mcpServer.findFirst({ where: { url: parsed.data.url, id: { not: id.data } }, select: { id: true } })) {
    return fail("Đã có server dùng URL này");
  }

  await prisma.mcpServer.update({
    where: { id: id.data },
    data: { name: parsed.data.name, url: parsed.data.url, tools: parseTools(parsed.data.tools) },
  });
  revalidateServerViews();
  return ok();
}

/** Xoá server ngoài; gỡ luôn khỏi danh sách MCP server trong cấu hình agent (F13.5). */
export async function deleteMcpServer(serverId: string): Promise<ActionResult> {
  const denied = await authorize("mcpServer.manage");
  if (denied) return fail(denied);
  const id = serverIdSchema.safeParse(serverId);
  if (!id.success) return fail(id.error.issues[0].message);
  const server = await editableServer(id.data);
  if (!server.ok) return server;

  await prisma.$transaction([
    prisma.$executeRaw`UPDATE agent_configs SET "mcpServers" = array_remove("mcpServers", ${id.data}) WHERE ${id.data} = ANY("mcpServers")`,
    prisma.mcpServer.delete({ where: { id: id.data } }),
  ]);
  await recordActivity("ph-plugs", `Gỡ MCP server ${server.name}`);
  revalidateServerViews();
  return ok();
}
