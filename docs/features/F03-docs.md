# F03 — Màn Docs dự án

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Xong (v1) | 0 | F01 | FR-DC-01, 03, 04, 05 |

## Mục tiêu
Đọc/duyệt tài liệu gắn feature + kho tri thức chung; thấy tài liệu nào agent đã ghi, trạng thái index, duyệt revision của agent.

## Tham chiếu
- `docs/design/design-reference.md` → "2. Docs dự án"
- Code: `app/[project]/docs/page.tsx`, `components/docs/*`, `lib/data/docs.ts`, `lib/actions/docs.ts`

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F03.1 | Strip kho tri thức (`KnowledgeStrip`, `getKnowledgeStripStats`) + container query `kb` | S | — | Xong — 40df993 |
| F03.2 | Cây tài liệu (`DocTree`), chọn tài liệu qua `?doc=` | S | — | Xong — 40df993 |
| F03.3 | Thân tài liệu (`DocBodyView`): meta, tóm tắt, 3 ô info, section, khối revision | M | — | Xong — 40df993 |
| F03.4 | Nút "Duyệt" gọi server action `approveRevision` → ghi `pending=false`, `approvedById`, `approvedAt` | S | F07 | Xong — c93f6b4 |

## Đã chuyển sang feature khác
- Revision chưa mang nội dung đề xuất; duyệt chưa áp vào bản chính; chưa có từ chối/diff → **F12.1–F12.3**.
- "Tài liệu mới", sửa tài liệu → **F12.5–F12.6**.
- "Index lại", "Agent đã đọc" thật → **F18**.

## Quyết định / ghi chú
- Luồng governance (agent chỉ append → người duyệt) là lõi sản phẩm — giữ đúng UI/copy.
- "Kho tri thức chung" là **theo từng project** (Doc có `projectId` bắt buộc, `featureId` null).
