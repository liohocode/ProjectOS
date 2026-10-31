import { describe, expect, it } from "vitest";
import type { Feature, Task } from "@/lib/types";
import { groupByPhase, nextTasks, openDecisions, phaseTitle } from "./roadmap";

const task = (id: string, over: Partial<Task> = {}): Task => ({
  id, stage: "TA", title: id, assigneeId: "a", who: "A", kind: "agent", status: "Chờ", est: "—", due: "—", estimatePoints: null, dueIso: null,
  links: { prUrl: null, branch: null, commitSha: null }, sprintId: null, criteria: [], dependsOn: [], blocking: [], ...over,
});
const feature = (id: string, phaseId: string | null, tasks: Task[], over: Partial<Feature> = {}): Feature => ({
  id, name: id, stage: "Dev", owner: "", ownerKind: null, ownerId: null, plannedStart: null, plannedEnd: null, pct: 0, docs: 0, tasks,
  phase: phaseId ? { id: phaseId, code: phaseId, name: phaseId } : null, dependsOn: [], blocking: [], ...over,
});
const phases = [
  { id: "p1", code: "1", name: "Một", goal: null, position: 1 },
  { id: "p2", code: "2", name: "Hai", goal: null, position: 2 },
];

describe("roadmap (F28.4)", () => {
  const features = [
    feature("F2", "p2", [task("T-4")], { dependsOn: [{ id: "F1", name: "F1", stage: "Dev" }] }),
    feature("F1", "p1", [
      task("T-1", { stage: "Done" }),
      task("T-2", { dependsOn: [{ id: "T-1", title: "", stage: "Done", done: true }] }),
      task("T-3", { dependsOn: [{ id: "T-2", title: "", stage: "TA", done: false }] }),
      task("T-5", { needsDecision: true }),
      task("T-6", { blocked: "chờ" }),
      task("T-8", { status: "Đang làm", stage: "Dev" }),
    ]),
    feature("F3", null, [task("T-7")]),
  ];
  const groups = groupByPhase(features, phases);

  it("gom theo phase theo thứ tự, chưa xếp phase ở cuối, đếm task xong", () => {
    expect(groups.map((g) => [g.phase?.code ?? null, g.features.map((f) => f.id), `${g.done}/${g.total}`])).toEqual([
      ["1", ["F1"], "1/6"],
      ["2", ["F2"], "0/1"],
      [null, ["F3"], "0/1"],
    ]);
  });

  it("việc nên nhận tiếp: bỏ task chờ phụ thuộc / quyết định / block / feature còn chờ", () => {
    expect(nextTasks(groups).map((p) => p.task.id)).toEqual(["T-2", "T-7"]);
  });

  it("tiêu đề phase không lặp tên mặc định", () => {
    expect(phaseTitle({ code: "0", name: "Phase 0" })).toBe("Phase 0");
    expect(phaseTitle({ code: "7b", name: "Kế hoạch" })).toBe("Phase 7b — Kế hoạch");
    expect(phaseTitle(null)).toBe("Chưa xếp phase");
  });

  it("quyết định đang mở", () => {
    expect(openDecisions(features).map((p) => p.task.id)).toEqual(["T-5"]);
  });
});
