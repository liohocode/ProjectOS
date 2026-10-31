<!--
CLAUDE.md mẫu cho repo dùng Meridian (F24.5). Cách dùng:
1. Chép phần dưới đường kẻ vào CLAUDE.md (hoặc AGENTS.md) ở gốc repo của dự án.
2. Thay <MÃ-DỰ-ÁN>, <lệnh kiểm tra> cho đúng repo.
3. Kết nối Meridian MCP theo docs/guides/connect-agent.md (repo Meridian).
Quy ước đầy đủ + lý do: docs/guides/agent-workflow.md (repo Meridian).
-->

---

## Làm việc với Meridian (bắt buộc)
Dự án này quản lý task trên **Meridian** (dự án `<MÃ-DỰ-ÁN>`), kết nối qua MCP server `meridian`. Mọi việc code đều gắn với **một task Meridian**; người review trên Meridian, không phải trong chat.

### Vòng làm một task
1. **Chọn task** — người giao mã task (vd `T-405`) thì dùng mã đó; không thì `tasks_list` (`assigneeId: "me"`, rồi stage `Dev`) và chọn task chưa Done, không bị block. Không tự tạo việc ngoài task.
2. **Nhận** — `tasks_claim(taskId)`. Bị chặn → đọc `reason`, báo người, **dừng** (không làm task đang bị block hay đang có người chạy).
3. **Lấy ngữ cảnh** — `context_get(taskId)` một lần: task, feature, tài liệu spec (tài liệu gắn với task có `linked: true`, đọc trước), bình luận, lịch sử. Có `lastReturn` → đây là lần làm lại: sửa đúng lý do trong `lastReturn.reason` trước tiên.
4. **Làm** — trên branch riêng `<taskId>-<mô-tả-ngắn>` (vd `T-405-autosave`). Chỉ làm đúng phạm vi task; việc phát sinh → `tasks_create(featureId, title, description, criteria)` đề xuất task mới (lead duyệt mới thành task) hoặc `tasks_comment`, không làm lấn.
5. **Báo tiến độ** — mốc đáng kể (xong thiết kế, mở PR, gặp vướng) → `tasks_comment` một dòng ngắn, viết cho người đọc sau.
6. **Vướng** — thiếu thông tin / chờ người khác → `tasks_comment` nêu rõ cần ai làm gì, rồi `tasks_update_status(status: "Chờ")`. Không đoán thay người quyết định.
7. **Kiểm tra** — chạy `<lệnh kiểm tra>` (lint, test, build) cho tới khi xanh. Không tắt / bỏ qua test để cho xanh. Mỗi acceptance criterion (`context_get` → `criteria`) đã kiểm chứng → `criteria_check(taskId, criterionId, done: true)`; tiêu chí chưa đạt được thì nêu lý do bằng `tasks_comment`.
8. **Mở PR + đẩy Review** — commit, push, mở PR (tiêu đề bắt đầu bằng mã task), rồi **một lệnh**:
   `tasks_update_status(taskId, stage: "Review", status: "Chờ review", prUrl, branch)`.
   Agent **không tự Done** — người duyệt trên Meridian.
9. **Tài liệu** — thay đổi làm spec / tài liệu cũ sai → `docs_append` đề xuất sửa (thành revision chờ duyệt), ghi rõ `what`.
10. **Bị trả lại** — task quay về Dev, `context_get` / `tasks_list` có `lastReturn` → làm lại từ bước 3 trên cùng branch / PR.

### Không được
- Tự đánh dấu Done, sửa task không giao cho mình, claim quá số task đồng thời được cấu hình.
- Ghi thẳng vào tài liệu (chỉ `docs_append`), dán secret / token vào bình luận hay tài liệu.
- Bỏ qua lỗi `denied` / `reason` từ Meridian — đọc lý do và xử lý hoặc báo người.
