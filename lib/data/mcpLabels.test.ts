import { describe, expect, it } from "vitest";
import { CommandResult, SessionResult } from "@/lib/generated/prisma/enums";
import { COMMAND_RESULT_LABEL, SESSION_RESULT_LABEL } from "./mcpLabels";

describe("nhãn enum MCP", () => {
  it("mọi giá trị SessionResult trong schema đều có nhãn hiển thị", () => {
    for (const value of Object.values(SessionResult)) {
      expect(SESSION_RESULT_LABEL[value], value).toBeDefined();
    }
  });

  it("mọi giá trị CommandResult trong schema đều có nhãn hiển thị", () => {
    for (const value of Object.values(CommandResult)) {
      expect(COMMAND_RESULT_LABEL[value], value).toBeDefined();
    }
  });

  it("map đúng chuỗi tiếng Việt", () => {
    expect(SESSION_RESULT_LABEL.DangChay).toBe("Đang chạy");
    expect(SESSION_RESULT_LABEL.BiChan).toBe("Bị chặn");
    expect(COMMAND_RESULT_LABEL.ChoReview).toBe("Chờ review");
  });
});
