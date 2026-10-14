# F01 — App shell (sidebar, header, routing, project switcher)

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Xong | 0 | — | FR-SH-01…06 |

## Mục tiêu
Khung dùng chung cho mọi màn: sidebar trái, header, routing giữa 5 màn, đổi dự án.

## Tham chiếu
- `docs/design/design-reference.md` → "Sidebar", "Header (mọi màn)", "Interactions & Behavior"
- Code: `app/[project]/layout.tsx`, `components/layout/*`, `app/globals.css` (section "App shell")

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F01.1 | Routing `/[project]/{work,docs,team,mcp,portfolio}`, `/` → `/rv-web/work`, project sai → 404 | S | — | Xong — 9575e2c |
| F01.2 | Sidebar: brand, ProjectSwitcher, nav + badge đếm/alert, pipeline agent, footer | M | F01.1 | Xong — 9575e2c |
| F01.3 | Header: kicker/tiêu đề/context theo màn (`screenMeta.ts`), search, Lọc, nút chính | S | F01.1 | Xong — 9575e2c |
| F01.4 | Port token + class Nocturne vào `globals.css` | S | — | Xong — 9575e2c |

## Đã chuyển sang feature khác
- Footer "người dùng hiện tại" đang hardcode → **F11.1** (gom về một chỗ), **F15** (auth thật).
- Ô tìm kiếm, nút "Lọc" chưa có hành vi → **F14**.
- Nút hành động chính ở header (Task mới / Tài liệu mới / Dự án mới / Thêm thành viên / Kết nối server) → **F11.4**, **F12.5**, **F13**.

## Quyết định / ghi chú
- Màn active xác định bằng `usePathname()` trong `Sidebar`/`Header` (client), không dùng context.
- Badge nav luôn hiện số đếm, chỉ đổi màu amber khi có alert (block task / revision chờ duyệt) — đúng spec.
- `ProjectSwitcher` đổi project bằng `router.push('/<id>/<screen>')` không kèm query → tự reset tài liệu đang xem về tài liệu đầu tiên (ADR-003).
