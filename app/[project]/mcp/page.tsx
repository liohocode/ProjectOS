import { getMcpLog, getMcpServers, getMcpSessions } from "@/lib/data/mcp";
import { getProjects } from "@/lib/data/projects";
import { ServerCard } from "@/components/mcp/ServerCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SESSION_RESULT_LABEL } from "@/lib/data/mcpLabels";
import { filterLog, filterSessions, parseMcpFilter } from "@/lib/filters";

const RESULT_TAG_CLASS: Record<string, string> = {
  Xong: "tag-neutral",
  "Đang chạy": "tag-accent",
  "Chờ review": "tag-outline",
  "Bị chặn": "tag-outline",
  OK: "tag-neutral",
};

export default async function McpPage(props: PageProps<"/[project]/mcp">) {
  const filter = parseMcpFilter(await props.searchParams);
  const filtered = Boolean(filter.agent || filter.project || filter.result);
  const [servers, allSessions, allLog, projects] = await Promise.all([
    getMcpServers(),
    getMcpSessions(),
    getMcpLog(),
    getProjects(),
  ]);
  const sessions = filterSessions(allSessions, filter, SESSION_RESULT_LABEL);
  const log = filterLog(allLog, filter);
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? id;

  return (
    <div className="mcp-main">
      <div className="mcp-grid">
        {servers.map((server) => (
          <ServerCard key={server.id} server={server} />
        ))}
      </div>

      <h5 className="mcp-section-title">Phiên chạy của agent</h5>
      {sessions.length === 0 ? (
        <EmptyState compact icon={filtered ? "ph-funnel" : "ph-plugs"} title={filtered ? "Không có phiên nào khớp bộ lọc" : "Chưa có phiên chạy nào"} description="Khi agent kết nối MCP server của Meridian, mỗi phiên sẽ được ghi lại ở đây." />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Phiên</th>
              <th>Agent</th>
              <th>Dự án</th>
              <th>Task</th>
              <th>Thời lượng</th>
              <th>Tool calls</th>
              <th>Token</th>
              <th>Kết quả</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td className="mono">{s.id}</td>
                <td>{s.agent}</td>
                <td style={{ color: "var(--color-accent-300)" }}>{projectName(s.projectId)}</td>
                <td>{s.taskId}</td>
                <td>{s.durationMin} phút</td>
                <td>{s.toolCalls}</td>
                <td>{s.tokens}</td>
                <td>
                  <span className={`tag ${RESULT_TAG_CLASS[s.result]} nowrap`}>{s.result}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h5 className="mcp-section-title">Nhật ký lệnh</h5>
      {log.length === 0 ? (
        <EmptyState compact icon={filtered ? "ph-funnel" : "ph-terminal-window"} title={filtered ? "Không có lệnh nào khớp bộ lọc" : "Chưa có lệnh nào"} description="Mọi lệnh agent gọi qua MCP (kèm kết quả OK / Chờ review / Bị chặn) sẽ hiện ở đây." />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Thời điểm</th>
              <th>Agent</th>
              <th>Tool</th>
              <th>Đối tượng</th>
              <th>Kết quả</th>
            </tr>
          </thead>
          <tbody>
            {log.map((entry, i) => (
              <tr key={i}>
                <td className="mono">{entry.at}</td>
                <td>{entry.agent}</td>
                <td className="mono" style={{ color: "var(--color-accent-300)" }}>
                  {entry.tool}
                </td>
                <td>{entry.target}</td>
                <td>
                  <span className={`tag ${RESULT_TAG_CLASS[entry.result]} nowrap`}>{entry.result}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
