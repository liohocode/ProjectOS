import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { parseDocMd, parseFeatureMd, parsePhaseNames, type PlanFeature } from "@/lib/planImport";
import { getDocBody } from "@/lib/data/docs";
import { getFeaturesByProject, getPhasesByProject } from "@/lib/data/features";
import { importDocs, importPlan } from "./planImport";

// F28.2 — import kế hoạch thật (docs/features) vào một dự án riêng của test; xoá dự án sau khi chạy.
const PROJECT = "it-plan";
const root = join(__dirname, "..", "..");
const dir = join(root, "docs", "features");
const features = readdirSync(dir)
  .filter((f) => /^F\d{2}-.*\.md$/.test(f))
  .sort()
  .map((f) => parseFeatureMd(readFileSync(join(dir, f), "utf8"))!) satisfies PlanFeature[];
const opts = {
  projectId: PROJECT,
  project: { code: "ITP", name: "IT plan", desc: "test" },
  assigneeId: "hieu",
  phaseNames: parsePhaseNames(readFileSync(join(root, "docs", "ROADMAP.md"), "utf8")),
};
const total = features.reduce((s, f) => s + f.tasks.length, 0);

afterAll(async () => {
  // Feature của kế hoạch có id cố định (F21…) — xoá theo dự án (cascade task, tiêu chí, phụ thuộc, phase).
  await prisma.task.deleteMany({ where: { feature: { projectId: PROJECT } } });
  await prisma.feature.deleteMany({ where: { projectId: PROJECT } });
  await prisma.project.delete({ where: { id: PROJECT } });
});

describe("importPlan (F28.2)", () => {
  it("dry-run không ghi gì", async () => {
    const s = await importPlan(features, { ...opts, dryRun: true });
    expect(s.tasksCreated).toBe(total);
    expect(await prisma.project.findUnique({ where: { id: PROJECT } })).toBeNull();
  });

  it("import → đủ phase / feature / task / tiêu chí / phụ thuộc; chạy lại không nhân đôi", async () => {
    const first = await importPlan(features, opts);
    expect(first).toMatchObject({ featuresCreated: features.length, tasksCreated: total, missingRefs: [] });
    const second = await importPlan(features, opts);
    expect(second).toMatchObject({ featuresCreated: 0, featuresUpdated: features.length, tasksCreated: 0, tasksUpdated: total });
    expect(await prisma.task.count({ where: { feature: { projectId: PROJECT } } })).toBe(total);
    expect(await prisma.taskCriterion.count({ where: { task: { feature: { projectId: PROJECT } } } })).toBe(first.criteria);

    const phases = await getPhasesByProject(PROJECT);
    expect(phases.find((p) => p.code === "7b")?.name).toBe("Kế hoạch Meridian trên web");
    const f21 = (await getFeaturesByProject(PROJECT)).find((f) => f.id === "F21")!;
    expect(f21).toMatchObject({ phase: { code: "7" }, stage: "Done", pct: 100 });
    expect(f21.dependsOn.map((d) => d.id)).toEqual(["F11", "F16"]);
    const t3 = f21.tasks.find((t) => t.code === "F21.3")!;
    expect(t3).toMatchObject({ stage: "Done", size: "M", description: expect.stringContaining("Task.sprintId") });
    expect(t3.criteria[0]).toMatchObject({ done: true });
  });

  it("task 'Chuyển → …' được lưu trữ, không hiện trong list", async () => {
    const moved = await prisma.task.findFirstOrThrow({ where: { feature: { projectId: PROJECT }, code: "F19.8" } });
    expect(moved.archivedAt).not.toBeNull();
    expect((await getFeaturesByProject(PROJECT)).flatMap((f) => f.tasks).some((t) => t.code === "F19.8")).toBe(false);
  });

  it("F28.3: tài liệu kỹ thuật → Doc (markdown tách mục), chạy lại thì cập nhật", async () => {
    const docs = ["architecture/decisions.md", "product/requirements.md"].map((p) => parseDocMd(p, readFileSync(join(root, "docs", p), "utf8"), PROJECT));
    expect(await importDocs(PROJECT, docs, "hieu")).toEqual({ created: 2, updated: 0 });
    expect(await importDocs(PROJECT, docs, "hieu")).toEqual({ created: 0, updated: 2 });
    const body = await getDocBody(`${PROJECT}-architecture-decisions`);
    expect(body.sections.length).toBeGreaterThan(1);
    expect(body.sections.some((s) => s.heading.startsWith("ADR-025"))).toBe(true);
  });

  it("feature đã thuộc dự án khác → từ chối", async () => {
    await expect(importPlan([{ ...features[0], code: "FEAT-118" }], opts)).rejects.toThrow("Feature FEAT-118 đã thuộc dự án rv-web");
  });
});
