import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/currentUser";
import { assignTask, createTask, setTaskBlocked, updateTask, updateTaskStage, updateTaskStatus, type NewTaskInput } from "./tasks";

// Task mẫu T-401 (rv-web). Lưu trạng thái seed để trả lại sau khi test ghi.
const TASK_ID = "T-401";
let seed: { stage: string; status: string; assigneeId: string };

// Action ghi MemberActivity (F11.7) — xoá các dòng sinh ra trong lúc chạy file này.
const startedAt = new Date(Date.now() - 5_000);

beforeAll(async () => {
  const task = await prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } });
  seed = { stage: task.stage, status: task.status, assigneeId: task.assigneeId };
});

afterAll(async () => {
  await prisma.memberActivity.deleteMany({ where: { at: { gte: startedAt } } });
  await prisma.task.update({
    where: { id: TASK_ID },
    data: { stage: seed.stage as never, status: seed.status as never, assigneeId: seed.assigneeId },
  });
});

describe("updateTaskStage", () => {
  it("đổi stage, ghi hoạt động cho người thao tác và revalidate cây /[project]", async () => {
    expect(await updateTaskStage(TASK_ID, "Review")).toEqual({ ok: true });
    expect((await prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } })).stage).toBe("Review");
    expect(revalidatePath).toHaveBeenCalledWith("/[project]", "layout");

    const latest = await prisma.memberActivity.findFirstOrThrow({ where: { memberId: await getCurrentUserId() }, orderBy: { at: "desc" } });
    expect(latest).toMatchObject({ icon: "ph-arrow-right", text: `Chuyển ${TASK_ID} sang Review` });
  });

  it("từ chối stage lạ và task không tồn tại (không ghi hoạt động)", async () => {
    const before = await prisma.memberActivity.count();
    expect(await updateTaskStage(TASK_ID, "QA")).toEqual({ ok: false, error: "Stage không hợp lệ" });
    expect(await updateTaskStage("T-999999", "Dev")).toEqual({ ok: false, error: "Không tìm thấy task T-999999" });
    expect(await prisma.memberActivity.count()).toBe(before);
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
    const name = (await prisma.member.findUniqueOrThrow({ where: { id: member.memberId } })).name;
    const latest = await prisma.memberActivity.findFirstOrThrow({ orderBy: { at: "desc" } });
    expect(latest.text).toBe(`Giao ${TASK_ID} cho ${name}`);
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

describe("createTask", () => {
  const created: string[] = [];
  afterAll(async () => {
    await prisma.task.deleteMany({ where: { id: { in: created } } });
  });

  const base = async (): Promise<NewTaskInput> => {
    const feature = await prisma.feature.findFirstOrThrow({ where: { projectId: "rv-web" }, orderBy: { id: "asc" } });
    return { projectId: "rv-web", featureId: feature.id, title: "Task tạo bởi test", stage: "BA", assigneeId: "nam", estimatePoints: 3, dueDate: "2026-11-02" };
  };

  it("tạo task với id T-<lớn nhất + 1>, lưu đúng kiểu", async () => {
    const before = await prisma.task.findMany({ select: { id: true } });
    const maxBefore = Math.max(...before.map((t) => Number(t.id.slice(2))));

    const result = await createTask(await base());
    expect(result).toEqual({ ok: true, taskId: `T-${maxBefore + 1}` });
    if (!result.ok) return;
    created.push(result.taskId);

    const task = await prisma.task.findUniqueOrThrow({ where: { id: result.taskId } });
    expect(task).toMatchObject({ stage: "BA", status: "Cho", assigneeId: "nam", estimatePoints: 3 });
    expect(task.dueDate?.toISOString().slice(0, 10)).toBe("2026-11-02");
  });

  it("tạo đồng thời không trùng id", async () => {
    const input = await base();
    const results = await Promise.all(Array.from({ length: 5 }, () => createTask(input)));
    const ids = results.map((r) => (r.ok ? r.taskId : r.error));
    created.push(...ids.filter((id) => id.startsWith("T-")));
    expect(results.every((r) => r.ok)).toBe(true);
    expect(new Set(ids).size).toBe(5);
  });

  it("từ chối feature của dự án khác, người ngoài dự án và tiêu đề rỗng", async () => {
    const input = await base();
    const otherFeature = await prisma.feature.findFirstOrThrow({ where: { projectId: { not: "rv-web" } } });
    expect(await createTask({ ...input, featureId: otherFeature.id })).toEqual({ ok: false, error: "Feature không thuộc dự án này" });
    expect(await createTask({ ...input, assigneeId: "khong-ton-tai" })).toEqual({ ok: false, error: "Người/agent này không thuộc dự án" });
    expect(await createTask({ ...input, title: "   " })).toEqual({ ok: false, error: "Nhập tiêu đề task" });
  });
});

describe("setTaskBlocked", () => {
  // T-401 seed không bị block; afterAll của file đã trả stage/status/assignee — ở đây tự gỡ block.
  afterAll(async () => {
    await prisma.task.update({ where: { id: TASK_ID }, data: { blocked: null, blockedFull: null } });
  });

  it("đặt block với lý do ngắn + đầy đủ, rồi gỡ", async () => {
    expect(await setTaskBlocked(TASK_ID, { short: "chờ API", full: "Chờ team backend mở endpoint lọc." })).toEqual({ ok: true });
    expect(await prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } })).toMatchObject({ blocked: "chờ API", blockedFull: "Chờ team backend mở endpoint lọc." });

    expect(await setTaskBlocked(TASK_ID, null)).toEqual({ ok: true });
    expect(await prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } })).toMatchObject({ blocked: null, blockedFull: null });
  });

  it("mô tả rỗng lưu null; lý do ngắn bắt buộc", async () => {
    expect(await setTaskBlocked(TASK_ID, { short: "chờ ADR", full: "  " })).toEqual({ ok: true });
    expect((await prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } })).blockedFull).toBeNull();
    expect(await setTaskBlocked(TASK_ID, { short: " ", full: "" })).toEqual({ ok: false, error: "Nhập lý do ngắn" });
  });
});

describe("updateTask", () => {
  let original: { title: string; estimatePoints: number | null; dueDate: Date | null };
  beforeAll(async () => {
    original = await prisma.task.findUniqueOrThrow({ where: { id: TASK_ID }, select: { title: true, estimatePoints: true, dueDate: true } });
  });
  afterAll(async () => {
    await prisma.task.update({ where: { id: TASK_ID }, data: original });
  });

  it("sửa cả 3 field; xoá ước lượng/hạn bằng null", async () => {
    expect(await updateTask(TASK_ID, { title: "  Tiêu đề mới  ", estimatePoints: 8, dueDate: "2026-12-01" })).toEqual({ ok: true });
    const task = await prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } });
    expect(task).toMatchObject({ title: "Tiêu đề mới", estimatePoints: 8 });
    expect(task.dueDate?.toISOString().slice(0, 10)).toBe("2026-12-01");

    expect(await updateTask(TASK_ID, { estimatePoints: null, dueDate: null })).toEqual({ ok: true });
    expect(await prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } })).toMatchObject({ title: "Tiêu đề mới", estimatePoints: null, dueDate: null });
  });

  it("từ chối patch rỗng, tiêu đề trống, ước lượng âm", async () => {
    expect(await updateTask(TASK_ID, {})).toEqual({ ok: false, error: "Không có gì để cập nhật" });
    expect(await updateTask(TASK_ID, { title: "" })).toEqual({ ok: false, error: "Nhập tiêu đề task" });
    expect(await updateTask(TASK_ID, { estimatePoints: -1 })).toEqual({ ok: false, error: "Ước lượng không âm" });
  });
});
