import type { McpServer } from "@/lib/types";
import { ServerCardActions } from "./ServerCardActions";

export function ServerCard({ server }: { server: McpServer }) {
  return (
    <div className="card elev-sm">
      <div className="mcp-server-head">
        <span
          className="status-dot"
          style={{ background: server.status === "online" ? "var(--color-success)" : "var(--color-warning)" }}
        />
        <span className="card-title">{server.name}</span>
        <span className={`tag ${server.status === "online" ? "tag-accent" : "tag-outline"} nowrap`} style={{ marginLeft: "auto" }}>
          {server.status === "online" ? "Online" : "Giới hạn"}
        </span>
        {!server.internal && <ServerCardActions server={server} />}
      </div>
      <div className="mcp-server-url">{server.url}</div>
      <div className="mcp-tool-list">
        {server.tools.length === 0 && <span className="text-muted" style={{ fontSize: 11 }}>Chưa khai báo tool</span>}
        {server.tools.map((tool) => (
          <span className="tag tag-outline nowrap mono" key={tool} style={{ fontSize: 10.5 }}>
            {tool}
          </span>
        ))}
      </div>
      <div className="card-meta">
        {server.clients} client · {server.commandsPerDay} lệnh / 24h · {server.lastCommandAgo ? `lệnh cuối ${server.lastCommandAgo}` : "chưa có lệnh nào"}
      </div>
    </div>
  );
}
