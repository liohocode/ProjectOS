# F11 — Thao tác Task (ghi xuống DB)

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Đang làm | 2 | F07 (khuyến nghị F09.2 trước) | FR-WK-08, FR-WK-09, FR-SH-05 |

## Mục tiêu
Lead điều phối được công việc thật: chuyển stage, giao task, tạo task, đặt/gỡ block — mọi thay đổi ghi xuống Postgres. Đồng thời dựng **khuôn mẫu dùng chung** cho nút hành động chính ở header + dialog, để F12/F13 tái sử dụng.

## Phạm vi
- **Trong**: Server Actions cho task, nối drawer với DB, dialog "Task mới", block/unblock, sửa nhanh task, ghi hoạt động của người thao tác.
- **Ngoài**: phân quyền (F15 — tạm thời ai cũng làm được), agent tự claim qua MCP (F16), realtime (F17).

## Tham chiếu
- `docs/design/design-reference.md` → "Task drawer", "Interactions & Behavior"
- `docs/architecture/decisions.md` → ADR-006 (sinh id), ADR-010 (Server Actions), ADR-011 (người dùng hiện tại)
- Code mẫu: `lib/actions/docs.ts` + `components/docs/ApproveButton.tsx` (pattern `useTransition` + server action)
- Code liên quan: `components/work/WorkScreen.tsx`, `components/work/TaskDrawer.tsx`, `components/layout/Header.tsx`, `components/layout/screenMeta.ts`

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F11.1 | Gom "người dùng hiện tại" về `lib/auth/currentUser.ts` | S | — | Xong — 2026-10-15 |
| F11.2 | Server actions `lib/actions/tasks.ts` (stage, assign, status) + validation | M | F11.1 | Xong — 2026-10-15 |
| F11.3 | Nối task drawer với server actions, bỏ state sửa tạm ở client | S | F11.2 | Xong — 2026-10-15 |
| F11.4 | Khuôn mẫu "hành động chính ở header" + dialog; "Task mới" | M | F11.2 | Xong — 2026-10-15 |
| F11.5 | Đặt / gỡ block cho task | S | F11.2 | Xong — 2026-10-15 |
| F11.6 | Sửa nhanh task trong drawer (tiêu đề, ước lượng, hạn) | S | F11.2, F09.2 | Xong — 2026-10-15 |
| F11.7 | Ghi `MemberActivity` cho người thao tác | S | F11.2 | Chưa làm |

### F11.1 — Người dùng hiện tại
**Làm gì**: tạo `lib/auth/currentUser.ts` export `getCurrentUserId()` và `getCurrentUser()` (trả `Member`), tạm thời trả `"hieu"`. Thay 2 chỗ hardcode: `app/[project]/layout.tsx` (`getMemberById("hieu")`) và `lib/actions/docs.ts` (`CURRENT_USER_ID`).
**Hoàn thành khi**:
- [x] `grep -rn '"hieu"' app lib components` chỉ còn trong `lib/auth/currentUser.ts`

### F11.2 — Server actions cho task
**Làm gì**: `lib/actions/tasks.ts` (`"use server"`): `updateTaskStage(taskId, stage)`, `assignTask(taskId, memberId)`, `updateTaskStatus(taskId, status)`. Validate input ở biên (khuyến nghị thêm `zod`): stage/status thuộc enum, task tồn tại, member thuộc project của task (qua `ProjectMember`). Trả về `{ ok: true } | { ok: false, error: string }` thay vì throw cho lỗi nghiệp vụ. Gọi `revalidatePath('/<projectId>/work')` (và `/team`, `/portfolio` nếu ảnh hưởng số liệu).
**File**: `lib/actions/tasks.ts`, `package.json` (nếu thêm zod)
**Hoàn thành khi**:
- [x] Integration test (nếu F08 xong) cho từng action: thành công + giao cho member ngoài project bị từ chối

### F11.3 — Drawer ghi DB thật
**Làm gì**: `TaskDrawer` gọi `updateTaskStage` / `assignTask` (truyền **member id**, không phải tên). Dùng `useOptimistic` hoặc `useTransition` + trạng thái đang lưu. Xoá cơ chế sửa tạm ở client trong `WorkScreen` (`useState(initialFeatures)`, `updateTask`, `cycleStage`, `assignAgent`) — dữ liệu lấy lại từ server sau `revalidatePath`. Lỗi → hiện thông báo trong drawer.
**Hoàn thành khi**:
- [x] Chuyển stage / giao agent rồi reload trang → thay đổi vẫn còn
- [x] Badge nav, banner block, activity rail cập nhật theo (revalidate cả cây `/[project]`, ADR-017)

### F11.4 — Khuôn mẫu hành động chính + "Task mới"
**Làm gì**: header nằm ở layout nên không nhận props từ page. Khuôn mẫu chọn: **dialog điều khiển bằng URL** — nút chính ở `Header` đặt query `?new=1` (giữ query khác); `page.tsx` của màn đọc `searchParams.new` và render dialog tương ứng với dữ liệu lựa chọn tải sẵn ở server; đóng dialog = bỏ `new` khỏi URL. Tạo component dùng chung `components/ui/Dialog.tsx` (dùng class `.dialog-backdrop`, `.dialog` đã có trong `globals.css`, Esc/click ngoài để đóng, focus trap cơ bản) và `components/ui/Field.tsx` (label + input/select theo `.input`). Áp dụng cho màn work: form "Task mới" (feature, tiêu đề, stage, người/agent thực hiện, ước lượng, hạn) → action `createTask`; sinh id `T-<số lớn nhất + 1>` trong transaction (ADR-006).
**File**: `components/layout/Header.tsx`, `components/ui/Dialog.tsx`, `components/ui/Field.tsx`, `components/work/NewTaskDialog.tsx`, `app/[project]/work/page.tsx`, `lib/actions/tasks.ts`
**Hoàn thành khi**:
- [x] Tạo task mới → xuất hiện đúng feature, id không trùng kể cả khi tạo liên tiếp nhanh
- [x] Ghi ADR mới (ADR-018) "Dialog điều khiển bằng URL" vào `docs/architecture/decisions.md` để F12/F13 dùng lại

### F11.5 — Block / unblock
**Làm gì**: trong drawer thêm nút "Đánh dấu bị block" (nhập lý do ngắn + lý do đầy đủ) và "Gỡ block". Action `setTaskBlocked(taskId, { short, full } | null)`.
**Hoàn thành khi**:
- [x] Block 1 task → banner + viền amber + badge nav cập nhật; gỡ → biến mất

### F11.6 — Sửa nhanh task
**Làm gì**: trong drawer cho sửa tiêu đề, ước lượng (điểm), hạn (date input) — inline hoặc dialog nhỏ. Action `updateTask(taskId, patch)`.
**Hoàn thành khi**:
- [x] Sửa xong hiển thị đúng ở task row và drawer sau reload

### F11.7 — Ghi hoạt động
**Làm gì**: mỗi action ở F11.2–F11.6 ghi một dòng `MemberActivity` cho người thao tác (icon + mô tả, vd "Chuyển T-401 sang Review") để panel "Hoạt động gần đây" ở màn team phản ánh thao tác thật. Viết helper `recordActivity(memberId, icon, text)` trong `lib/actions/_activity.ts`. (F17 sẽ thay bằng bảng sự kiện đầy đủ — giữ helper là điểm duy nhất cần sửa.)
**Hoàn thành khi**:
- [ ] Thao tác ở màn work → thấy dòng mới trong panel của Trung Hiếu ở màn team

## Quyết định / ghi chú
- Trước F15, mọi người đều có quyền thao tác; ghi chú `// TODO(F15.4): kiểm tra quyền` tại đầu mỗi action để F15 dễ tìm.
