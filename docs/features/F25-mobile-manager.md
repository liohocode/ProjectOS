# F25 — Người quản lý dùng trên mobile

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Chưa bắt đầu | 9 | F22.2 | FR-MB-01…04 |

## Mục tiêu
Lead / người quản lý **theo dõi trạng thái và duyệt việc trên điện thoại**: xem dự án nào đang chậm, agent nào đang chạy, duyệt revision / task Review / feature đề xuất ngay khi được nhắc.

## Phạm vi
- **Trong**: giao diện responsive cho các màn chính, màn "Cần tôi xử lý", PWA cài lên màn hình chính.
- **Ngoài**: app native, push notification (backlog — đi cùng thông báo ra ngoài).

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F25.1 | **Quyết định** hướng mobile: web responsive + PWA (khuyến nghị) / app native | S | — | Chưa làm |
| F25.2 | Màn "Cần tôi xử lý" (inbox): revision chờ duyệt, task Review, feature / task đề xuất, task bị block — dùng cả desktop | M | F22.2 | Chưa làm |
| F25.3 | App shell responsive: sidebar → thanh điều hướng dưới, header gọn, drawer toàn màn (container query) | M | F25.1 | Chưa làm |
| F25.4 | Các màn chính đọc được trên 390px: work (list), portfolio, docs (đọc + duyệt), team | M | F25.3 | Chưa làm |
| F25.5 | PWA: manifest, icon, cài lên màn hình chính, offline shell tối thiểu | S | F25.3 | Chưa làm |
| F25.6 | E2E viewport mobile cho luồng duyệt | S | F25.2, F25.4 | Chưa làm |

### F25.2 — Inbox
**Hoàn thành khi**:
- [ ] Lead thấy mọi việc cần mình duyệt ở một chỗ, duyệt / trả lại tại chỗ; badge số lượng ở sidebar / tab bar

## Quyết định / ghi chú
- Quy ước CLAUDE.md: responsive bằng **container query**, không media query.
