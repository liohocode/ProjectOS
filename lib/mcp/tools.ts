// Danh mục tool MCP đã có (thuần — dùng được cả ở lib/data lẫn lib/mcp). Tên thật dạng `tasks_list`;
// UI/nhật ký hiển thị dạng `tasks.list` (MCP tool spec).

/** Tool → server logic nội bộ chứa nó (F16.7: agent phải được cấu hình server đó). */
export const TOOL_SERVER = {
  tasks_list: "meridian-core",
  tasks_claim: "meridian-core",
  tasks_update_status: "meridian-core",
  tasks_comment: "meridian-core",
  features_propose: "meridian-core",
  docs_read: "meridian-docs",
  docs_search: "meridian-docs",
  docs_append: "meridian-docs",
} as const satisfies Record<string, "meridian-core" | "meridian-docs">;

/** `tasks_list` → `tasks.list`. */
export const displayToolName = (tool: string) => tool.replace("_", ".");

/** Tool (dạng hiển thị) của một server nội bộ — thẻ server ở màn MCP (F16.8). */
export function internalServerTools(serverId: string): string[] {
  return Object.entries(TOOL_SERVER)
    .filter(([, server]) => server === serverId)
    .map(([tool]) => displayToolName(tool));
}
