# F25 — Người quản lý dùng trên mobile

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Đang làm | 9 | F22.2 | FR-MB-01…04 |

## Mục tiêu
Lead / người quản lý **theo dõi trạng thái và duyệt việc trên điện thoại**: xem dự án nào đang chậm, agent nào đang chạy, duyệt revision / task Review / feature đề xuất ngay khi được nhắc.

## Phạm vi
- **Trong**: giao diện responsive cho các màn chính, màn "Cần tôi xử lý", PWA cài lên màn hình chính.
- **Ngoài**: app native, push notification (backlog — đi cùng thông báo ra ngoài).

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F25.1 | **Quyết định** hướng mobile: web responsive + PWA (khuyến nghị) / app native | S | — | Xong — 2026-10-30 (web responsive + PWA) |
| F25.2 | Màn "Cần tôi xử lý" (inbox): revision chờ duyệt, task Review, feature / task đề xuất, task bị block — dùng cả desktop | M | F22.2 | Xong — 2026-10-31 |
| F25.3 | App shell responsive: sidebar → thanh điều hướng dưới, header gọn, drawer toàn màn (container query) | M | F25.1 | Chưa làm |
| F25.4 | Các màn chính đọc được trên 390px: work (list), portfolio, docs (đọc + duyệt), team | M | F25.3 | Chưa làm |
| F25.5 | PWA: manifest, icon, cài lên màn hình chính, offline shell tối thiểu | S | F25.3 | Chưa làm |
| F25.6 | E2E viewport mobile cho luồng duyệt | S | F25.2, F25.4 | Chưa làm |

### F25.2 — Inbox
**Hoàn thành khi**:
- [x] Lead thấy mọi việc cần mình duyệt ở một chỗ, duyệt / trả lại tại chỗ; badge số lượng ở sidebar / tab bar (integration `lib/data/inbox.integration.test.ts`, e2e `inbox.spec.ts`; tab bar mobile làm ở F25.3)

## Quyết định / ghi chú
- **F25.2 (2026-10-31)**: route `/[project]/inbox`, mục đầu tiên ở sidebar ("Cần tôi xử lý", badge = tổng việc, cảnh báo khi > 0). **Theo dự án đang mở** (như mọi màn khác — quyền duyệt tính theo dự án); inbox gộp nhiều dự án để sau nếu cần. Phần hiện theo quyền (`lib/inbox.ts`): revision chờ duyệt (`doc.review`), task Review (`task.review`), feature đề xuất (`feature.review`); task bị block ai cũng thấy. Chưa có "task đề xuất" (agent chưa đề xuất task — F24.2) nên inbox chưa có mục này. Duyệt tại chỗ dùng lại `RevisionItem`, `TaskReviewBox` (thêm `compact`), `ProposedFeatures`; task mở drawer ở màn work. `rejectFeatureProposal` revalidate cả layout để badge cập nhật. Header: `ScreenMeta.primary` tuỳ chọn (inbox không có nút chính).
- **F25.1 (2026-10-30)** — người dùng chốt: web responsive + PWA, không làm app native.
- Quy ước CLAUDE.md: responsive bằng **container query**, không media query.
