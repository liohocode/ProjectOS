# F07 — Backend: Postgres + Prisma

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Xong | 0 | F01–F06 | NFR-08 |

## Mục tiêu
Thay data layer mock in-memory bằng Postgres thật, giữ nguyên chữ ký `lib/data/*` để UI không phải sửa.

## Tham chiếu
- `docs/architecture/data-model.md`, `docs/architecture/decisions.md` (ADR-004…007, 009, 012)
- Code: `docker-compose.yml`, `prisma/`, `prisma7.config.ts`, `lib/prisma.ts`, `lib/data/*`

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F07.1 | `docker-compose.yml` Postgres 16 + healthcheck; `.env.example` | S | — | Xong — c93f6b4 |
| F07.2 | Cài Prisma 7.10.0 + `@prisma/adapter-pg`; `schema.prisma` 12 model; migration `init` | M | F07.1 | Xong — c93f6b4 |
| F07.3 | `prisma/seed.ts` idempotent từ `prisma/seed-data/*` | M | F07.2 | Xong — c93f6b4 |
| F07.4 | Chuyển `lib/data/{projects,team,mcp,features,docs}.ts` sang Prisma; `lib/relativeTime.ts` | M | F07.3 | Xong — c93f6b4 |
| F07.5 | Sửa schema: `Doc.projectId` bắt buộc (kho tri thức theo project), `Doc.summary` | S | F07.2 | Xong — c93f6b4 |

## Đã chuyển sang feature khác
- Field thời gian/ước lượng còn là chuỗi, sprint là chuỗi, timeline mock → **F09**.
- Chưa có test cho tầng dữ liệu → **F08.2**.

## Quyết định / ghi chú
- Schema mới đầu thiếu `Doc.projectId` và `Doc.summary` → phát hiện khi chuyển `docs.ts`, sửa bằng 2 migration (`doc_project_relation`, `doc_summary`). Bài học: khi thêm model, đối chiếu từng field với type ở `lib/types.ts`.
- Đổi schema xong cần khởi động lại `npm run dev` (dev server cache client cũ).
