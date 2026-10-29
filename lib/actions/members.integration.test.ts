import { afterAll, describe, expect, it } from "vitest";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTeamByProject } from "@/lib/data/team";
import { addProjectMember, createMember, loadMemberActivity } from "./members";

// crm seed: không có agent-vega → dùng để thử "Từ tổ chức".
afterAll(async () => {
  await prisma.projectMember.deleteMany({ where: { projectId: "crm", memberId: "agent-vega" } });
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
