# Kết nối AI agent với Meridian qua MCP

Meridian tự chạy một MCP server (F16, ADR-022). Agent (Claude Code, hoặc client MCP bất kỳ hỗ trợ Streamable HTTP) kết nối bằng **token riêng của agent**, đọc task / tài liệu, nhận task, báo tiến độ và đề xuất sửa tài liệu — mọi lệnh hiện ở màn **MCP** (phiên chạy + nhật ký lệnh).

## 1. Tạo token cho agent (tech lead, ~1 phút)
1. Mở Meridian → **Dev & AI agents** → chọn agent (vd Atlas).
2. Kiểm tra mục **Cấu hình agent** → "Sửa":
   - **MCP server**: có `meridian-core` (tool task) và/hoặc `meridian-docs` (tool tài liệu) — thiếu server nào thì tool của server đó bị chặn.
   - **Quyền ghi docs**: "Chỉ đọc" chặn `docs_append`.
   - **Task đồng thời**: số task agent được chạy cùng lúc (mặc định 2).
3. Mục **Token MCP** → **Tạo token** → đặt tên (vd "Claude Code trên laptop Hiếu") → **Sao chép**. Token chỉ hiện **một lần**; Meridian chỉ lưu bản băm.

Thu hồi: cùng mục, nút "Thu hồi" — có hiệu lực ngay ở lệnh tiếp theo.

## 2. Thêm vào Claude Code (~1 phút)
```bash
claude mcp add --transport http meridian https://meridian-669737756643.asia-southeast1.run.app/api/mcp --header "Authorization: Bearer <token>"
```
Dev local thay URL bằng `http://localhost:3000/api/mcp`. Kiểm tra: `claude mcp list` (meridian ✓ connected), hoặc trong Claude Code gõ `/mcp`.

Thử: *"Dùng Meridian liệt kê task của tôi đang ở stage Dev"* → Claude gọi `tasks_list`.

Luồng làm một task: `tasks_claim` → `context_get` → làm → `tasks_comment` (tiến độ) → `tasks_update_status` stage Review → chờ người duyệt (bị trả lại thì `lastReturn` có lý do).

## 3. Danh sách tool
| Tool | Server | Tham số | Làm gì |
|---|---|---|---|
| `tasks_list` | core | `projectId?`, `stage?` (BA/TA/Dev/Review/Done), `assigneeId?` (`"me"` = chính agent) | Task trong các dự án agent thuộc về (tối đa 200) |
| `tasks_claim` | core | `taskId` | Nhận task: giao cho agent, "Đang chạy" |
| `context_get` | core | `taskId` | **Một lệnh đủ ngữ cảnh**: task (kèm `lastReturn`), feature, tài liệu của feature (đầy đủ, tối đa 5 — cần `meridian-docs`), bình luận, lịch sử trạng thái |
| `tasks_update_status` | core | `taskId`, `stage?` (BA/TA/Dev/Review), `status?` (Đang làm/Chờ/Chờ review) | Báo tiến độ task **của mình**; đổi trạng thái = nhả task |
| `tasks_comment` | core | `taskId`, `body` | Bình luận — hiện ở mục "Bình luận" của task |
| `docs_search` | docs | `query`, `projectId?` | Tìm từ khoá (không dấu) trong tiêu đề / tóm tắt / nội dung, tối đa 10 |
| `docs_read` | docs | `docId` | Đọc toàn bộ tài liệu |
| `docs_append` | docs | `docId`, `what`, `summary?`, `content?` (markdown `## Mục`) | Đề xuất sửa → **revision chờ người duyệt**, không bao giờ ghi thẳng |

## 4. Luật governance (FR-AG)
- Agent chỉ thấy / thao tác **dự án mình thuộc về** (Dev & AI agents → "Thêm thành viên").
- `tasks_claim`: bị chặn nếu task Done, đang bị block, đang được người khác chạy, hoặc agent đã chạy đủ số task đồng thời.
- Agent **không tự Done** — chuyển sang stage Review để người duyệt; "Đang chạy" chỉ qua `tasks_claim`; chỉ sửa task đang giao cho mình.
- Người duyệt có thể **trả lại** task về Dev kèm lý do: `tasks_list` trả `lastReturn { reason, at }` — đọc lý do, sửa, rồi đẩy Review lại.
- `docs_append` luôn thành revision "Chờ review" ở màn Docs; tech lead / người tạo dự án duyệt.
- **60 lệnh/phút mỗi token** (kể cả lệnh bị chặn).
- Mọi lệnh ghi nhật ký (tool, đối tượng, kết quả OK / Chờ review / Bị chặn, token). Phiên = agent làm việc trên một dự án, tự đóng sau 30 phút không có lệnh.
- Lệnh bị chặn trả lỗi có lý do (`{ "denied": true, "reason": … }` hoặc `{ "claimed": false, "reason": … }`) — agent đọc lý do để xử lý.

## 5. Gỡ lỗi
| Triệu chứng | Nguyên nhân |
|---|---|
| `401` | Thiếu header `Authorization: Bearer …`, sai token, hoặc token đã thu hồi |
| `405` | Client mở stream GET — Meridian chỉ nhận POST (stateless); client chuẩn tự xử lý |
| "chưa được cấu hình MCP server …" | Thêm server vào cấu hình agent (mục 1.2) |
| "Quyền ghi docs … Chỉ đọc" | Đổi quyền ghi docs của agent |
| "Vượt giới hạn 60 lệnh/phút" | Đợi vài giây |
| Không thấy task / tài liệu | Agent chưa thuộc dự án đó |
