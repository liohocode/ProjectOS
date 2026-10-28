import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getMcpLog, getMcpSessions, MCP_PAGE_SIZE } from "./mcp";
import { loadMoreMcpLog } from "@/lib/actions/mcp";

// F14.4 — thêm 60 dòng nhật ký tạm (> 1 trang) cho agent-scout, phân trang hết rồi xoá.
const EXTRA = 60;
const TOOL = "test.pagination";

beforeAll(async () => {
  // Sau dòng mới nhất đang có (seed đặt giờ theo dữ liệu mẫu) → 60 dòng tạm là mới nhất.
  const latest = await prisma.mcpLogEntry.aggregate({ _max: { at: true } });
  const base = (latest._max.at?.getTime() ?? Date.now()) + 1000;
  await prisma.mcpLogEntry.createMany({
    data: Array.from({ length: EXTRA }, (_, i) => ({
      at: new Date(base + i * 1000),
      agentId: "agent-scout",
      tool: TOOL,
      target: `#${i}`,
      result: "OK" as const,
    })),
  });
});

afterAll(async () => {
  await prisma.mcpLogEntry.deleteMany({ where: { tool: TOOL } });
});

async function allPages(agent?: string) {
  const seen: { id: string; target: string }[] = [];
  let page = await getMcpLog({ agent });
  let pages = 1;
  seen.push(...page.items);
  while (page.nextCursor) {
    page = await getMcpLog({ agent, cursor: page.nextCursor });
    seen.push(...page.items);
    pages++;
  }
  return { seen, pages };
}

describe("phân trang nhật ký lệnh MCP", () => {
  it("trang đầu đủ MCP_PAGE_SIZE dòng, mới nhất trước, có nextCursor", async () => {
    const first = await getMcpLog();
    expect(first.items).toHaveLength(MCP_PAGE_SIZE);
    expect(first.nextCursor).toBe(first.items.at(-1)!.id);
    expect(first.items[0].target).toBe(`#${EXTRA - 1}`); // dòng tạm mới nhất
  });

  it("đi hết các trang: không trùng, không sót, đúng thứ tự thời gian giảm dần", async () => {
    const total = await prisma.mcpLogEntry.count();
    const { seen, pages } = await allPages();
    expect(pages).toBe(Math.ceil(total / MCP_PAGE_SIZE));
    expect(new Set(seen.map((e) => e.id)).size).toBe(total);
    const extra = seen.filter((e) => e.target.startsWith("#")).map((e) => Number(e.target.slice(1)));
    expect(extra).toEqual(Array.from({ length: EXTRA }, (_, i) => EXTRA - 1 - i));
  });

  it("lọc theo agent trong DB — mọi trang chỉ của agent đó", async () => {
    const { seen } = await allPages("agent-scout");
    const scoutTotal = await prisma.mcpLogEntry.count({ where: { agentId: "agent-scout" } });
    expect(seen).toHaveLength(scoutTotal);
  });

  it("server action Xem thêm trả trang kế tiếp cùng bộ lọc; cursor rỗng bị từ chối", async () => {
    const first = await getMcpLog({ agent: "agent-scout" });
    const more = await loadMoreMcpLog(first.nextCursor!, { agent: "agent-scout" });
    expect(more.ok && more.page.items.every((e) => e.agentId === "agent-scout")).toBe(true);
    expect(await loadMoreMcpLog(" ", {})).toEqual({ ok: false, error: "Thiếu vị trí trang" });
  });

  it("phiên chạy: lọc theo agent + kết quả trong DB", async () => {
    const vega = await getMcpSessions({ agent: "agent-vega" });
    expect(vega.items.length).toBeGreaterThan(0);
    expect(vega.items.every((s) => s.agentId === "agent-vega")).toBe(true);
    const running = await getMcpSessions({ result: "DangChay" });
    expect(running.items.every((s) => s.result === "Đang chạy")).toBe(true);
  });
});
