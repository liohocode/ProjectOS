repo: liohocode/ProjectOS
branch: main

## Last sync

date: 2026-09-16T00:00:00Z

### Updated in this project

- Xoá `design/` và `handoff/` (prototype `.dc.html`) — nội dung spec đã chuyển thành `docs/design-reference.md`.
- Dựng codebase thật bằng Next.js (App Router, TypeScript), mock data ở `lib/data/*`.
- Git repo local đã init, remote `origin` trỏ về `liohocode/ProjectOS` — **chưa push**, chờ người dùng tự push khi sẵn sàng.
- App shell (sidebar/header/routing/project switcher) đã implement thật; 5 màn còn lại là placeholder — xem `PROGRESS.md`.

## Screen map

| Screen (project) | Repo files |
| --- | --- |
| Portfolio — Tất cả dự án | `app/[project]/portfolio/page.tsx` (placeholder) |
| Docs dự án | `app/[project]/docs/page.tsx` (placeholder) |
| Feature · Task · Timeline | `app/[project]/work/page.tsx` (placeholder) |
| Dev & AI agents | `app/[project]/team/page.tsx` (placeholder) |
| MCP | `app/[project]/mcp/page.tsx` (placeholder) |
