# 03 — Docs dự án

**Trạng thái:** Chưa bắt đầu

## Mục tiêu
Đọc/duyệt tài liệu gắn với feature + kho tri thức chung; luồng governance: agent chỉ `docs.append` thành revision chờ người duyệt.

## Tham chiếu
`docs/design-reference.md` → mục "2. Docs dự án" (strip kho tri thức, cây tài liệu, thân tài liệu, khối "Revision chờ duyệt và lịch sử").

## Data đã sẵn có
`lib/data/docs.ts` — `getDocGroupsByProject(projectId)`, `getFirstDocId(projectId)`, `getDocBody(id)`, `getDocCountByProject`, `getPendingRevisionCount`. Type: `DocGroup`, `DocItem`, `DocBody`, `DocRevision`.

Lưu ý: `getDocBody` hiện chỉ có nội dung đầy đủ cho 3 doc mẫu (`prd-listing`, `mcp-spec`, `arch`) — các doc còn lại trả về nội dung placeholder tự sinh. Bổ sung thêm nội dung mẫu nếu cần demo nhiều doc hơn.

## Checklist
- [ ] Strip kho tri thức (thống kê: Tài liệu n/n đã index, Chunk, Revision chờ duyệt, Agent đã ghi, Index cuối, Embedding) — cần bổ sung vài số liệu tổng hợp (chunk count, agent đã ghi) chưa có trong mock, tính từ `DOC_BODIES` hoặc thêm field.
- [ ] Container query ẩn bớt cột theo `docs/design-reference.md` (dưới 1040px ẩn Embedding, dưới 800px ẩn thêm Agent đã ghi + Index cuối) — dùng class `.kb`/`.kb-drop`/`.kb-drop-2` đã có sẵn CSS trong `app/globals.css`.
- [ ] Cây tài liệu trái (264px, group theo feature + "Kho tri thức chung", icon `ph-sparkle` cho doc do agent ghi).
- [ ] Thân tài liệu: meta row, tóm tắt, 3 ô thông tin, các section, khối revision (nút "Duyệt" chỉ hiện với `pending: true`).
- [ ] State `doc` (id tài liệu đang xem) — khi đổi project qua switcher phải reset về `getFirstDocId(newProjectId)` (xem ghi chú trong `docs/features/01-app-shell.md`).

## Ghi chú
Đây là màn có luồng governance quan trọng nhất của sản phẩm — khi implement nút "Duyệt", chỉ cần đổi state phía client (chưa có backend thật), nhưng giữ đúng UI/copy vì đây là phần dễ bị hỏi lại khi demo.
