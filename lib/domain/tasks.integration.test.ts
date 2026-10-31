import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { claimTask, commentOnTask, updateTaskByAgent } from "./tasks";

// F16.3 — tasks_claim. Agent Scout (seed: không chạy task nào) trên rv-web; trả lại trạng thái seed sau khi chạy.
const AGENT = "agent-scout";
type Snapshot = {
  id: string;
  assigneeId: string;
  runningSince: Date | null;
  status: string;
  stage: string;
  blocked: string | null;
  prUrl: string | null;
  branch: string | null;
  commitSha: string | null;
};
let snapshot: Snapshot[] = [];
let picks: string[] = [];
let memberCurrent = "";

beforeAll(async () => {
  // 3 task rv-web chưa Done, không block, không ai chạy.
  const free = await prisma.task.findMany({
    where: { feature: { projectId: "rv-web" }, stage: { not: "Done" }, blocked: null, runningSince: null },
    orderBy: { id: "asc" },
    take: 3,
    select: { id: true },
  });
  picks = free.map((t) => t.id);
  expect(picks).toHaveLength(3);
  snapshot = (await prisma.task.findMany({ where: { feature: { projectId: "rv-web" } } })) as Snapshot[];
  memberCurrent = (await prisma.member.findUniqueOrThrow({ where: { id: AGENT } })).current;
});
afterAll(async () => {
  for (const t of snapshot) {
    await prisma.task.update({
      where: { id: t.id },
      data: {
        assigneeId: t.assigneeId,
        runningSince: t.runningSince,
        status: t.status as never,
        stage: t.stage as never,
        blocked: t.blocked,
        prUrl: t.prUrl,
        branch: t.branch,
        commitSha: t.commitSha,
      },
    });
  }
  await prisma.member.update({ where: { id: AGENT }, data: { current: memberCurrent } });
  await prisma.memberActivity.deleteMany({ where: { memberId: AGENT, text: { startsWith: "Claim " } } });
  await prisma.taskComment.deleteMany({ where: { authorId: AGENT } });
});

describe("claimTask (F16.3)", () => {
  it("claim → giao cho agent, Đang chạy, có runningSince; claim lại task của mình → không đổi", async () => {
    const r = await claimTask(AGENT, picks[0]);
    expect(r).toMatchObject({ ok: true, alreadyRunning: false, projectId: "rv-web", task: { id: picks[0], assigneeId: AGENT, status: "Đang chạy", running: true } });
    expect(await claimTask(AGENT, picks[0])).toMatchObject({ ok: true, alreadyRunning: true });
    expect((await prisma.member.findUniqueOrThrow({ where: { id: AGENT } })).current).toContain(picks[0]);
  });

  it("task thứ 3 khi đang chạy 2 (giới hạn mặc định) → bị chặn, task không đổi", async () => {
    expect(await claimTask(AGENT, picks[1])).toMatchObject({ ok: true });
    const before = await prisma.task.findUniqueOrThrow({ where: { id: picks[2] } });
    expect(await claimTask(AGENT, picks[2])).toEqual({
      ok: false,
      reason: "Đã chạy 2/2 task đồng thời — hoàn thành hoặc nhả task trước khi claim thêm",
      projectId: "rv-web",
    });
    expect(await prisma.task.findUniqueOrThrow({ where: { id: picks[2] } })).toEqual(before);
  });

  it("chặn: Done, bị block, đang chạy bởi agent khác, không thuộc dự án / không tồn tại", async () => {
    const done = await prisma.task.findFirstOrThrow({ where: { feature: { projectId: "rv-web" }, stage: "Done" } });
    expect(await claimTask(AGENT, done.id)).toMatchObject({ ok: false, reason: `${done.id} đã Done` });
    const blocked = await prisma.task.findFirstOrThrow({ where: { feature: { projectId: "rv-web" }, blocked: { not: null }, stage: { not: "Done" } } });
    expect(await claimTask(AGENT, blocked.id)).toMatchObject({ ok: false, reason: expect.stringContaining("đang bị block") });
    expect(await claimTask("agent-atlas", picks[0])).toMatchObject({ ok: false, reason: `${picks[0]} đang được Scout chạy` });
    const crmTask = await prisma.task.findFirstOrThrow({ where: { feature: { projectId: "crm" } } });
    expect(await claimTask("agent-vega", crmTask.id)).toMatchObject({ ok: false, projectId: null });
    expect(await claimTask(AGENT, "T-khong-co")).toMatchObject({ ok: false, projectId: null });
  });
});

describe("updateTaskByAgent / commentOnTask (F16.4)", () => {
  it("agent đổi stage/trạng thái task của mình; rời 'Đang chạy' → nhả task (claim được task khác)", async () => {
    expect(await updateTaskByAgent(AGENT, picks[0], { stage: "Review", status: "Chờ review" })).toMatchObject({
      ok: true,
      task: { id: picks[0], stage: "Review", status: "Chờ review", running: false },
    });
    // Còn 1 task chạy → claim được task thứ 3.
    expect(await claimTask(AGENT, picks[2])).toMatchObject({ ok: true });
  });

  it("chặn: tự Done, đặt 'Đang chạy', task không giao cho mình, thiếu thay đổi", async () => {
    const doneMsg = "Agent không tự đánh dấu Done — chuyển sang Review để người duyệt";
    expect(await updateTaskByAgent(AGENT, picks[0], { stage: "Done" })).toMatchObject({ ok: false, reason: doneMsg });
    expect(await updateTaskByAgent(AGENT, picks[0], { status: "Xong" })).toMatchObject({ ok: false, reason: doneMsg });
    expect(await updateTaskByAgent(AGENT, picks[0], { status: "Đang chạy" })).toMatchObject({ ok: false, reason: "Dùng tasks_claim để chạy task" });
    expect(await updateTaskByAgent("agent-atlas", picks[0], { stage: "Dev" })).toMatchObject({ ok: false, reason: expect.stringContaining("không giao cho bạn") });
    expect(await updateTaskByAgent(AGENT, picks[0], {})).toMatchObject({ ok: false, reason: "Cần stage, status hoặc liên kết (prUrl / branch / commit)" });
    expect((await prisma.task.findUniqueOrThrow({ where: { id: picks[0] } })).stage).toBe("Review");
  });

  it("báo liên kết PR / branch / commit (F22.4): lưu trên task, không ghi lịch sử trạng thái; link sai → chặn", async () => {
    const transitions = await prisma.taskTransition.count({ where: { taskId: picks[1] } });
    const r = await updateTaskByAgent(AGENT, picks[1], {
      links: { prUrl: "https://github.com/acme/web/pull/42", branch: "feat/F22.4-links", commitSha: "ABC1234" },
    });
    expect(r).toMatchObject({
      ok: true,
      task: { links: { prUrl: "https://github.com/acme/web/pull/42", branch: "feat/F22.4-links", commitSha: "abc1234" }, status: "Đang chạy" },
    });
    expect(await prisma.taskTransition.count({ where: { taskId: picks[1] } })).toBe(transitions);
    expect(await updateTaskByAgent(AGENT, picks[1], { links: { prUrl: "ftp://x" } })).toMatchObject({ ok: false, reason: "Link PR phải là URL http(s)" });
    // Gửi kèm stage: cả hai cùng áp; chuỗi rỗng xoá link.
    expect(await updateTaskByAgent(AGENT, picks[1], { stage: "Review", status: "Chờ review", links: { branch: "" } })).toMatchObject({
      ok: true,
      task: { stage: "Review", links: { prUrl: "https://github.com/acme/web/pull/42", branch: null } },
    });
  });

  it("bình luận: lưu trên task; chặn trống / task ngoài dự án", async () => {
    expect(await commentOnTask(AGENT, picks[1], "  Đã viết xong test, chờ CI.  ")).toMatchObject({ ok: true, projectId: "rv-web" });
    expect((await prisma.taskComment.findFirstOrThrow({ where: { authorId: AGENT, taskId: picks[1] } })).body).toBe("Đã viết xong test, chờ CI.");
    expect(await commentOnTask(AGENT, picks[1], "   ")).toMatchObject({ ok: false, reason: "Bình luận trống" });
    const crmTask = await prisma.task.findFirstOrThrow({ where: { feature: { projectId: "crm" } } });
    expect(await commentOnTask("agent-vega", crmTask.id, "x")).toMatchObject({ ok: false, projectId: null });
  });
});
