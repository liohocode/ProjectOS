import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { CORE_SERVER_ID, displayToolName, recordToolCall, SESSION_IDLE_MS } from "./audit";

// F16.2 — nhật ký + phiên cho lệnh MCP. Dùng Scout trên rv-web; mốc thời gian giả trong tương lai xa để tách khỏi dữ liệu seed.
const T0 = new Date("2030-01-01T08:00:00Z");
const at = (ms: number) => new Date(T0.getTime() + ms);
let coreLastCommand: Date | null = null;

beforeAll(async () => {
  coreLastCommand = (await prisma.mcpServer.findUniqueOrThrow({ where: { id: CORE_SERVER_ID } })).lastCommandAt;
});
afterAll(async () => {
  await prisma.mcpLogEntry.deleteMany({ where: { agentId: "agent-scout", at: { gte: T0 } } });
  await prisma.mcpSession.deleteMany({ where: { agentId: "agent-scout", startedAt: { gte: T0 } } });
  await prisma.mcpServer.update({ where: { id: CORE_SERVER_ID }, data: { lastCommandAt: coreLastCommand } });
});

const sessions = () => prisma.mcpSession.findMany({ where: { agentId: "agent-scout", startedAt: { gte: T0 } }, orderBy: { startedAt: "asc" } });

describe("recordToolCall (F16.2)", () => {
  it("tên hiển thị dạng tasks.list", () => {
    expect(displayToolName("tasks_list")).toBe("tasks.list");
    expect(displayToolName("tasks_update_status")).toBe("tasks.update_status");
  });

  it("lệnh đầu → dòng nhật ký + phiên mới 'Đang chạy'; lệnh sau trong 30 phút → cùng phiên, toolCalls tăng, gắn task", async () => {
    await recordToolCall({ agentId: "agent-scout", tool: "tasks_list", target: "rv-web", result: "OK", projectId: "rv-web" }, at(0));
    await recordToolCall({ agentId: "agent-scout", tool: "tasks_list", target: "T-405", result: "OK", projectId: "rv-web", taskId: "T-405" }, at(10 * 60_000));

    const log = await prisma.mcpLogEntry.findMany({ where: { agentId: "agent-scout", at: { gte: T0 } }, orderBy: { at: "asc" } });
    expect(log.map((l) => [l.tool, l.target, l.result])).toEqual([
      ["tasks.list", "rv-web", "OK"],
      ["tasks.list", "T-405", "OK"],
    ]);
    const [s] = await sessions();
    expect(s).toMatchObject({ projectId: "rv-web", taskId: "T-405", toolCalls: 2, result: "DangChay", endedAt: null });
    expect((await prisma.mcpServer.findUniqueOrThrow({ where: { id: CORE_SERVER_ID } })).lastCommandAt).toEqual(at(10 * 60_000));
  });

  it("nghỉ quá 30 phút → phiên cũ đóng tại lệnh cuối ('Xong'), mở phiên mới", async () => {
    const later = at(10 * 60_000 + SESSION_IDLE_MS + 60_000);
    await recordToolCall({ agentId: "agent-scout", tool: "tasks_list", target: "rv-web", result: "OK", projectId: "rv-web" }, later);
    const [old, fresh] = await sessions();
    expect(old).toMatchObject({ endedAt: at(10 * 60_000), result: "Xong", toolCalls: 2 });
    expect(fresh).toMatchObject({ startedAt: later, toolCalls: 1, result: "DangChay", endedAt: null });
  });

  it("không xác định dự án → chỉ ghi nhật ký, không đụng phiên", async () => {
    const before = (await sessions()).length;
    await recordToolCall({ agentId: "agent-scout", tool: "tasks_list", target: "mọi dự án", result: "BiChan" }, at(2 * SESSION_IDLE_MS));
    expect((await sessions()).length).toBe(before);
    expect(await prisma.mcpLogEntry.count({ where: { agentId: "agent-scout", at: at(2 * SESSION_IDLE_MS), result: "BiChan" } })).toBe(1);
  });
});
