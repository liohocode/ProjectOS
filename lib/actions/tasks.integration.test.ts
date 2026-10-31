import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/currentUser";
import { getSessionMemberId } from "@/lib/auth/session";
import { getQualityByProject } from "@/lib/data/quality";
import { addTaskComment, assignTask, createTask, setTaskBlocked, updateTask, updateTaskStage, updateTaskStatus, type NewTaskInput } from "./tasks";

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
    const before = await prisma.member.findUniqueOrThrow({ where: { id: member.memberId } });
    expect(await assignTask(TASK_ID, member.memberId)).toEqual({ ok: true });
    const task = await prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } });
    expect(task.assigneeId).toBe(member.memberId);
    const after = await prisma.member.findUniqueOrThrow({ where: { id: member.memberId } });
    // F13.3: cột "Đang làm" ở màn team = việc vừa giao.
    expect(after.current).toBe(`${TASK_ID} ${task.title}`);
    await prisma.member.update({ where: { id: member.memberId }, data: { current: before.current } });
    const name = after.name;
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
    // F21.3: task mới vào sprint hiện tại của dự án.
    const project = await prisma.project.findUniqueOrThrow({ where: { id: "rv-web" } });
    expect(task.sprintId).toBe(project.currentSprintId);
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
  let original: {
    title: string;
    estimatePoints: number | null;
    dueDate: Date | null;
    description: string | null;
    size: "S" | "M" | "L" | null;
    code: string | null;
    needsDecision: boolean;
  };
  beforeAll(async () => {
    original = await prisma.task.findUniqueOrThrow({
      where: { id: TASK_ID },
      select: { title: true, estimatePoints: true, dueDate: true, description: true, size: true, code: true, needsDecision: true },
    });
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

  it("F21.7: mô tả markdown, cỡ, mã kế hoạch, cần quyết định; chuỗi rỗng xoá", async () => {
    expect(await updateTask(TASK_ID, { description: "## Làm gì\n- a", size: "M", code: "F21.7", needsDecision: true })).toEqual({ ok: true });
    expect(await prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } })).toMatchObject({ description: "## Làm gì\n- a", size: "M", code: "F21.7", needsDecision: true });
    expect(await updateTask(TASK_ID, { description: "  ", size: null, code: "", needsDecision: false })).toEqual({ ok: true });
    expect(await prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } })).toMatchObject({ description: null, size: null, code: null, needsDecision: false });
    expect(await updateTask(TASK_ID, { code: "F 21" })).toEqual({ ok: false, error: "Mã chỉ gồm chữ, số, dấu chấm, gạch" });
  });

  it("từ chối patch rỗng, tiêu đề trống, ước lượng âm", async () => {
    expect(await updateTask(TASK_ID, {})).toEqual({ ok: false, error: "Không có gì để cập nhật" });
    expect(await updateTask(TASK_ID, { title: "" })).toEqual({ ok: false, error: "Nhập tiêu đề task" });
    expect(await updateTask(TASK_ID, { estimatePoints: -1 })).toEqual({ ok: false, error: "Ước lượng không âm" });
  });
});

describe("addTaskComment (F21.5)", () => {
  afterAll(async () => {
    await prisma.taskComment.deleteMany({ where: { body: { startsWith: "IT người:" } } });
  });

  // Task rv-app, không dùng T-405: sự kiện "Bình luận" mới sẽ thay mục "đang chạy" của T-405 trong feed rv-web
  // mà aggregates.integration.test.ts kiểm tra (các file test chạy song song).
  it("người bình luận xen kẽ với agent, đúng thứ tự; chặn trống / người ngoài dự án", async () => {
    const taskId = (await prisma.task.findFirstOrThrow({ where: { feature: { projectId: "rv-app" } }, orderBy: { id: "asc" } })).id;
    await prisma.taskComment.create({ data: { taskId, authorId: "agent-atlas", body: "IT người: agent hỏi trước" } });
    expect(await addTaskComment(taskId, "  IT người: lead trả lời  ")).toEqual({ ok: true });
    const rows = await prisma.taskComment.findMany({ where: { taskId, body: { startsWith: "IT người:" } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    expect(rows.map((r) => [r.authorId, r.body])).toEqual([
      ["agent-atlas", "IT người: agent hỏi trước"],
      ["hieu", "IT người: lead trả lời"],
    ]);
    expect(await addTaskComment(taskId, "   ")).toEqual({ ok: false, error: "Bình luận trống" });

    vi.mocked(getSessionMemberId).mockResolvedValue("nam");
    try {
      const other = await prisma.task.findFirstOrThrow({ where: { feature: { project: { members: { none: { memberId: "nam" } } } } } });
      expect(await addTaskComment(other.id, "IT người: x")).toEqual({ ok: false, error: "Không tìm thấy dự án" });
    } finally {
      vi.mocked(getSessionMemberId).mockResolvedValue("hieu");
    }
  });
});

describe("lịch sử block (F22.7)", () => {
  afterAll(async () => {
    await prisma.task.update({ where: { id: TASK_ID }, data: { blocked: null, blockedFull: null } });
    await prisma.taskBlock.deleteMany({ where: { taskId: TASK_ID } });
  });

  it("đặt block mở một dòng, đổi lý do giữ dòng đó, gỡ thì đóng; chỉ số chất lượng tính thời gian bị block", async () => {
    // Test block / gỡ block ở trên đã để lại lịch sử cho T-401 — bắt đầu sạch.
    await prisma.taskBlock.deleteMany({ where: { taskId: TASK_ID } });
    expect(await setTaskBlocked(TASK_ID, { short: "chờ API", full: "" })).toEqual({ ok: true });
    expect(await setTaskBlocked(TASK_ID, { short: "chờ API v2", full: "" })).toEqual({ ok: true });
    let rows = await prisma.taskBlock.findMany({ where: { taskId: TASK_ID } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ reason: "chờ API v2", unblockedAt: null });

    expect(await setTaskBlocked(TASK_ID, null)).toEqual({ ok: true });
    rows = await prisma.taskBlock.findMany({ where: { taskId: TASK_ID } });
    expect(rows[0].unblockedAt).not.toBeNull();

    const quality = await getQualityByProject("rv-web");
    // Seed: T-402, T-418 đang block từ 1 ngày trước + T-401 vừa block / gỡ.
    expect(quality.project.blockedTasks).toBeGreaterThanOrEqual(3);
    expect(quality.project.totalBlockedMs).toBeGreaterThan(2 * 86_400_000 - 60_000);
  });

  it("lọc chỉ số theo sprint: sprint không có task → rỗng", async () => {
    const other = await prisma.sprint.create({ data: { projectId: "rv-web", name: "IT trống", startDate: new Date("2026-12-01"), endDate: new Date("2026-12-10") } });
    try {
      const q = await getQualityByProject("rv-web", other.id);
      expect(q.project).toMatchObject({ measured: 0, reviewed: 0, blockedTasks: 0 });
    } finally {
      await prisma.sprint.delete({ where: { id: other.id } });
    }
  });
});
