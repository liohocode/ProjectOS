# F05 — Màn MCP (quản trị)

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Xong (v1) | 0 | F01 | FR-MC-01, 02 |

## Mục tiêu
Quản trị các MCP server và soi những gì agent thực sự làm (phiên chạy, nhật ký lệnh).

## Tham chiếu
- `docs/design/design-reference.md` → "5. MCP"
- Code: `app/[project]/mcp/page.tsx`, `components/mcp/ServerCard.tsx`, `lib/data/mcp.ts`

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F05.1 | Server cards (grid `auto-fill minmax(292px,1fr)`) | S | — | Xong — 40df993 |
| F05.2 | Bảng "Phiên chạy của agent" (cắt ngang mọi dự án) | S | — | Xong — 40df993 |
| F05.3 | Bảng "Nhật ký lệnh" (tĩnh) | S | — | Xong — 40df993 |

## Đã chuyển sang feature khác
- Dữ liệu server/phiên/log là seed tĩnh; MCP server thật cho agent → **F16**.
- Nhật ký lệnh realtime → **F17.3**.
- "Kết nối server" → **F13.6**.
- Lọc theo agent/kết quả, phân trang → **F14.3**, **F14.4**.

## Quyết định / ghi chú
- Màn này **không** lọc theo project trong URL — đúng spec ("bảng cắt ngang nhiều dự án").
- File cũ tên `05-mcp.md`; đổi tên thành `F05-mcp-screen.md` để phân biệt với F16 (MCP server cho agent).
