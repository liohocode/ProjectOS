# Tiến độ Meridian (PMOS)

Cập nhật dòng tương ứng khi nhận/hoàn thành việc. Chi tiết từng màn nằm trong file feature liên kết.

| # | Màn | Trạng thái | File |
|---|-----|-----------|------|
| 1 | App shell (sidebar, header, routing, project switcher) | Xong | [docs/features/01-app-shell.md](docs/features/01-app-shell.md) |
| 2 | Feature & Task (list + task drawer + timeline) | Xong (v1) | [docs/features/02-feature-task.md](docs/features/02-feature-task.md) |
| 3 | Docs dự án (+ luồng duyệt revision) | Xong (v1) | [docs/features/03-docs.md](docs/features/03-docs.md) |
| 4 | Dev & AI agents | Xong (v1) | [docs/features/04-team.md](docs/features/04-team.md) |
| 5 | MCP (+ realtime) | Xong (v1, chưa realtime) | [docs/features/05-mcp.md](docs/features/05-mcp.md) |
| 6 | Portfolio | Xong (v1) | [docs/features/06-portfolio.md](docs/features/06-portfolio.md) |

"Xong (v1)" nghĩa là đủ UI + tương tác chính theo spec, chạy trên mock data — còn vài mục nhỏ để ngỏ (ghi trong từng file feature ở mục "Còn thiếu"). Chưa nối backend/API thật.

## Đã có sẵn (dùng chung cho mọi màn)
- `lib/types.ts` — type cho toàn bộ entity.
- `lib/data/*.ts` — mock data đầy đủ: projects, features/tasks, docs (+ knowledge strip stats, pending revisions), team (+ pipeline), mcp servers/sessions/log, timeline, activity feed (suy ra từ task/doc), task drawer info (context docs + session log suy ra từ task/feature).
- `app/globals.css` — token + toàn bộ class Nocturne dùng trong 6 màn.
- Routing `/[project]/{work|docs|team|mcp|portfolio}` với layout dùng chung (Sidebar + Header thật).

## Còn lại trước khi nối backend thật
- MCP: nhật ký lệnh nên chuyển sang websocket/polling thay vì mảng tĩnh.
- Docs: nút "Duyệt" hiện chỉ đổi state client (`ApproveButton`), chưa gọi API.
- Feature & Task: nút "Chuyển stage" / "Giao cho agent" trong task drawer chưa có hành vi thật.
- Xem chi tiết từng mục trong `docs/features/0X-*.md` phần "Còn thiếu / cần làm tiếp".

## Log
- 2026-09-16 — Scaffold Next.js + App shell (bước 1) xong.
- 2026-09-16 — Implement xong cả 5 màn còn lại (Feature & Task, Docs, Team, MCP, Portfolio) trên mock data, build + lint sạch.
