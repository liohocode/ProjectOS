# F26 — Data foundation & tích hợp

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Chưa bắt đầu | 10 | F22, F23 | FR-DF-01…04 |

## Mục tiêu
Meridian thành **nguồn dữ liệu chung** về tiến độ / công việc / agent / token cho các dự án và hệ thống khác của công ty: đọc được qua API, xuất được báo cáo, nối với GitHub.

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F26.1 | API đọc (REST JSON, token tích hợp riêng): dự án, feature, task, chỉ số, token — có phân trang | M | — | Chưa làm |
| F26.2 | Báo cáo tiến độ định kỳ (trang tuần / sprint) + xuất CSV | M | F22.5, F23.3 | Chưa làm |
| F26.3 | **Quyết định** + tích hợp GitHub: webhook PR / CI → cập nhật task (cần GitHub App — người dùng tạo) | L | F22.4 | Chưa làm |
| F26.4 | Tài liệu API (`docs/guides/api.md`) + ví dụ dùng từ hệ thống khác | S | F26.1 | Chưa làm |

## Quyết định / ghi chú
