# 05 — MCP

**Trạng thái:** Xong (v1, chưa realtime)

## Mục tiêu
Quản trị MCP server và soi những gì agent thực sự làm (phiên chạy, nhật ký lệnh realtime).

## Tham chiếu
`docs/design-reference.md` → mục "5. MCP" (server cards, bảng "Phiên chạy của agent", bảng "Nhật ký lệnh").

## Data đã sẵn có
`lib/data/mcp.ts` — `getMcpServers()`, `getMcpSessions()`, `getMcpLog()`. Type: `McpServer`, `McpSession`, `McpLogEntry`.

## Đã làm
- [x] Server cards (`ServerCard`, grid `auto-fill minmax(292px,1fr)`): dot trạng thái, tag, URL monospace, tool list, `.card-meta`.
- [x] Bảng "Phiên chạy của agent" — cắt ngang nhiều dự án (không filter theo project trong route, đúng spec), cột Dự án map qua `getProjects()`.
- [x] Bảng "Nhật ký lệnh" — hiện là mảng tĩnh trong `lib/data/mcp.ts`.

## Còn thiếu / cần làm tiếp
- [ ] "Nhật ký lệnh" cần realtime (websocket) theo spec — bản này là mảng tĩnh, chưa polling/websocket.
- [ ] Nút "Kết nối server" (ở header, dùng chung cho mọi màn) chưa mở form/dialog thật.

## Ghi chú
Đây là màn duy nhất spec yêu cầu realtime thật (websocket) — chưa làm ở v1, cần nối khi có backend thật.
