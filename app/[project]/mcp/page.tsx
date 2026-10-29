import { getMcpLog, getMcpServers, getMcpSessions } from "@/lib/data/mcp";
import { getProjects } from "@/lib/data/projects";
import { ServerCard } from "@/components/mcp/ServerCard";
import { McpLogTable, McpSessionTable } from "@/components/mcp/McpTables";
import { parseMcpFilter } from "@/lib/filters";
import { NewMcpServerDialog } from "@/components/mcp/NewMcpServerDialog";

export default async function McpPage(props: PageProps<"/[project]/mcp">) {
  // Lọc (F14.3) + phân trang (F14.4) trong DB; trang sau tải bằng "Xem thêm" với cùng bộ lọc.
  const searchParams = await props.searchParams;
  const filter = parseMcpFilter(searchParams);
  const filtered = Boolean(filter.agent || filter.project || filter.result);
  const [servers, sessions, log, projects] = await Promise.all([
    getMcpServers(),
    getMcpSessions(filter),
    getMcpLog({ agent: filter.agent }),
    getProjects(),
  ]);
  const projectNames = Object.fromEntries(projects.map((p) => [p.id, p.name]));
  const filterValues = { agent: filter.agent, project: filter.project, result: filter.result };
  // Đổi lọc → bảng mới (bỏ các trang đã "Xem thêm" của bộ lọc cũ).
  const filterKey = JSON.stringify(filterValues);

  return (
    <div className="mcp-main">
      <div className="mcp-grid">
        {servers.map((server) => (
          <ServerCard key={server.id} server={server} />
        ))}
      </div>

      <h5 className="mcp-section-title">Phiên chạy của agent</h5>
      <McpSessionTable key={`s-${filterKey}`} first={sessions} filter={filterValues} filtered={filtered} projectNames={projectNames} />

      <h5 className="mcp-section-title">Nhật ký lệnh</h5>
      <McpLogTable key={`l-${filterKey}`} first={log} filter={filterValues} filtered={filtered} />
      {/* "Kết nối server" ở header đặt ?new=1 (ADR-018) */}
      {searchParams.new === "1" && <NewMcpServerDialog />}
    </div>
  );
}
