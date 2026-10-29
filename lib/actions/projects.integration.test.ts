import { afterAll, describe, expect, it } from "vitest";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/currentUser";
import { getProjects, getProjectsByMember } from "@/lib/data/projects";
import { createProject } from "./projects";

const base = {
  id: "it-partner",
  code: "IP",
  name: "Partner Portal (integration)",
  desc: "Cổng đối tác",
  status: "Chuẩn bị" as const,
  sprintName: "",
  sprintStart: "",
  sprintEnd: "",
};

afterAll(async () => {
  await prisma.project.deleteMany({ where: { id: { startsWith: "it-" } } });
});

describe("createProject (F13.1)", () => {
  it("tạo dự án, người tạo là thành viên, có sprint đầu tiên → hiện ở portfolio + switcher", async () => {
    const result = await createProject({ ...base, code: " ip ", sprintName: "Sprint 1", sprintStart: "2026-11-02", sprintEnd: "2026-11-13" });
    expect(result).toEqual({ ok: true, projectId: "it-partner" });

    const project = (await getProjects()).find((p) => p.id === "it-partner");
    expect(project).toMatchObject({ code: "IP", name: base.name, status: "Chuẩn bị", sprint: "Sprint 1 · 02–13/11" });
    expect((await getProjectsByMember(await getCurrentUserId())).map((p) => p.id)).toContain("it-partner");
    expect(revalidatePath).toHaveBeenCalledWith("/[project]", "layout");
  });

  it("không sprint → 'Chưa có sprint'", async () => {
    expect(await createProject({ ...base, id: "it-nosprint", code: "IN" })).toEqual({ ok: true, projectId: "it-nosprint" });
    expect((await getProjects()).find((p) => p.id === "it-nosprint")?.sprint).toBe("Chưa có sprint");
  });

  it("chặn id/mã trùng, id dành riêng, id sai định dạng, sprint thiếu ngày hoặc ngược ngày", async () => {
    const before = await prisma.project.count();
    expect(await createProject({ ...base, code: "ZZ" })).toEqual({ ok: false, error: 'Id "it-partner" đã có dự án dùng' });
    expect(await createProject({ ...base, id: "it-other", code: "RV" })).toEqual({ ok: false, error: 'Mã "RV" đã có dự án dùng' });
    expect(await createProject({ ...base, id: "login", code: "ZZ" })).toEqual({ ok: false, error: "Id này trùng đường dẫn của hệ thống, chọn id khác" });
    expect(await createProject({ ...base, id: "Có Dấu", code: "ZZ" })).toMatchObject({ ok: false, error: expect.stringContaining("Id 2–40 ký tự") });
    expect(await createProject({ ...base, id: "it-x", code: "Z" })).toEqual({ ok: false, error: "Mã gồm đúng 2 ký tự chữ hoặc số" });
    expect(await createProject({ ...base, id: "it-x", code: "ZZ", sprintName: "S1" })).toEqual({ ok: false, error: "Sprint cần ngày bắt đầu và kết thúc" });
    expect(await createProject({ ...base, id: "it-x", code: "ZZ", sprintName: "S1", sprintStart: "2026-11-10", sprintEnd: "2026-11-01" })).toEqual({
      ok: false,
      error: "Ngày kết thúc sprint phải sau ngày bắt đầu",
    });
    expect(await createProject({ ...base, id: "it-x", code: "ZZ", name: " " })).toEqual({ ok: false, error: "Nhập tên dự án" });
    expect(await prisma.project.count()).toBe(before);
  });
});
