import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { approveTaskReview } from "@/lib/actions/tasks";
import { setDoneDefinition } from "@/lib/actions/projects";
import { getTaskContext } from "./taskContext";

// F22.6 — Definition of Done. Seed: crm có 3 mục DoD, T-612 ở Review (agent).
const DOD = ["Có test cho thay đổi", "PR đã review", "Cập nhật tài liệu liên quan"];
afterAll(async () => {
  await prisma.task.update({ where: { id: "T-612" }, data: { stage: "Review", status: "ChoReview" } });
  await prisma.taskTransition.deleteMany({ where: { taskId: "T-612", note: { startsWith: "DoD:" } } });
  await prisma.project.update({ where: { id: "crm" }, data: { doneDefinition: DOD } });
});

describe("Definition of Done (F22.6)", () => {
  it("duyệt Done cần tick đủ DoD; đủ thì Done và ghi DoD vào lịch sử", async () => {
    expect(await approveTaskReview("T-612", [DOD[0]])).toEqual({ ok: false, error: `Chưa xác nhận Definition of Done: ${DOD[1]}; ${DOD[2]}` });
    expect((await prisma.task.findUniqueOrThrow({ where: { id: "T-612" } })).stage).toBe("Review");
    expect(await approveTaskReview("T-612", DOD)).toEqual({ ok: true });
    const last = await prisma.taskTransition.findFirstOrThrow({ where: { taskId: "T-612" }, orderBy: { at: "desc" } });
    expect(last).toMatchObject({ toStage: "Done", note: `DoD: ${DOD.join("; ")}` });
  });

  it("sửa DoD (mỗi dòng một mục); agent thấy DoD qua context_get", async () => {
    expect(await setDoneDefinition("crm", "- Có test\n\n- Có demo")).toEqual({ ok: true });
    expect((await prisma.project.findUniqueOrThrow({ where: { id: "crm" } })).doneDefinition).toEqual(["Có test", "Có demo"]);
    const agent = (await prisma.task.findUniqueOrThrow({ where: { id: "T-620" } })).assigneeId;
    const ctx = await getTaskContext(agent, "T-620", { includeDocs: false });
    expect(ctx).toMatchObject({ ok: true, context: { doneDefinition: ["Có test", "Có demo"] } });
  });
});
