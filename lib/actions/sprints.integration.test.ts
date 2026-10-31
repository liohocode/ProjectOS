import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getSessionMemberId } from "@/lib/auth/session";
import { getProjectById, getSprintsByProject } from "@/lib/data/projects";
import { createSprint, setCurrentSprint, setTaskSprint } from "./sprints";

// F21.3 — sprint. Trung Hiếu (tech lead) mặc định; Nam là thành viên thường của rv-web. Trả lại sprint hiện tại + task seed.
const startedAt = new Date();
let seedSprintId = "";
let seedTaskSprint: string | null = null;

beforeAll(async () => {
  seedSprintId = (await prisma.project.findUniqueOrThrow({ where: { id: "rv-web" } })).currentSprintId!;
  seedTaskSprint = (await prisma.task.findUniqueOrThrow({ where: { id: "T-409" } })).sprintId;
});
afterAll(async () => {
  await prisma.project.update({ where: { id: "rv-web" }, data: { currentSprintId: seedSprintId } });
  await prisma.task.update({ where: { id: "T-409" }, data: { sprintId: seedTaskSprint } });
  await prisma.sprint.deleteMany({ where: { name: { startsWith: "IT " } } });
  await prisma.activityEvent.deleteMany({ where: { at: { gte: startedAt } } });
  await prisma.memberActivity.deleteMany({ where: { at: { gte: startedAt } } });
});

const input = { projectId: "rv-web", name: "IT Sprint 15", startDate: "2026-08-27", endDate: "2026-09-09", makeCurrent: true };

describe("sprint (F21.3)", () => {
  it("thành viên thường không tạo / đổi sprint hiện tại được", async () => {
    vi.mocked(getSessionMemberId).mockResolvedValue("nam");
    try {
      expect(await createSprint(input)).toEqual({ ok: false, error: "Chỉ tech lead hoặc người tạo dự án được tạo / đổi sprint hiện tại" });
      expect(await setCurrentSprint("rv-web", seedSprintId)).toMatchObject({ ok: false });
    } finally {
      vi.mocked(getSessionMemberId).mockResolvedValue("hieu");
    }
  });

  it("tech lead tạo sprint + đặt hiện tại → header đổi; đặt lại sprint cũ", async () => {
    const r = await createSprint(input);
    expect(r).toMatchObject({ ok: true, sprintId: expect.any(String) });
    expect((await getProjectById("rv-web"))?.sprint).toBe("IT Sprint 15 · 27/08–09/09");
    const sprints = await getSprintsByProject("rv-web");
    expect(sprints[0]).toMatchObject({ name: "IT Sprint 15", current: true });
    expect(sprints.filter((s) => s.current)).toHaveLength(1);

    expect(await createSprint({ ...input, endDate: "2026-08-01" })).toEqual({ ok: false, error: "Ngày kết thúc phải sau ngày bắt đầu" });
    expect(await setCurrentSprint("rv-web", seedSprintId)).toEqual({ ok: true });
    expect((await getProjectById("rv-web"))?.currentSprintId).toBe(seedSprintId);
    // Sprint của dự án khác → không tìm thấy.
    const crmSprint = (await prisma.project.findUniqueOrThrow({ where: { id: "crm" } })).currentSprintId!;
    expect(await setCurrentSprint("rv-web", crmSprint)).toEqual({ ok: false, error: "Không tìm thấy sprint" });
  });

  it("thành viên xếp task vào sprint / bỏ khỏi sprint; sprint dự án khác → chặn", async () => {
    vi.mocked(getSessionMemberId).mockResolvedValue("nam");
    try {
      const newSprint = (await prisma.sprint.findFirstOrThrow({ where: { name: "IT Sprint 15" } })).id;
      expect(await setTaskSprint("T-409", newSprint)).toEqual({ ok: true });
      expect((await prisma.task.findUniqueOrThrow({ where: { id: "T-409" } })).sprintId).toBe(newSprint);
      expect(await setTaskSprint("T-409", null)).toEqual({ ok: true });
      expect((await prisma.task.findUniqueOrThrow({ where: { id: "T-409" } })).sprintId).toBeNull();
      const crmSprint = (await prisma.project.findUniqueOrThrow({ where: { id: "crm" } })).currentSprintId!;
      expect(await setTaskSprint("T-409", crmSprint)).toEqual({ ok: false, error: "Không tìm thấy sprint" });
    } finally {
      vi.mocked(getSessionMemberId).mockResolvedValue("hieu");
    }
  });
});
