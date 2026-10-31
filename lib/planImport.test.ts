import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { comparePhaseCodes, featureRefs, mapTaskStatus, parseFeatureMd, parsePhaseNames, taskRefs } from "./planImport";

const dir = join(__dirname, "..", "docs", "features");
const files = readdirSync(dir).filter((f) => /^F\d{2}-.*\.md$/.test(f));
const parsed = files.map((f) => parseFeatureMd(readFileSync(join(dir, f), "utf8")));

describe("parseFeatureMd (F28.2) trên kế hoạch thật", () => {
  it("đọc được mọi file feature, mã khớp tên file", () => {
    expect(parsed.every(Boolean)).toBe(true);
    expect(parsed.map((f) => f!.code)).toEqual(files.map((f) => f.slice(0, 3)));
  });

  it("F21: phase, phụ thuộc, mục tiêu, task + chi tiết + tiêu chí", () => {
    const f21 = parsed.find((f) => f!.code === "F21")!;
    expect(f21).toMatchObject({ name: "Quản lý công việc đầy đủ cho lead", phase: "7", dependsOn: ["F11", "F16"], stage: "Done" });
    expect(f21.goal).toContain("Lead tự quản lý");
    expect(f21.notes).toContain("F21.10");
    const t3 = f21.tasks.find((t) => t.code === "F21.3")!;
    expect(t3).toMatchObject({ title: expect.stringContaining("Sprint"), size: "M", stage: "Done", status: "Xong" });
    expect(t3.description).toContain("Task.sprintId");
    expect(t3.criteria[0]).toMatchObject({ done: true, text: expect.stringContaining("Tạo sprint mới") });
    expect(f21.tasks.find((t) => t.code === "F21.11")?.stage).toBe("Done");
  });

  it("F18 hoãn: task chưa xong bị chặn kèm lý do", () => {
    const f18 = parsed.find((f) => f!.code === "F18")!;
    expect(f18.tasks.filter((t) => t.stage !== "Done").every((t) => t.blocked?.startsWith("Feature hoãn") || t.blocked)).toBe(true);
  });

  it("F29: task quyết định + task chưa làm", () => {
    const f29 = parsed.find((f) => f!.code === "F29")!;
    expect(f29.phase).toBe("8b");
    expect(f29.tasks.find((t) => t.code === "F29.1")).toMatchObject({ stage: "Done", needsDecision: true });
    expect(f29.tasks.find((t) => t.code === "F29.2")).toMatchObject({ stage: "TA", status: "Chờ", blocked: null, dependsOn: ["F29.1"] });
  });

  it("tổng số task khớp con số tổng của ROADMAP", () => {
    const roadmap = readFileSync(join(__dirname, "..", "docs", "ROADMAP.md"), "utf8");
    const [, done, total] = /Tổng: \*\*(\d+)\/(\d+) task xong\*\*/.exec(roadmap)!;
    const tasks = parsed.flatMap((f) => f!.tasks);
    expect(tasks.length).toBe(Number(total));
    expect(tasks.filter((t) => t.stage === "Done").length).toBe(Number(done));
  });
});

describe("hàm phụ", () => {
  it("featureRefs / taskRefs", () => {
    expect(featureRefs("F01–F06, F11.1")).toEqual(["F01", "F02", "F03", "F04", "F05", "F06", "F11"]);
    expect(featureRefs("—")).toEqual([]);
    expect(taskRefs("F21.6, F22.1 và F21.6")).toEqual(["F21.6", "F22.1"]);
  });
  it("mapTaskStatus", () => {
    expect(mapTaskStatus("Xong — 2026-10-31")).toMatchObject({ stage: "Done", status: "Xong" });
    expect(mapTaskStatus("Chưa làm")).toEqual({ stage: "TA", status: "Chờ", blocked: null, needsDecision: false, superseded: false });
    expect(mapTaskStatus("Chuyển → F20.1 (2026-10-30)")).toMatchObject({ superseded: true });
    expect(mapTaskStatus("Hoãn (Lio, 2026-10-31) — sau F28")).toMatchObject({ blocked: "Hoãn (Lio, 2026-10-31) — sau F28", needsDecision: false });
    expect(mapTaskStatus("Chưa làm — **cần Lio** chọn repo")).toMatchObject({ blocked: "Chưa làm — cần Lio chọn repo", needsDecision: true });
  });
  it("phase: tên từ ROADMAP, thứ tự 7 < 7b < 8", () => {
    expect(parsePhaseNames("### Phase 7b — Kế hoạch Meridian trên web (ưu tiên 2)\n").get("7b")).toBe("Kế hoạch Meridian trên web");
    expect(["8", "7b", "10", "7"].sort(comparePhaseCodes)).toEqual(["7", "7b", "8", "10"]);
  });
});
