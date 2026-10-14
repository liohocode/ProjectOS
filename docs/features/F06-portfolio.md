# F06 — Màn Portfolio

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Xong (v1) | 0 | F01 | FR-PF-01…03 |

## Mục tiêu
Lead nhìn toàn bộ dự án và nhảy vào một dự án.

## Tham chiếu
- `docs/design/design-reference.md` → "1. Portfolio"
- Code: `app/[project]/portfolio/page.tsx`, `components/portfolio/ProjectCard.tsx`, `lib/data/portfolio.ts`

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F06.1 | `getPortfolioSummaries` tổng hợp projects + features + team | S | — | Xong — 40df993 |
| F06.2 | Dòng tóm tắt + grid `ProjectCard` (viền accent dự án đang mở), click → `/[project]/work` | S | F06.1 | Xong — 40df993 |

## Đã chuyển sang feature khác
- "Dự án mới" → **F13.1**.
- Sprint đang là chuỗi → **F09.1**.

## Quyết định / ghi chú
- Màn hoàn toàn Server Component, không cần state client.
- `% tiến độ` = trung bình `Feature.pct` (pct nhập tay, không tính từ số task Done) — giữ đúng spec.
