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

"Xong (v1)" nghĩa là đủ UI + tương tác chính theo spec — còn vài mục nhỏ để ngỏ (ghi trong từng file feature ở mục "Còn thiếu").

## Backend — Xong (v1)
Data layer đã chuyển từ mock in-memory sang **Postgres (Docker) + Prisma 7**, driver adapter `@prisma/adapter-pg`.
- `docker-compose.yml` — Postgres dev (`docker compose up -d`).
- `prisma/schema.prisma` — schema đầy đủ (Project, Member + skillRows/activity, ProjectMember, Feature, Task, Doc + DocRevision, McpServer, McpSession, McpLogEntry).
- `prisma/seed.ts` (nguồn: `prisma/seed-data/*.ts` — bản sao mock gốc, tách khỏi `lib/data/` để không phụ thuộc vòng) — seed lại đúng dữ liệu mẫu cũ, script idempotent (tự xoá sạch trước khi seed).
- `lib/data/{projects,team,mcp,features,docs}.ts` — đã đổi sang query Prisma thật, giữ nguyên chữ ký hàm.
- `lib/data/{activity,taskDrawer,portfolio}.ts` — không đổi (chỉ tổng hợp từ các hàm trên).
- **Ngoại lệ**: `lib/data/timeline.ts` vẫn mock tĩnh — dữ liệu view Timeline vốn chỉ soạn tay cho demo trong design gốc, chưa có model DB tương ứng.
- Đã build/lint sạch, verify lại toàn bộ 6 màn × 3 project qua dev server, số liệu khớp 100% với mock cũ (đếm bảng: 3 projects, 7 members, 9 features, 22 tasks, 22 docs, 27 revisions, 3 mcp servers, 8 sessions, 8 log entries).

## Còn lại
- MCP: nhật ký lệnh nên chuyển sang websocket/polling thay vì query tĩnh mỗi lần load trang.
- Docs: nút "Duyệt" (`ApproveButton`) chỉ đổi state UI, chưa ghi `pending=false`/`approvedById` xuống DB.
- Xem chi tiết từng mục trong `docs/features/0X-*.md` phần "Còn thiếu / cần làm tiếp".

## Log
- 2026-09-16 — Scaffold Next.js + App shell (bước 1) xong.
- 2026-09-16 — Implement xong cả 5 màn còn lại (Feature & Task, Docs, Team, MCP, Portfolio) trên mock data, build + lint sạch.
- 2026-09-16 — Polish task drawer (Chuyển stage / Giao cho agent có hành vi thật, state client) + banner "Xem tất cả".
- 2026-09-16 — Backend thật: Postgres qua Docker + Prisma 7, seed lại đúng dữ liệu mẫu, thay toàn bộ `lib/data/*` (trừ timeline.ts) sang query DB thật.
