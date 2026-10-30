import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getSessionMemberId } from "@/lib/auth/session";
import { approveRevision, createDoc, editDoc, rejectRevision } from "./docs";
import { createProject, setProjectArchived } from "./projects";
import { addProjectMember, createMember, removeProjectMember, updateAgentConfig } from "./members";
import { createMcpServer, deleteMcpServer } from "./mcpServers";
import { updateTaskStage } from "./tasks";

// F15.4 — người không đủ quyền gọi action bị từ chối, dữ liệu không đổi.
// Nam: không phải tech lead, thuộc rv-web + crm, không thuộc rv-app.
const asNam = () => vi.mocked(getSessionMemberId).mockResolvedValue("nam");
afterEach(() => {
  vi.mocked(getSessionMemberId).mockResolvedValue("hieu");
});

describe("hành động của tech lead", () => {
  beforeEach(asNam);

  it("tạo dự án, quản lý MCP server, sửa cấu hình agent → bị từ chối", async () => {
    expect(
      await createProject({ id: "it-denied", code: "XD", name: "X", desc: "", status: "Chuẩn bị", sprintName: "", sprintStart: "", sprintEnd: "" }),
    ).toEqual({ ok: false, error: "Chỉ tech lead được tạo dự án" });
    expect(await createMcpServer({ name: "it-denied", url: "https://x.example.com", tools: "" })).toEqual({
      ok: false,
      error: "Chỉ tech lead được quản lý MCP server",
    });
    expect(await deleteMcpServer("khong-co")).toEqual({ ok: false, error: "Chỉ tech lead được quản lý MCP server" });
    const atlas = await prisma.agentConfig.findUniqueOrThrow({ where: { memberId: "agent-atlas" } });
    expect(await updateAgentConfig("agent-atlas", { ...atlas, maxConcurrentTasks: 9 })).toEqual({
      ok: false,
      error: "Chỉ tech lead được sửa cấu hình agent",
    });
    expect(await prisma.project.findUnique({ where: { id: "it-denied" } })).toBeNull();
    expect((await prisma.agentConfig.findUniqueOrThrow({ where: { memberId: "agent-atlas" } })).maxConcurrentTasks).toBe(atlas.maxConcurrentTasks);
  });

  it("thêm / gỡ thành viên, lưu trữ dự án (dù thuộc dự án) → bị từ chối", async () => {
    const denied = { ok: false, error: "Chỉ tech lead được thêm / gỡ thành viên" };
    expect(await addProjectMember("crm", "agent-vega")).toEqual(denied);
    expect(await removeProjectMember("crm", "agent-scout")).toEqual(denied);
    expect(await createMember({ projectId: "crm", kind: "human", name: "IT Denied", handle: "", role: "QA", skills: "", email: "" })).toEqual(denied);
    expect(await setProjectArchived("crm", true)).toEqual({ ok: false, error: "Chỉ tech lead được lưu trữ / khôi phục dự án" });
    expect(await prisma.projectMember.count({ where: { projectId: "crm", memberId: { in: ["agent-vega", "agent-scout"] } } })).toBe(1);
  });
});

describe("tài liệu: duyệt / sửa chỉ tech lead hoặc người tạo dự án", () => {
  afterAll(async () => {
    await prisma.project.update({ where: { id: "rv-web" }, data: { createdById: null } });
  });

  it("thành viên thường → không duyệt / từ chối / sửa trực tiếp được", async () => {
    asNam();
    const rev = await prisma.docRevision.findFirstOrThrow({ where: { status: "pending", doc: { projectId: "rv-web" } }, select: { id: true } });
    const doc = await prisma.doc.findFirstOrThrow({ where: { projectId: "rv-web" }, select: { id: true, version: true } });
    expect(await approveRevision(rev.id, "rv-web")).toEqual({ ok: false, error: "Chỉ tech lead hoặc người tạo dự án được duyệt / từ chối revision" });
    expect(await rejectRevision(rev.id, "rv-web", "lý do")).toEqual({ ok: false, error: "Chỉ tech lead hoặc người tạo dự án được duyệt / từ chối revision" });
    expect(await editDoc({ docId: doc.id, projectId: "rv-web", baseVersion: doc.version, what: "", summary: "x", content: "## A\n\nb" })).toEqual({
      ok: false,
      error: "Chỉ tech lead hoặc người tạo dự án được sửa trực tiếp tài liệu",
    });
    expect((await prisma.docRevision.findUniqueOrThrow({ where: { id: rev.id } })).status).toBe("pending");
  });

  it("người tạo dự án (không phải tech lead) → được duyệt", async () => {
    await prisma.project.update({ where: { id: "rv-web" }, data: { createdById: "nam" } });
    asNam();
    // Revision không tồn tại → qua được bước quyền, dừng ở bước tìm revision.
    expect(await approveRevision("khong-co", "rv-web")).toEqual({ ok: false, error: "Không tìm thấy revision trong dự án này" });
    const doc = await prisma.doc.findFirstOrThrow({ where: { projectId: "rv-web" }, select: { id: true } });
    expect(await editDoc({ docId: doc.id, projectId: "rv-web", baseVersion: "v0.0-cu", what: "", summary: "x", content: "## A\n\nb" })).not.toMatchObject({
      error: expect.stringContaining("Chỉ tech lead"),
    });
  });
});

describe("thành viên dự án", () => {
  it("không thuộc dự án → không thao tác task / tạo tài liệu (như không tồn tại)", async () => {
    asNam();
    const task = await prisma.task.findFirstOrThrow({ where: { feature: { projectId: "rv-app" } }, select: { id: true, stage: true } });
    expect(await updateTaskStage(task.id, task.stage === "Dev" ? "Review" : "Dev")).toEqual({ ok: false, error: "Không tìm thấy dự án" });
    expect(await createDoc({ projectId: "rv-app", featureId: "", title: "IT", summary: "", content: "## A\n\nb" })).toEqual({
      ok: false,
      error: "Không tìm thấy dự án",
    });
    expect((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).stage).toBe(task.stage);
  });
});
