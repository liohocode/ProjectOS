import { describe, expect, it } from "vitest";
import { inboxScope, inboxTotal } from "./inbox";

const counts = { revisions: 2, reviewTasks: 3, proposals: 1, blockedTasks: 4 };

describe("inbox (F25.2)", () => {
  it("người có đủ quyền duyệt thấy mọi phần", () => {
    const scope = inboxScope({ "doc.review": true, "task.review": true, "feature.review": true });
    expect(inboxTotal(counts, scope)).toBe(10);
  });

  it("thành viên thường chỉ thấy task bị block", () => {
    const scope = inboxScope({ "doc.review": false, "task.review": false, "feature.review": false });
    expect(scope).toEqual({ revisions: false, reviewTasks: false, proposals: false, blockedTasks: true });
    expect(inboxTotal(counts, scope)).toBe(4);
  });

  it("chỉ cộng phần có quyền", () => {
    expect(inboxTotal(counts, inboxScope({ "doc.review": true, "task.review": false, "feature.review": false }))).toBe(6);
  });
});
