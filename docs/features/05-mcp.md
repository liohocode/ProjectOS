# 05 — MCP

**Trạng thái:** Chưa bắt đầu

## Mục tiêu
Quản trị MCP server và soi những gì agent thực sự làm (phiên chạy, nhật ký lệnh realtime).

## Tham chiếu
`docs/design-reference.md` → mục "5. MCP" (server cards, bảng "Phiên chạy của agent", bảng "Nhật ký lệnh").

## Data đã sẵn có
`lib/data/mcp.ts` — `getMcpServers()` (3 server mẫu: meridian-core, meridian-docs, redis-tools). Type: `McpServer`.

**Chưa có mock data cho:** bảng "Phiên chạy của agent" và bảng "Nhật ký lệnh" — cần thêm type + mock trong `lib/data/mcp.ts` (hoặc file mới `lib/data/sessions.ts`) trước khi implement UI. Xem ví dụ nội dung trong design-reference (cột: Phiên/Agent/Dự án/Task/Thời lượng/Tool calls/Token/Kết quả cho bảng phiên; Thời điểm/Agent/Tool/Đối tượng/Kết quả cho nhật ký lệnh).

## Checklist
- [ ] Server cards (`.card.elev-sm`, grid `auto-fill minmax(292px,1fr)`): dot trạng thái, tag, URL monospace, tool list `.tag-outline` monospace, `.card-meta`.
- [ ] Bổ sung type + mock cho phiên chạy và nhật ký lệnh.
- [ ] Bảng "Phiên chạy của agent" (`.table`) — cắt ngang nhiều dự án (không filter theo project hiện tại).
- [ ] Bảng "Nhật ký lệnh" — cần realtime (websocket) theo spec; ở bản đầu có thể dùng polling hoặc dữ liệu tĩnh, ghi rõ trong code là tạm thời.

## Ghi chú
Đây là màn duy nhất spec yêu cầu realtime thật (websocket) — không bắt buộc phải làm ngay ở lần implement đầu, có thể để dạng tĩnh trước rồi nối realtime sau khi có backend thật.
