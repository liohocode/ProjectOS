import { describe, expect, it } from "vitest";
import type { DocGroup, Feature, Task } from "@/lib/types";
import {
  countActiveFilters,
  filterDocGroups,
  filterFeatures,
  parseDocsFilter,
  parseMcpFilter,
  parseWorkFilter,
} from "./filters";

const task = (id: string, over: Partial<Task> = {}): Task => ({
  id, stage: "Dev", assigneeId: "nam", title: id, who: "Nam", kind: "human", status: "Đang làm",
  est: "1đ", due: "—", estimatePoints: 1, dueIso: null, ...over,
});
const feature = (id: string, tasks: Task[]): Feature => ({ id, name: id, stage: "Dev", owner: "Nam", ownerKind: "human", pct: 0, docs: 0, tasks });

describe("parse*Filter", () => {
  it("đọc tiêu chí hợp lệ từ searchParams (object hoặc URLSearchParams), bỏ giá trị lạ", () => {
    expect(parseWorkFilter({ stage: "Dev", who: "nam", blocked: "1", running: "0" })).toEqual({ stage: "Dev", who: "nam", blocked: true, running: undefined });
    expect(parseWorkFilter(new URLSearchParams("stage=QA&who="))).toEqual({ stage: undefined, who: undefined, blocked: undefined, running: undefined });
    expect(parseDocsFilter({ agent: "1", pending: ["1", "0"] })).toEqual({ agent: true, pending: true });
    expect(parseMcpFilter({ agent: "agent-atlas", result: "DangChay" })).toEqual({ agent: "agent-atlas", project: undefined, result: "DangChay" });
    expect(parseMcpFilter({ result: "OK" }).result).toBeUndefined();
  });

  it("đếm tiêu chí đang bật theo màn, bỏ qua tham số khác (task, view, doc)", () => {
    expect(countActiveFilters("work", { stage: "Dev", blocked: "1", task: "T-1", view: "timeline" })).toBe(2);
    expect(countActiveFilters("docs", new URLSearchParams("doc=x&pending=1"))).toBe(1);
    expect(countActiveFilters("mcp", { result: "khong-hop-le" })).toBe(0);
  });
});

describe("filterFeatures", () => {
  const features = [
    feature("F1", [task("T-1"), task("T-2", { stage: "Review", assigneeId: "linh" }), task("T-3", { blocked: "chờ" })]),
    feature("F2", [task("T-4", { running: "chạy 3 phút", assigneeId: "agent-atlas", kind: "agent" })]),
    feature("F3", []),
  ];

  it("không tiêu chí → giữ nguyên (kể cả feature chưa có task)", () => {
    expect(filterFeatures(features, {})).toBe(features);
  });

  it("lọc theo stage, người thực hiện, block, đang chạy; ẩn feature không còn task", () => {
    const ids = (f: Parameters<typeof filterFeatures>[1]) => filterFeatures(features, f).flatMap((x) => x.tasks.map((t) => t.id));
    expect(ids({ stage: "Review" })).toEqual(["T-2"]);
    expect(ids({ who: "nam" })).toEqual(["T-1", "T-3"]);
    expect(ids({ blocked: true })).toEqual(["T-3"]);
    expect(ids({ running: true })).toEqual(["T-4"]);
    expect(ids({ who: "nam", blocked: true })).toEqual(["T-3"]);
    expect(filterFeatures(features, { stage: "BA" })).toEqual([]);
  });
});

describe("filterDocGroups", () => {
  const groups: DocGroup[] = [
    { name: "FEAT-1", icon: "ph-cube", items: [{ id: "a", title: "A", agent: true }, { id: "b", title: "B", agent: false }] },
    { name: "Chung", icon: "ph-brain", items: [{ id: "c", title: "C", agent: false }] },
  ];
  it("chỉ tài liệu agent ghi / có revision chờ; bỏ nhóm rỗng", () => {
    expect(filterDocGroups(groups, { agent: true }, []).map((g) => g.items.map((d) => d.id))).toEqual([["a"]]);
    expect(filterDocGroups(groups, { pending: true }, ["b", "c"]).map((g) => g.items.map((d) => d.id))).toEqual([["b"], ["c"]]);
    expect(filterDocGroups(groups, { agent: true, pending: true }, ["b"])).toEqual([]);
    expect(filterDocGroups(groups, {}, [])).toBe(groups);
  });
});
