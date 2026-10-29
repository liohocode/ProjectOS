import { describe, expect, it } from "vitest";
import { agentConfigRows, parseLegacyConfig } from "./agentConfig";

const names: Record<string, string> = { Atlas: "agent-atlas", Scout: "agent-scout" };
const ids = Object.fromEntries(Object.entries(names).map(([n, id]) => [id, n]));

describe("parseLegacyConfig / agentConfigRows", () => {
  it("chuyển mảng hiển thị cũ của seed sang cấu trúc", () => {
    const vega = parseLegacyConfig(
      [
        ["Model", "claude-opus-4.1"],
        ["MCP server", "meridian-core, redis-tools"],
        ["Được phép giao task", "Cho Atlas, Scout"],
        ["Quyền ghi docs", "Append + sửa spec"],
        ["Token tuần này", "3.2M"],
      ],
      (n) => names[n],
    );
    expect(vega).toEqual({
      model: "claude-opus-4.1",
      mcpServers: ["meridian-core", "redis-tools"],
      docsWritePermission: "append_edit_spec",
      maxConcurrentTasks: 2,
      canProposeFeatures: false,
      canAssignTo: ["agent-atlas", "agent-scout"],
      extra: [["Token tuần này", "3.2M"]],
    });
    const bao = parseLegacyConfig(
      [
        ["Tool đặc thù", "features.propose"],
        ["Task đồng thời", "1 (tối đa 3)"],
        ["Quyền ghi docs", "Chỉ đọc"],
      ],
      (n) => names[n],
    );
    expect(bao).toMatchObject({ canProposeFeatures: true, maxConcurrentTasks: 3, docsWritePermission: "read_only" });
    expect(() => parseLegacyConfig([["Quyền ghi docs", "Lạ"]], () => undefined)).toThrow();
  });

  it("dựng lại dòng hiển thị theo thứ tự cố định, extra ở cuối", () => {
    const rows = agentConfigRows(
      { model: "m", mcpServers: ["a", "b"], docsWritePermission: "append_review", maxConcurrentTasks: 2, canProposeFeatures: true, canAssignTo: ["agent-atlas"], extra: [["Token", "1M"]] },
      (id) => ids[id],
    );
    expect(rows).toEqual([
      ["Model", "m"],
      ["MCP server", "a, b"],
      ["Tool đặc thù", "features.propose"],
      ["Được phép giao task", "Cho Atlas"],
      ["Task đồng thời", "tối đa 2"],
      ["Quyền ghi docs", "Append (chờ review)"],
      ["Token", "1M"],
    ]);
  });
});
