# F12 — Soạn & duyệt tài liệu (governance thật)

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Đang làm | 2 | F03, F11.4 (khuôn mẫu dialog) | FR-DC-06, 07, 08 |

## Mục tiêu
Hiện revision chỉ có **mô tả** ("Revision mới: cập nhật mục Tiêu chí…") — duyệt chỉ đổi cờ, không có nội dung nào được đưa vào bản chính. Feature này làm cho luồng governance — **lõi sản phẩm** — chạy thật: revision mang nội dung đề xuất, người duyệt xem diff rồi duyệt (áp vào bản chính) hoặc từ chối; người tạo và sửa tài liệu trực tiếp.

## Phạm vi
- **Trong**: schema revision, duyệt/từ chối, diff, tạo tài liệu, người sửa trực tiếp, hiển thị lịch sử.
- **Ngoài**: agent gửi revision qua MCP `docs.append` (F16.5 — dùng lại hàm tạo revision ở đây), index lại sau khi duyệt (F18.4), phân quyền ai được duyệt (F15.4).

## Tham chiếu
- `docs/design/design-reference.md` → "2. Docs dự án" (khối "Revision chờ duyệt và lịch sử")
- `docs/product/overview.md` → "Governance tài liệu"
- Code: `lib/actions/docs.ts`, `components/docs/*`, `lib/data/docs.ts`, `prisma/schema.prisma` (`DocRevision`)

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F12.1 | Schema revision: nội dung đề xuất + trạng thái | M | — | Xong — 2026-10-28 |
| F12.2 | Duyệt = áp nội dung vào bản chính, tăng version | S | F12.1 | Xong — 2026-10-28 |
| F12.3 | Từ chối revision + xem diff trước khi duyệt | M | F12.1 | Chưa làm |
| F12.4 | Lịch sử hiển thị người duyệt / bị từ chối | S | F12.1 | Chưa làm |
| F12.5 | "Tài liệu mới" | M | F11.4 | Chưa làm |
| F12.6 | Người sửa tài liệu trực tiếp | M | F12.1, F11.4 | Chưa làm |
| F12.7 | `approveRevision` theo quy ước action (ADR-017) | S | — | Xong — 2026-10-28 |

### F12.1 — Schema revision
**Làm gì**: `DocRevision`: thay `pending Boolean` bằng enum `RevisionStatus` (`pending`, `approved`, `rejected`); thêm `proposedSummary String?`, `proposedSections Json?` (cùng shape `[{heading, paras[]}]` với `Doc.sections`), `rejectedReason String?`, `baseVersion String` (version của doc lúc tạo revision). Migration chuyển dữ liệu cũ (`pending=true` → `pending`, còn lại → `approved`). Seed: 2 revision đang chờ ở `prd-listing`, `mcp-spec` có `proposedSections` = bản hiện tại + thay đổi đúng như mô tả (vd thêm đoạn vào "Tiêu chí hoàn thành"). Tách hàm `createRevision(docId, authorId, what, proposed)` trong `lib/actions/docs.ts` (hoặc `lib/domain/docs.ts` nếu cần dùng từ MCP) để F16.5 tái sử dụng. Cập nhật `lib/data/docs.ts`, `lib/types.ts` (`DocRevision.status`), `getPendingRevision*` lọc theo status.
**Hoàn thành khi**:
- [x] UI hiện như trước, nút "Duyệt" vẫn đúng chỗ; `data-model.md` cập nhật (e2e smoke "duyệt revision" xanh)

### F12.2 — Duyệt áp nội dung
**Làm gì**: `approveRevision` chạy trong `prisma.$transaction`: nếu revision có `proposedSections`/`proposedSummary` → ghi vào `Doc`, tăng version phụ (`v4.2` → `v4.3`), `updatedAt = now`; nếu `baseVersion` khác version hiện tại → từ chối duyệt với lỗi "Tài liệu đã thay đổi từ khi revision được tạo" (tránh ghi đè).
**Hoàn thành khi**:
- [x] Duyệt revision của `prd-listing` → thân tài liệu đổi theo, version tăng, reload vẫn giữ (e2e smoke "duyệt revision")

### F12.3 — Từ chối + diff
**Làm gì**: nút "Từ chối" (nhập lý do) → `rejectRevision`. Nút/khu "Xem thay đổi" mở rộng dưới dòng revision: so sánh theo section — section mới, section bị xoá, đoạn thay đổi (diff theo đoạn là đủ, không cần diff ký tự). Viết hàm thuần `diffSections(current, proposed)` + unit test.
**Hoàn thành khi**:
- [ ] Từ chối → revision rời khỏi trạng thái chờ, badge nav "Docs" giảm
- [ ] Diff hiển thị đúng cho 2 revision mẫu

### F12.4 — Lịch sử
**Làm gì**: mỗi dòng lịch sử hiện trạng thái: "Đã duyệt bởi Trung Hiếu · 2 giờ trước", "Bị từ chối: <lý do>", hoặc nút Duyệt/Từ chối nếu đang chờ. Bỏ cơ chế `approved` state cục bộ trong `ApproveButton` (dữ liệu lấy lại từ server).
**Lỗi đang tồn tại (phát hiện ở F08.4)**: bấm "Duyệt" hiện tại **không có phản hồi** — `revalidatePath` render lại trang, revision hết chờ nên `ApproveButton` bị gỡ trước khi kịp hiện "Đã duyệt"; người dùng chỉ thấy nút biến mất. Task này sửa luôn. Cập nhật `e2e/smoke.spec.ts` (test "duyệt revision") để kiểm tra dòng "Đã duyệt bởi …".
**Hoàn thành khi**:
- [ ] Trạng thái lịch sử đúng sau reload

### F12.5 — Tài liệu mới
**Làm gì**: dùng khuôn mẫu dialog theo URL (ADR "Dialog điều khiển bằng URL", tạo ở F11.4) cho màn docs: tiêu đề, gắn feature (hoặc "Kho tri thức chung"), tóm tắt, nội dung (textarea markdown — tách section theo dòng `## `). Action `createDoc` sinh id slug từ tiêu đề (bỏ dấu tiếng Việt), thêm hậu tố nếu trùng (id `Doc` là khoá toàn cục). Người tạo = tác giả, `agentWritten=false`, version `v1.0`. Sau khi tạo điều hướng `?doc=<id>`.
**Hoàn thành khi**:
- [ ] Tạo tài liệu tiếng Việt có dấu → id slug hợp lệ, hiển thị trong cây đúng nhóm

### F12.6 — Người sửa trực tiếp
**Làm gì**: nút "Sửa" ở thân tài liệu → form (tóm tắt + nội dung markdown). Lưu: tạo revision `approved` do chính người sửa (để có lịch sử), áp nội dung, tăng version. Agent **không** có đường này (chỉ `docs.append`).
**Hoàn thành khi**:
- [ ] Sửa xong thấy dòng lịch sử mới "Đã duyệt bởi <người sửa>"

### F12.7 — `approveRevision` theo ADR-017
**Làm gì** (phát hiện khi rà repo 2026-10-28): action duyệt có từ F03.4, trước khi có ADR-017 — không validate, không trả `ActionResult`, không kiểm tra revision thuộc `projectId` client gửi lên (dùng luôn làm path revalidate), duyệt lại revision đã duyệt vẫn ghi đè người/thời điểm duyệt, `ApproveButton` không bắt lỗi. Sửa: zod + `ActionResult`; từ chối revision không thuộc dự án / không tồn tại; `updateMany` có điều kiện `pending=true` để hai lần duyệt đồng thời chỉ một lần ghi; `ApproveButton` hiện lỗi tại chỗ. Không đổi luồng phản hồi sau khi duyệt (lỗi "nút biến mất" vẫn để F12.4).
**Hoàn thành khi**:
- [x] Integration test: duyệt lại, revision dự án khác, revision không tồn tại, input rỗng → `{ ok: false }` và không ghi DB

## Quyết định / ghi chú
- **F12.2 (2026-10-28)**: logic nằm ở `lib/domain/docs.ts` → `applyRevision(revisionId, approverId)` (F12.6 người sửa trực tiếp dùng lại); `approveRevision` (server action) chỉ kiểm tra dự án rồi gọi. Ghi tài liệu bằng `updateMany where { version: baseVersion }` (khoá lạc quan) → hai revision cùng gốc duyệt đồng thời: đúng một thành công, cái còn lại "Tài liệu đã thay đổi từ khi revision được tạo" và vẫn chờ (test integration chạy song song). Version: `lib/docVersion.ts` `bumpMinorVersion` (`v4.2` → `v4.3`, `v1.9` → `v1.10`). Revision cũ không có nội dung đề xuất: chỉ đánh dấu approved, không đổi version.
- **F12.1 (2026-10-28, người dùng đồng ý migration đổi kiểu cột)**: migration `revision_status_content` viết tay theo quy tắc 4 CLAUDE.md — thêm cột (`baseVersion` tạm nullable) → chuyển dữ liệu (`pending=true` → `pending`, còn lại → `approved`; `baseVersion` = version hiện tại của tài liệu) → `SET NOT NULL` → xoá cột `pending`; `migrate diff` sau đó ra "empty migration" (SQL Prisma tự sinh sẽ xoá cột trước khi chuyển và thêm `NOT NULL` không giá trị). `createRevision` đặt ở **`lib/domain/docs.ts`** (không "use server" — client không gọi thẳng; F16.5 MCP `docs.append` dùng lại), kèm `docSectionsSchema` (zod) dùng chung cho F12.5/F12.6. Dữ liệu mẫu: `prisma/seed-data/revisions.ts` sinh nội dung đề xuất = bản hiện tại + thay đổi theo mô tả. Thông báo duyệt lại đổi thành "Revision này không còn chờ duyệt" (đúng cả khi đã bị từ chối).
- Nội dung tài liệu tiếp tục lưu dạng `sections Json` (không chuyển sang markdown thô) — form chỉ chuyển đổi qua lại markdown ↔ sections ở biên.
