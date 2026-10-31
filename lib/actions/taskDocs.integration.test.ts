import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getFeaturesByProject } from "@/lib/data/features";
import { getTaskContext } from "@/lib/domain/taskContext";
import { setTaskDoc } from "./tasks";

// F24.6 — gắn tài liệu ↔ task. Seed rv-web: T-405 (FEAT-119, agent-atlas); tài liệu FEAT-119: spec-filter, bench;
// `arch` (kho chung), `mcp-spec` (FEAT-120).
afterAll(async () => {
  await prisma.taskDoc.deleteMany({ where: { taskId: "T-405" } });
});

describe("tài liệu của task (F24.6)", () => {
  it("gắn tài liệu cùng dự án → hiện ở task; chặn tài liệu dự án khác; gắn lại không nhân đôi", async () => {
    expect(await setTaskDoc("T-405", "arch", true)).toEqual({ ok: true });
    expect(await setTaskDoc("T-405", "mcp-spec", true)).toEqual({ ok: true });
    expect(await setTaskDoc("T-405", "arch", true)).toEqual({ ok: true });
    const crmDoc = (await prisma.doc.findFirstOrThrow({ where: { projectId: "crm" } })).id;
    expect(await setTaskDoc("T-405", crmDoc, true)).toEqual({ ok: false, error: "Tài liệu không thuộc dự án này" });

    const task = (await getFeaturesByProject("rv-web")).flatMap((f) => f.tasks).find((t) => t.id === "T-405");
    expect(task?.docs.map((d) => d.id)).toEqual(["arch", "mcp-spec"]);
  });

  it("context_get trả tài liệu gắn với task trước tài liệu của feature", async () => {
    const r = await getTaskContext("agent-atlas", "T-405", { includeDocs: true });
    if (!r.ok) throw new Error(r.reason);
    const docs = r.context.docs.concat(r.context.moreDocs.map((d) => ({ ...d, linked: false }) as (typeof r.context.docs)[number]));
    expect(docs.slice(0, 2).map((d) => [d.id, d.linked]).sort()).toEqual([["arch", true], ["mcp-spec", true]]);
    expect(new Set(docs.slice(2).map((d) => d.id))).toEqual(new Set(["spec-filter", "bench"]));
  });

  it("bỏ gắn → không còn trong context", async () => {
    expect(await setTaskDoc("T-405", "mcp-spec", false)).toEqual({ ok: true });
    const r = await getTaskContext("agent-atlas", "T-405", { includeDocs: true });
    if (!r.ok) throw new Error(r.reason);
    expect(r.context.docs.map((d) => d.id)).not.toContain("mcp-spec");
    expect(r.context.docs[0]).toMatchObject({ id: "arch", linked: true });
  });
});
