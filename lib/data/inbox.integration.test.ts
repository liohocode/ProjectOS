import { describe, expect, it } from "vitest";
import { getInbox, getInboxCounts } from "./inbox";

// F25.2 — seed rv-web: 2 revision chờ duyệt, T-396 + T-399 ở Review, T-402 + T-418 bị block, không có feature đề xuất.
describe("inbox", () => {
  it("đếm đúng từng phần cho badge", async () => {
    expect(await getInboxCounts("rv-web")).toEqual({ revisions: 2, reviewTasks: 2, proposals: 0, blockedTasks: 2 });
  });

  it("danh sách khớp số đếm, kèm tài liệu / feature để mở tại chỗ", async () => {
    const inbox = await getInbox("rv-web");
    expect(inbox.reviewTasks.map((t) => t.id)).toEqual(["T-396", "T-399"]);
    expect(inbox.blockedTasks.map((t) => t.id)).toEqual(["T-402", "T-418"]);
    expect(inbox.blockedTasks.every((t) => t.blocked)).toBe(true);
    expect(inbox.revisions).toHaveLength(2);
    for (const rev of inbox.revisions) {
      expect(rev).toMatchObject({ status: "pending", docId: expect.any(String), docTitle: expect.any(String) });
    }
    expect(inbox.reviewTasks[0]).toMatchObject({ featureId: expect.stringMatching(/^FEAT-/), featureName: expect.any(String) });
  });

  it("dự án khác không lẫn việc", async () => {
    const inbox = await getInbox("crm");
    expect(inbox.reviewTasks.map((t) => t.id)).toEqual(["T-612", "T-620"]);
    expect(inbox.revisions).toHaveLength(0);
  });
});
