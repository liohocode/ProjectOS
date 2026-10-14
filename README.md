# Meridian — Project Management OS

Công cụ quản lý dự án cho team mà developer làm việc cùng AI coding agent (portfolio, docs, feature/task/timeline, dev & agents, MCP).

## Chạy dự án
```
nvm use --lts
docker compose up -d        # Postgres
cp .env.example .env        # lần đầu
npm install
npx prisma generate && npx prisma migrate dev && npx prisma db seed
npm run dev                 # http://localhost:3000
```

## Tài liệu
Toàn bộ nằm trong [`docs/`](docs/README.md):
- [`docs/product/`](docs/product/overview.md) — dự án là gì, yêu cầu đánh mã + trạng thái đáp ứng
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — tiến độ theo phase / feature, việc nên làm tiếp
- [`docs/features/`](docs/features/) — mỗi feature một file, chia sẵn task cho coding agent
- [`docs/architecture/`](docs/architecture/overview.md) — kiến trúc, mô hình dữ liệu, quyết định (ADR)
- [`docs/design/design-reference.md`](docs/design/design-reference.md) — spec UI gốc

## Cho coding agent
Đọc [`CLAUDE.md`](CLAUDE.md) rồi [`docs/WORKFLOW.md`](docs/WORKFLOW.md) trước khi nhận việc.
