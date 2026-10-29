import { afterAll, describe, expect, it } from "vitest";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getMcpServers } from "@/lib/data/mcp";
import { createMcpServer, deleteMcpServer, updateMcpServer } from "./mcpServers";

afterAll(async () => {
  await prisma.mcpServer.deleteMany({ where: { id: { startsWith: "it-" } } });
});

describe("MCP server ngoài (F13.6)", () => {
  const base = { name: "IT GitHub Tools", url: "https://it-github.example.com/mcp", tools: "repo.read, pr.create\nrepo.read" };

  it("kết nối: id slug, trạng thái giới hạn, chưa có lệnh, tool bỏ trùng", async () => {
    expect(await createMcpServer(base)).toEqual({ ok: true, serverId: "it-github-tools" });
    const server = (await getMcpServers()).find((s) => s.id === "it-github-tools");
    expect(server).toMatchObject({ status: "limited", tools: ["repo.read", "pr.create"], clients: 0, lastCommandAgo: null, internal: false });
    expect((await getMcpServers()).find((s) => s.id === "meridian-core")?.internal).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/[project]", "layout");
  });

  it("sửa tên/URL/tool; chặn URL trùng, URL sai, server nội bộ", async () => {
    expect(await updateMcpServer("it-github-tools", { ...base, name: "IT GitHub", tools: "repo.read" })).toEqual({ ok: true });
    expect((await prisma.mcpServer.findUniqueOrThrow({ where: { id: "it-github-tools" } })).name).toBe("IT GitHub");
    const core = await prisma.mcpServer.findUniqueOrThrow({ where: { id: "meridian-core" } });
    expect(await createMcpServer({ ...base, name: "IT dup", url: core.url })).toEqual({ ok: false, error: "Đã có server dùng URL này" });
    expect(await createMcpServer({ ...base, url: "ftp://x.example.com" })).toEqual({ ok: false, error: "URL phải bắt đầu bằng http(s):// hoặc ws(s)://" });
    expect(await createMcpServer({ ...base, url: "khong-phai-url" })).toEqual({ ok: false, error: "URL không hợp lệ" });
    expect(await updateMcpServer("meridian-core", base)).toEqual({ ok: false, error: "Không sửa/xoá được server nội bộ của Meridian" });
    expect(await deleteMcpServer("meridian-docs")).toEqual({ ok: false, error: "Không sửa/xoá được server nội bộ của Meridian" });
  });

  it("xoá server → gỡ khỏi cấu hình agent đang dùng", async () => {
    const atlas = await prisma.agentConfig.findUniqueOrThrow({ where: { memberId: "agent-atlas" } });
    await prisma.agentConfig.update({ where: { memberId: "agent-atlas" }, data: { mcpServers: [...atlas.mcpServers, "it-github-tools"] } });
    expect(await deleteMcpServer("it-github-tools")).toEqual({ ok: true });
    expect(await prisma.mcpServer.findUnique({ where: { id: "it-github-tools" } })).toBeNull();
    expect((await prisma.agentConfig.findUniqueOrThrow({ where: { memberId: "agent-atlas" } })).mcpServers).toEqual(atlas.mcpServers);
    expect(await deleteMcpServer("it-github-tools")).toEqual({ ok: false, error: "Không tìm thấy server" });
  });
});
