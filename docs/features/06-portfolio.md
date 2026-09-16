# 06 — Portfolio

**Trạng thái:** Xong (v1)

## Mục tiêu
Lead nhìn toàn bộ dự án và nhảy vào một dự án cụ thể.

## Tham chiếu
`docs/design-reference.md` → mục "1. Portfolio".

## Data đã sẵn có
`lib/data/portfolio.ts` — `getPortfolioSummaries()` (tổng hợp `projects` + `features` + `team` thành `ProjectSummary`: featureCount/taskCount/agentCount/humanCount/avgPct/blockedCount/avatars).

## Đã làm
- [x] Dòng tóm tắt "N dự án · N người và agent dùng chung · N task đang bị block".
- [x] Grid `ProjectCard` (`auto-fill, minmax(292px,1fr)`), border trái accent (`is-open`) khi trùng project id hiện tại trong route.
- [x] Progress bar `avgPct`, 4 ô thống kê, hàng avatar tối đa 6 + cảnh báo block.
- [x] Click card → `Link href="/[project]/work"` (đổi cả project lẫn screen).

## Ghi chú
Màn hoàn toàn Server Component, không cần state client — chỉ tổng hợp dữ liệu đã có ở các module khác.
