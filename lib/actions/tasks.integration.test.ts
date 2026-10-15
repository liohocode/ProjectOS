import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assignTask, updateTaskStage, updateTaskStatus } from "./tasks";

// Task mẫu T-401 (rv-web). Lưu trạng thái seed để trả lại sau khi test ghi.
const TASK_ID = "T-401";
let seed: { stage: string; status: string; assigneeId: string };

beforeAll(async () => {
  const task = await prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } });
  seed = { stage: task.stage, status: task.status, assigneeId: task.assigneeId };
});

afterAll(async () => {
  await prisma.task.update({
    where: { id: TASK_ID },
    data: { stage: seed.stage as never, status: seed.status as never, assigneeId: seed.assigneeId },
  });
});

describe("updateTaskStage", () => {
  it("đổi stage và revalidate cây /[project]", async () => {
    expect(await updateTaskStage(TASK_ID, "Review")).toEqual({ ok: true });
    expect((await prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } })).stage).toBe("Review");
    expect(revalidatePath).toHaveBeenCalledWith("/[project]", "layout");
  });

  it("từ chối stage lạ và task không tồn tại", async () => {
    expect(await updateTaskStage(TASK_ID, "QA")).toEqual({ ok: false, error: "Stage không hợp lệ" });
    expect(await updateTaskStage("T-999999", "Dev")).toEqual({ ok: false, error: "Không tìm thấy task T-999999" });
  });
});

describe("updateTaskStatus", () => {
  it("nhận nhãn tiếng Việt, lưu enum", async () => {
    expect(await updateTaskStatus(TASK_ID, "Chờ review")).toEqual({ ok: true });
    expect((await prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } })).status).toBe("ChoReview");
  });

  it("từ chối trạng thái lạ", async () => {
    expect(await updateTaskStatus(TASK_ID, "Huỷ")).toEqual({ ok: false, error: "Trạng thái không hợp lệ" });
  });
});

describe("assignTask", () => {
  async function projectOfTask() {
    const task = await prisma.task.findUniqueOrThrow({ where: { id: TASK_ID }, include: { feature: true } });
    return task.feature.projectId;
  }

  it("giao cho thành viên trong dự án", async () => {
    const projectId = await projectOfTask();
    const member = await prisma.projectMember.findFirstOrThrow({
      where: { projectId, memberId: { not: seed.assigneeId } },
    });
    expect(await assignTask(TASK_ID, member.memberId)).toEqual({ ok: true });
    expect((await prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } })).assigneeId).toBe(member.memberId);
  });

  it("từ chối giao cho người ngoài dự án", async () => {
    // Seed không có thành viên nào ngoài rv-web → tạo tạm một agent không thuộc dự án nào.
    const outsider = await prisma.member.create({
      data: { id: "test-outsider", name: "Outsider", handle: "@outsider", kind: "agent", role: "Dev", skills: [], current: "", status: "Cho" },
    });
    try {
      const before = (await prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } })).assigneeId;
      expect(await assignTask(TASK_ID, outsider.id)).toEqual({ ok: false, error: "Người/agent này không thuộc dự án của task" });
      expect((await prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } })).assigneeId).toBe(before);
    } finally {
      await prisma.member.delete({ where: { id: outsider.id } });
    }
  });
});
