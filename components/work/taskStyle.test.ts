import { describe, expect, it } from "vitest";
import type { Task } from "@/lib/types";
import { initials, nextStage, stageTagClass, taskRowStyle } from "./taskStyle";

const baseTask: Task = {
  id: "T-1",
  stage: "Dev",
  assigneeId: "nam",
  title: "Task",
  who: "Trần Mỹ Linh",
  kind: "human",
  status: "Đang làm",
  est: "1đ",
  due: "01/01",
  estimatePoints: 1,
  links: { prUrl: null, branch: null, commitSha: null },
  sprintId: null,
  criteria: [],
  dueIso: "2026-01-01",
};

describe("initials", () => {
  it("lấy tối đa 2 chữ cái đầu, viết hoa", () => {
    expect(initials("Trần Mỹ Linh")).toBe("TM");
    expect(initials("Atlas")).toBe("A");
    expect(initials("nguyễn nam")).toBe("NN");
  });
});

describe("stageTagClass", () => {
  it("Done dùng tag neutral, các stage khác dùng tag outline", () => {
    expect(stageTagClass("Done")).toContain("tag-neutral");
    expect(stageTagClass("Dev")).toContain("tag-outline");
  });
});

describe("taskRowStyle", () => {
  it("task của người chỉ có viền dưới", () => {
    expect(taskRowStyle(baseTask).boxShadow).not.toContain("inset 2px 0 0");
  });

  it("task của agent có viền trái accent", () => {
    expect(taskRowStyle({ ...baseTask, kind: "agent" }).boxShadow).toContain("inset 2px 0 0 var(--color-accent)");
  });

  it("task bị block có viền trái amber, ưu tiên hơn viền agent", () => {
    const style = taskRowStyle({ ...baseTask, kind: "agent", blocked: "chờ ADR" });
    expect(style.boxShadow).toContain("var(--color-warning)");
    expect(style.boxShadow).not.toContain("inset 2px 0 0 var(--color-accent)");
  });
});

describe("nextStage", () => {
  it("xoay vòng BA → TA → Dev → Review → Done → BA", () => {
    expect(nextStage("BA")).toBe("TA");
    expect(nextStage("Review")).toBe("Done");
    expect(nextStage("Done")).toBe("BA");
  });
});
