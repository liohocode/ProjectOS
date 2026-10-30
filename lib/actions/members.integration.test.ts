import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTeam, getTeamByProject } from "@/lib/data/team";
import { addProjectMember, createMember, loadMemberActivity, removeProjectMember, updateAgentConfig } from "./members";

// crm seed: không có agent-vega → dùng để thử "Từ tổ chức".
afterAll(async () => {
  await prisma.projectMember.deleteMany({ where: { projectId: "crm", memberId: "agent-vega" } });
  await prisma.projectMember.upsert({
    where: { projectId_memberId: { projectId: "crm", memberId: "agent-scout" } },
    create: { projectId: "crm", memberId: "agent-scout" },
    update: {},
  });
  await prisma.member.deleteMany({ where: { name: { startsWith: "IT " } } });
});

describe("addProjectMember (F13.2)", () => {
  it("gán agent có sẵn vào dự án → có trong danh sách dự án", async () => {
    expect((await getTeamByProject("crm")).some((m) => m.id === "agent-vega")).toBe(false);
    expect(await addProjectMember("crm", "agent-vega")).toEqual({ ok: true });
    expect((await getTeamByProject("crm")).some((m) => m.id === "agent-vega")).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/[project]", "layout");
  });

  it("chặn đã thuộc dự án, thành viên/dự án không tồn tại, thiếu input", async () => {
    expect(await addProjectMember("crm", "agent-vega")).toEqual({ ok: false, error: "Vega đã thuộc dự án này" });
    expect(await addProjectMember("crm", "khong-co")).toEqual({ ok: false, error: "Không tìm thấy thành viên" });
    expect(await addProjectMember("khong-co", "agent-vega")).toEqual({ ok: false, error: "Không tìm thấy dự án" });
    expect(await addProjectMember("crm", " ")).toEqual({ ok: false, error: "Chọn thành viên" });
  });
});

describe("createMember (F13.2)", () => {
  const base = { projectId: "crm", kind: "human" as const, name: "IT Ngọc Ánh", handle: "", role: "QA", skills: "Testing, , Playwright", email: "" };

  it("tạo người: id slug, handle @slug, skills tách dấu phẩy, gán vào dự án; trùng tên → hậu tố", async () => {
    expect(await createMember({ ...base, email: "IT.Anh@Example.com" })).toEqual({ ok: true, memberId: "it-ngoc-anh" });
    const m = await prisma.member.findUniqueOrThrow({ where: { id: "it-ngoc-anh" }, include: { projects: true } });
    expect(m).toMatchObject({ handle: "@it-ngoc-anh", kind: "human", skills: ["Testing", "Playwright"], status: "Cho", email: "it.anh@example.com" });
    expect(m.projects.map((p) => p.projectId)).toEqual(["crm"]);
    expect(await createMember(base)).toEqual({ ok: true, memberId: "it-ngoc-anh-2" });
  });

  it("tạo agent: id agent-<slug>, handle mặc định 'agent'", async () => {
    expect(await createMember({ ...base, kind: "agent", name: "IT Lyra", role: "QA agent" })).toEqual({ ok: true, memberId: "agent-it-lyra" });
    expect((await prisma.member.findUniqueOrThrow({ where: { id: "agent-it-lyra" } })).handle).toBe("agent");
  });

  it("chặn email trùng / sai, agent có email, thiếu tên/vai trò", async () => {
    expect(await createMember({ ...base, email: "it.anh@example.com" })).toEqual({ ok: false, error: "Email này đã thuộc một thành viên khác" });
    expect(await createMember({ ...base, email: "khong-phai-email" })).toEqual({ ok: false, error: "Email không hợp lệ" });
    expect(await createMember({ ...base, kind: "agent", email: "a@b.co" })).toEqual({ ok: false, error: "Agent không có email đăng nhập" });
    expect(await createMember({ ...base, name: " " })).toEqual({ ok: false, error: "Nhập tên" });
    expect(await createMember({ ...base, role: "" })).toEqual({ ok: false, error: "Nhập vai trò" });
  });
});

describe("loadMemberActivity (F13.4)", () => {
  // 25 dòng mới nhất cho "nam" → trang 20 + trang 5; xoá sau.
  const base = Date.now() + 60_000;
  afterAll(async () => {
    await prisma.memberActivity.deleteMany({ where: { memberId: "nam", text: { startsWith: "IT log " } } });
  });

  it("trang đầu 20 dòng mới nhất, 'Xem thêm' nối tiếp không trùng, hết thì nextCursor null", async () => {
    await prisma.memberActivity.createMany({
      data: Array.from({ length: 25 }, (_, i) => ({ memberId: "nam", icon: "ph-dot", text: `IT log ${i}`, at: new Date(base + i * 1000) })),
    });
    const total = await prisma.memberActivity.count({ where: { memberId: "nam" } });

    const first = await loadMemberActivity("nam", null);
    if (!first.ok) throw new Error(first.error);
    expect(first.page.items).toHaveLength(20);
    expect(first.page.items[0].text).toBe("IT log 24");
    expect(first.page.nextCursor).not.toBeNull();

    const seen = [...first.page.items];
    let cursor = first.page.nextCursor;
    while (cursor) {
      const next = await loadMemberActivity("nam", cursor);
      if (!next.ok) throw new Error(next.error);
      seen.push(...next.page.items);
      cursor = next.page.nextCursor;
    }
    expect(seen).toHaveLength(total);
    expect(new Set(seen.map((a) => a.id)).size).toBe(total);
    expect(await loadMemberActivity(" ", null)).toEqual({ ok: false, error: "Chọn thành viên" });
  });
});

describe("AgentConfig (F13.5)", () => {
  let seed: Awaited<ReturnType<typeof prisma.agentConfig.findUniqueOrThrow>>;
  beforeAll(async () => {
    seed = await prisma.agentConfig.findUniqueOrThrow({ where: { memberId: "agent-atlas" } });
  });
  afterAll(async () => {
    const { memberId, extra, ...rest } = seed;
    await prisma.agentConfig.update({ where: { memberId }, data: { ...rest, extra: extra ?? undefined } });
  });

  it("seed chuyển sang cấu trúc; panel dựng lại dòng hiển thị", async () => {
    const vega = (await getTeam()).find((m) => m.id === "agent-vega")!;
    expect(vega.agentConfig).toMatchObject({ docsWritePermission: "append_edit_spec", canAssignTo: ["agent-atlas", "agent-scout"] });
    expect(vega.config).toContainEqual(["Được phép giao task", "Cho Atlas, Scout"]);
    expect(vega.config).toContainEqual(["Quyền ghi docs", "Append + sửa spec"]);
    expect(vega.config).toContainEqual(["Token tuần này", "3.2M"]);
    expect((await getTeam()).find((m) => m.id === "hieu")?.config).toBeUndefined();
  });

  it("sửa cấu hình → đọc lại giữ nguyên", async () => {
    const input = {
      model: "claude-opus-4.5",
      mcpServers: ["meridian-core", "meridian-docs", "meridian-core"],
      docsWritePermission: "append_edit_spec" as const,
      maxConcurrentTasks: 3,
      canProposeFeatures: true,
      canAssignTo: ["agent-scout"],
    };
    expect(await updateAgentConfig("agent-atlas", input)).toEqual({ ok: true });
    const atlas = (await getTeam()).find((m) => m.id === "agent-atlas")!;
    expect(atlas.agentConfig).toMatchObject({ ...input, mcpServers: ["meridian-core", "meridian-docs"] });
    expect(atlas.config).toContainEqual(["Task đồng thời", "tối đa 3"]);
    expect(atlas.config).toContainEqual(["Tool đặc thù", "features.propose"]);
  });

  it("chặn người, tự giao cho mình, giao cho người, số task sai, model trống", async () => {
    const base = { model: "m", mcpServers: [], docsWritePermission: "read_only" as const, maxConcurrentTasks: 2, canProposeFeatures: false, canAssignTo: [] };
    expect(await updateAgentConfig("hieu", base)).toEqual({ ok: false, error: "Chỉ agent có cấu hình" });
    expect(await updateAgentConfig("agent-atlas", { ...base, canAssignTo: ["agent-atlas"] })).toEqual({ ok: false, error: "Agent không tự giao task cho chính mình" });
    expect(await updateAgentConfig("agent-atlas", { ...base, canAssignTo: ["nam"] })).toEqual({ ok: false, error: "Chỉ giao task cho agent khác" });
    expect(await updateAgentConfig("agent-atlas", { ...base, maxConcurrentTasks: 0 })).toEqual({ ok: false, error: "Tối thiểu 1 task" });
    expect(await updateAgentConfig("agent-atlas", { ...base, model: " " })).toEqual({ ok: false, error: "Nhập model" });
  });

  it("agent tạo mới có cấu hình mặc định", async () => {
    const created = await createMember({ projectId: "crm", kind: "agent", name: "IT Nova", handle: "", role: "QA agent", skills: "", email: "" });
    if (!created.ok) throw new Error(created.error);
    const nova = (await getTeam()).find((m) => m.id === created.memberId)!;
    expect(nova.agentConfig).toMatchObject({ model: "", docsWritePermission: "read_only", maxConcurrentTasks: 2 });
    expect(nova.config?.[0]).toEqual(["Model", "Chưa đặt"]);
  });
});

describe("removeProjectMember (F13.7)", () => {
  it("gỡ agent không còn việc → mất khỏi danh sách dự án, hồ sơ tổ chức giữ nguyên", async () => {
    expect(await removeProjectMember("crm", "agent-scout")).toEqual({ ok: true });
    expect((await getTeamByProject("crm")).some((m) => m.id === "agent-scout")).toBe(false);
    expect((await getTeam()).some((m) => m.id === "agent-scout")).toBe(true);
    expect(await removeProjectMember("crm", "agent-scout")).toEqual({ ok: false, error: "Scout không thuộc dự án này" });
  });

  it("chặn còn task chưa Done, tự gỡ mình, thành viên/dự án không tồn tại", async () => {
    expect(await removeProjectMember("crm", "agent-atlas")).toEqual({
      ok: false,
      error: "Atlas còn 2 task chưa Done trong dự án — giao lại cho người khác trước",
    });
    expect(await removeProjectMember("crm", "hieu")).toEqual({ ok: false, error: "Không tự gỡ mình khỏi dự án — nhờ thành viên khác gỡ" });
    expect(await removeProjectMember("crm", "khong-co")).toEqual({ ok: false, error: "Không tìm thấy thành viên" });
    expect(await removeProjectMember("khong-co", "agent-atlas")).toEqual({ ok: false, error: "Không tìm thấy dự án" });
    expect((await getTeamByProject("crm")).some((m) => m.id === "agent-atlas")).toBe(true);
  });

  it("chặn còn phụ trách feature chưa Done (dù không còn task)", async () => {
    const feature = await prisma.feature.findFirstOrThrow({ where: { projectId: "crm", stage: { not: "Done" } } });
    await prisma.feature.update({ where: { id: feature.id }, data: { ownerId: "agent-bao" } });
    try {
      expect(await removeProjectMember("crm", "agent-bao")).toEqual({
        ok: false,
        error: "Bảo còn phụ trách 1 feature chưa Done — đổi người phụ trách trước",
      });
    } finally {
      await prisma.feature.update({ where: { id: feature.id }, data: { ownerId: feature.ownerId } });
    }
  });
});
