# Tiến độ Meridian (PMOS)

Cập nhật dòng tương ứng khi nhận/hoàn thành việc. Chi tiết từng màn nằm trong file feature liên kết.

| # | Màn | Trạng thái | File |
|---|-----|-----------|------|
| 1 | App shell (sidebar, header, routing, project switcher) | Đang làm | [docs/features/01-app-shell.md](docs/features/01-app-shell.md) |
| 2 | Feature & Task (list + task drawer + timeline) | Chưa bắt đầu | [docs/features/02-feature-task.md](docs/features/02-feature-task.md) |
| 3 | Docs dự án (+ luồng duyệt revision) | Chưa bắt đầu | [docs/features/03-docs.md](docs/features/03-docs.md) |
| 4 | Dev & AI agents | Chưa bắt đầu | [docs/features/04-team.md](docs/features/04-team.md) |
| 5 | MCP (+ realtime) | Chưa bắt đầu | [docs/features/05-mcp.md](docs/features/05-mcp.md) |
| 6 | Portfolio | Chưa bắt đầu | [docs/features/06-portfolio.md](docs/features/06-portfolio.md) |

## Đã có sẵn (dùng chung cho mọi màn)
- `lib/types.ts` — type cho toàn bộ entity.
- `lib/data/*.ts` — mock data đầy đủ cho projects/features/tasks/docs/team/mcp servers.
- `app/globals.css` — token + class Nocturne, đã port đầy đủ (bao gồm CSS responsive cho `.trow/.frow/.mrow`).
- Routing `/[project]/{work|docs|team|mcp|portfolio}`, layout dùng chung có Sidebar + Header thật (đọc data thật, không mock UI).

## Log
- 2026-09-16 — Scaffold Next.js + App shell (bước 1) xong, 5 màn còn lại là placeholder trỏ về file feature tương ứng.
