import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getFeatureDetail, getFeaturesByProject } from "@/lib/data/features";
import { getTimelineByProject } from "@/lib/data/timeline";
import { listTasksForMember } from "@/lib/domain/tasks";
import { moveFeature, setFeatureArchived } from "./features";
import { moveTask } from "./tasks";

// F21.10 — lưu trữ feature + thứ tự ưu tiên, trên crm (seed: 3 feature). Trả lại trạng thái seed sau khi chạy.
afterAll(async () => {
  await prisma.feature.updateMany({ where: { projectId: "crm" }, data: { archivedAt: null, position: null } });
  await prisma.task.updateMany({ where: { feature: { projectId: "crm" } }, data: { position: null } });
});

const featureIds = async () => (await getFeaturesByProject("crm")).map((f) => f.id);

describe("lưu trữ feature (F21.10)", () => {
  it("ẩn feature + task khỏi list / timeline / MCP; trang chi tiết vẫn mở; khôi phục", async () => {
    const [first] = await getFeaturesByProject("crm");
    const taskIds = first.tasks.map((t) => t.id);
    const agent = (await prisma.projectMember.findFirstOrThrow({ where: { projectId: "crm", member: { kind: "agent" } } })).memberId;

    expect(await setFeatureArchived(first.id, true)).toEqual({ ok: true });
    expect(await featureIds()).not.toContain(first.id);
    expect((await getTimelineByProject("crm")).some((r) => r.featureId === first.id)).toBe(false);
    const visible = (await listTasksForMember(agent, { projectId: "crm" })).map((t) => t.id);
    expect(taskIds.some((id) => visible.includes(id))).toBe(false);
    expect(await getFeatureDetail("crm", first.id)).toMatchObject({ feature: { id: first.id, archived: true } });
    expect(await setFeatureArchived(first.id, true)).toEqual({ ok: false, error: "Feature đã được lưu trữ" });

    expect(await setFeatureArchived(first.id, false)).toEqual({ ok: true });
    expect(await featureIds()).toContain(first.id);
  });
});

describe("thứ tự ưu tiên (F21.10)", () => {
  it("đưa feature lên / xuống; đầu danh sách đưa lên → không đổi", async () => {
    const before = await featureIds();
    expect(await moveFeature(before[1], "up")).toEqual({ ok: true });
    expect(await featureIds()).toEqual([before[1], before[0], ...before.slice(2)]);
    expect(await moveFeature(before[1], "up")).toEqual({ ok: true });
    expect((await featureIds())[0]).toBe(before[1]);
  });

  it("đưa task lên trong feature", async () => {
    const feature = (await getFeaturesByProject("crm")).find((f) => f.tasks.length >= 2)!;
    const [a, b] = feature.tasks.map((t) => t.id);
    expect(await moveTask(b, "up")).toEqual({ ok: true });
    const after = (await getFeaturesByProject("crm")).find((f) => f.id === feature.id)!.tasks.map((t) => t.id);
    expect(after.slice(0, 2)).toEqual([b, a]);
  });
});
