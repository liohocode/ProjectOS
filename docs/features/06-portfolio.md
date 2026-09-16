# 06 — Portfolio

**Trạng thái:** Chưa bắt đầu

## Mục tiêu
Lead nhìn toàn bộ dự án và nhảy vào một dự án cụ thể.

## Tham chiếu
`docs/design-reference.md` → mục "1. Portfolio".

## Data đã sẵn có
`lib/data/projects.ts` (`getProjects`), kết hợp `lib/data/features.ts` để tính % trung bình/tổng task/blocked theo từng project, `lib/data/team.ts` cho avatar hàng (`getTeamByProject`).

## Checklist
- [ ] Dòng tóm tắt: "N dự án · N người và agent dùng chung · N task đang bị block" — tính từ data đã có (không cần mock mới).
- [ ] Grid project card (`auto-fill, minmax(292px,1fr)`), border trái accent cho dự án đang mở (so với project id hiện tại trong route).
- [ ] Progress bar theo % trung bình các feature của project, 4 ô thống kê (Feature/Task/Agent/Người), hàng avatar tối đa 6 + cảnh báo "N task bị block" nếu có.
- [ ] Click card → điều hướng `/[project]/work` (đổi cả project lẫn screen — khác với `ProjectSwitcher` hiện tại chỉ giữ nguyên screen).

## Ghi chú
Đây là màn ít phụ thuộc state client nhất trong 5 màn — chủ yếu là tổng hợp dữ liệu đã có, phù hợp làm sau cùng như spec gợi ý.
