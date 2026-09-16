# 03 — Docs dự án

**Trạng thái:** Xong (v1)

## Mục tiêu
Đọc/duyệt tài liệu gắn với feature + kho tri thức chung; luồng governance: agent chỉ `docs.append` thành revision chờ người duyệt.

## Tham chiếu
`docs/design-reference.md` → mục "2. Docs dự án" (strip kho tri thức, cây tài liệu, thân tài liệu, khối "Revision chờ duyệt và lịch sử").

## Data đã sẵn có
`lib/data/docs.ts` — `getDocGroupsByProject(projectId)`, `getFirstDocId(projectId)`, `getDocBody(id)`, `getDocCountByProject`, `getPendingRevisionCount`. Type: `DocGroup`, `DocItem`, `DocBody`, `DocRevision`.

Lưu ý: `getDocBody` hiện chỉ có nội dung đầy đủ cho 3 doc mẫu (`prd-listing`, `mcp-spec`, `arch`) — các doc còn lại trả về nội dung placeholder tự sinh. Bổ sung thêm nội dung mẫu nếu cần demo nhiều doc hơn.

## Đã làm
- [x] Strip kho tri thức: `KnowledgeStrip` + `getKnowledgeStripStats()` (chunk/agent đã ghi/index cuối tính từ `DOC_BODIES` thật, không hard-code).
- [x] Container query ẩn cột theo breakpoint (`.kb-drop`/`.kb-drop-2`, container `kb` khai báo ở `.kb-strip`).
- [x] Cây tài liệu trái: `DocTree`, dùng `<Link href="?doc=...">` — chuyển tài liệu qua URL query param (`?doc=`), không phải client state, nên bookmark/back-button hoạt động đúng.
- [x] Thân tài liệu: `DocBodyView` — meta row, tóm tắt, 3 ô thông tin, các section, khối revision + `ApproveButton` (client, chỉ đổi state UI khi bấm "Duyệt", chưa gọi API).

## Còn thiếu / cần làm tiếp
- [ ] `ApproveButton` chưa gọi API thật — chỉ ẩn nút và hiện tag "Đã duyệt" phía client.
- [ ] `getKnowledgeStripStats` chỉ tính được từ 3 doc có `DOC_BODIES` đầy đủ — số liệu "Tài liệu n/n đã index" sẽ thấp hơn thực tế nếu thêm nhiều doc mới mà không viết `DOC_BODIES` tương ứng.

## Ghi chú
Đây là màn có luồng governance quan trọng nhất của sản phẩm — giữ đúng UI/copy vì đây là phần dễ bị hỏi lại khi demo.
