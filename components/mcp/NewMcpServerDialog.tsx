"use client";

import { useUrlDialog } from "@/components/ui/urlDialog";
import { McpServerDialog } from "./McpServerDialog";

/** "Kết nối server" ở header màn MCP (`?new=1`, ADR-018). */
export function NewMcpServerDialog() {
  const { close } = useUrlDialog();
  return <McpServerDialog onClose={close} />;
}
