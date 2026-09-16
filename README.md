# Meridian — Project Management OS

Công cụ quản lý dự án cho team mà developer làm việc cùng AI coding agent (portfolio, docs, feature/task/timeline, dev & agents, MCP).

## Chạy dự án
```
nvm use --lts
npm install
npm run dev      # http://localhost:3000
```

## Layout
- `app/`, `components/`, `lib/` — codebase Next.js (App Router, TypeScript). Xem `CLAUDE.md` để biết quy ước và cấu trúc chi tiết.
- `docs/design-reference.md` — spec đầy đủ (5 màn hình, design tokens Nocturne, state shape, dữ liệu mẫu) — nguồn sự thật cho UI/UX.
- `docs/features/0X-*.md` — 1 file / màn hình: mục tiêu, trạng thái, checklist việc cần làm.
- `PROGRESS.md` — bảng trạng thái tổng của cả 6 màn, cập nhật khi nhận/hoàn thành việc.
- `github.md` — trạng thái đồng bộ với repo `liohocode/ProjectOS`.

## Cho coding agent
Đọc `CLAUDE.md` trước khi bắt đầu — có quy tắc cập nhật tiến độ và làm việc song song với agent khác trên cùng repo.
