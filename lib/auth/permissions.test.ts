import { describe, expect, it } from "vitest";
import { can, type Actor } from "./permissions";

const lead: Actor = { id: "lead", isTechLead: true, projectIds: ["p1"] };
const dev: Actor = { id: "dev", isTechLead: false, projectIds: ["p1", "p2"] };
const p1 = { id: "p1", createdById: null };
const p2 = { id: "p2", createdById: "dev" };
const p3 = { id: "p3", createdById: null };

describe("can (F15.4)", () => {
  it("hành động toàn tổ chức: chỉ tech lead", () => {
    for (const action of ["project.create", "mcpServer.manage", "agent.configure"] as const) {
      expect(can(lead, action)).toBe(true);
      expect(can(dev, action)).toBe(false);
    }
  });

  it("duyệt / sửa tài liệu: tech lead hoặc người tạo dự án, và phải thuộc dự án", () => {
    expect(can(lead, "doc.review", p1)).toBe(true);
    expect(can(dev, "doc.review", p1)).toBe(false);
    expect(can(dev, "doc.edit", p2)).toBe(true); // người tạo p2
    expect(can(lead, "doc.edit", p3)).toBe(false); // tech lead nhưng không thuộc p3
  });

  it("sprint (F21.3): tech lead hoặc người tạo dự án", () => {
    expect(can(lead, "sprint.manage", p1)).toBe(true);
    expect(can(dev, "sprint.manage", p1)).toBe(false);
    expect(can(dev, "sprint.manage", p2)).toBe(true);
  });

  it("thêm/gỡ thành viên, lưu trữ: tech lead thuộc dự án", () => {
    expect(can(lead, "member.manage", p1)).toBe(true);
    expect(can(dev, "member.manage", p2)).toBe(false); // người tạo nhưng không phải tech lead
    expect(can(lead, "project.archive", p3)).toBe(false);
  });

  it("task, tạo tài liệu: mọi thành viên dự án; dự án không tồn tại → không", () => {
    expect(can(dev, "task.write", p1)).toBe(true);
    expect(can(dev, "doc.create", p2)).toBe(true);
    expect(can(dev, "task.write", p3)).toBe(false);
    expect(can(dev, "task.write", null)).toBe(false);
  });
});
