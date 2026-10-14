# F04 — Màn Dev & AI agents

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Xong (v1) | 0 | F01 | FR-TM-01…05 |

## Mục tiêu
Lead xem ai (người hay agent) đang làm gì, xem cấu hình agent.

## Tham chiếu
- `docs/design/design-reference.md` → "4. Dev & AI agents"
- Code: `app/[project]/team/page.tsx`, `components/team/*`, `lib/data/team.ts`

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F04.1 | 4 card pipeline (`PipelineCards`, dùng lại `getPipelineAgents`) | S | — | Xong — 40df993 |
| F04.2 | Bộ lọc `.seg` 4 chế độ + danh sách `MemberRow` + container query `team` | M | — | Xong — 40df993 |
| F04.3 | Panel chi tiết `MemberPanel`: cấu hình agent, skills, hoạt động gần đây; tự ẩn < 1120px | M | — | Xong — 40df993 |

## Đã chuyển sang feature khác
- "Thêm thành viên", "Giao task", "Xem log", sửa cấu hình agent → **F13.2–F13.5**.
- `Member.status` / `current` là chuỗi tự do → **F09.4**.

## Quyết định / ghi chú
- Avatar người/agent dùng class `.avatar-human` / `.avatar-agent` — tái dùng, không viết style mới.
- Đổi filter sang "org" có thể giữ member đang chọn không nằm trong danh sách hiện tại — chấp nhận ở v1.
