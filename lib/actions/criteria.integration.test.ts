import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getSessionMemberId } from "@/lib/auth/session";
import { getFeaturesByProject } from "@/lib/data/features";
import { addTaskCriterion, checkTaskCriterion, editTaskCriterion, removeTaskCriterion } from "./criteria";

// F21.6 — acceptance criteria. Trung Hiếu (tech lead) mặc định; Nam là thành viên rv-web, không thuộc rv-app.
// Ghi trên rv-app (không phải rv-web): sự kiện rail sinh ra không đẩy sự kiện seed rv-web khỏi feed mà
// aggregates.integration.test.ts kiểm tra (các file test chạy song song).
const startedAt = new Date();
afterAll(async () => {
  await prisma.taskCriterion.deleteMany({ where: { text: { startsWith: "IT " } } });
  await prisma.activityEvent.deleteMany({ where: { at: { gte: startedAt } } });
  await prisma.memberActivity.deleteMany({ where: { at: { gte: startedAt } } });
});

const criteriaOf = async (taskId: string) =>
  (await getFeaturesByProject("rv-app")).flatMap((f) => f.tasks).find((t) => t.id === taskId)!.criteria.filter((c) => c.text.startsWith("IT "));

describe("acceptance criteria (F21.6)", () => {
  it("thêm theo thứ tự, sửa, tick (ghi người tick), bỏ tick, xoá", async () => {
    const taskId = (await prisma.task.findFirstOrThrow({ where: { feature: { projectId: "rv-app", status: "active" } }, orderBy: { id: "asc" } })).id;
    const a = await addTaskCriterion(taskId, "  IT có test p95  ");
    const b = await addTaskCriterion(taskId, "IT cập nhật tài liệu");
    expect(a).toMatchObject({ ok: true });
    const [idA, idB] = [(a as { criterionId: string }).criterionId, (b as { criterionId: string }).criterionId];
    expect((await criteriaOf(taskId)).map((c) => c.text)).toEqual(["IT có test p95", "IT cập nhật tài liệu"]);

    expect(await editTaskCriterion(idB, "IT cập nhật guide")).toEqual({ ok: true });
    expect(await checkTaskCriterion(idA, true)).toEqual({ ok: true });
    expect(await criteriaOf(taskId)).toEqual([
      { id: idA, text: "IT có test p95", done: true, doneBy: "Trung Hiếu" },
      { id: idB, text: "IT cập nhật guide", done: false, doneBy: null },
    ]);
    expect(await checkTaskCriterion(idA, false)).toEqual({ ok: true });
    expect((await criteriaOf(taskId))[0]).toMatchObject({ done: false, doneBy: null });

    expect(await removeTaskCriterion(idB)).toEqual({ ok: true });
    expect((await criteriaOf(taskId)).map((c) => c.id)).toEqual([idA]);
    expect(await addTaskCriterion(taskId, "   ")).toEqual({ ok: false, error: "Nhập nội dung tiêu chí" });
  });

  it("người ngoài dự án không thao tác được", async () => {
    const appTask = await prisma.task.findFirstOrThrow({ where: { feature: { projectId: "rv-app" } }, orderBy: { id: "desc" } });
    const created = await addTaskCriterion(appTask.id, "IT tiêu chí rv-app");
    const id = (created as { criterionId: string }).criterionId;
    vi.mocked(getSessionMemberId).mockResolvedValue("nam");
    try {
      expect(await addTaskCriterion(appTask.id, "IT x")).toEqual({ ok: false, error: "Không tìm thấy dự án" });
      expect(await checkTaskCriterion(id, true)).toEqual({ ok: false, error: "Không tìm thấy dự án" });
    } finally {
      vi.mocked(getSessionMemberId).mockResolvedValue("hieu");
    }
  });
});
