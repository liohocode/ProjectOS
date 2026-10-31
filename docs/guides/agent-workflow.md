# Quy ước làm việc cho coding agent dùng Meridian (F24.5)

Mục tiêu: mọi repo của công ty dùng Meridian để agent (Claude Code, …) làm việc **giống nhau** — người theo dõi trạng thái, review và đo chất lượng trên Meridian thay vì đọc lại chat. Bản dán vào repo: [`docs/templates/CLAUDE.meridian.md`](../templates/CLAUDE.meridian.md). Kết nối MCP: [`connect-agent.md`](connect-agent.md). Ở F27.8 quy ước này thành **skill dùng chung** do Meridian phân phối (thay việc chép tay).

## 1. Thiết lập một repo (tech lead, ~5 phút)
1. Meridian: agent đã là thành viên dự án; cấu hình agent có `meridian-core` + `meridian-docs`; tạo token ([connect-agent.md](connect-agent.md) mục 1).
2. Máy / môi trường chạy agent: `claude mcp add … meridian …` (mục 2 của connect-agent).
3. Repo: chép phần dưới đường kẻ của `CLAUDE.meridian.md` vào `CLAUDE.md`, thay mã dự án + lệnh kiểm tra.
4. Giao task cho agent trên Meridian (hoặc để agent tự `tasks_claim`), rồi bảo agent: *"Làm T-405 theo quy ước Meridian"*.

## 2. Vòng đời task và tool tương ứng
| Bước | Agent gọi | Meridian thấy |
|---|---|---|
| Nhận việc | `tasks_claim` | Task giao cho agent, "Đang chạy" (thời gian chạy tự tăng), phiên MCP mở |
| Lấy ngữ cảnh | `context_get` | "Context agent đã pull" trong drawer |
| Phát sinh việc ngoài phạm vi | `tasks_create(featureId, title, description, criteria)` | "Task đề xuất — chờ duyệt" ở trang feature + inbox; lead duyệt → task thật (Chờ, kèm tiêu chí) |
| Báo tiến độ / vướng | `tasks_comment`, `tasks_update_status(status: "Chờ")` | Bình luận trong drawer; task rời "Đang chạy" |
| Đạt tiêu chí | `criteria_check(taskId, criterionId, done: true)` | Tiêu chí hoàn thành trong drawer được tick, ghi agent đã tick |
| Mở PR + xin review | `tasks_update_status(stage: "Review", status: "Chờ review", prUrl, branch)` | Task trong "Chờ review" (màn work + inbox), link PR trong drawer |
| Người duyệt | — | Duyệt → Done; Trả lại → Dev + lý do (`lastReturn`) |
| Sửa tài liệu | `docs_append` | Revision chờ duyệt (màn Docs + inbox) |
| Báo token | `usage_report` *(F23.2 — chưa có; thêm vào mẫu khi xong)* | Token theo task / agent / dự án |

## 3. Vì sao quy ước như vậy
- **Một task = một branch = một PR**, PR gắn vào task (F22.4) → người review đi từ inbox thẳng tới diff; chỉ số chất lượng (F22.5) đếm đúng số lần trả lại.
- **Agent không tự Done** (F22.2): cổng review của người là điểm kiểm soát chất lượng duy nhất cho việc agent làm.
- **`context_get` trước khi làm** (F24.1): agent đọc spec và lý do bị trả lại thay vì đoán; drawer ghi lại agent đã đọc gì.
- **Vướng thì dừng và nói rõ** (`Chờ` + bình luận) thay vì đoán: lead thấy ngay ở màn work, không mất thời gian sửa việc làm sai hướng.
- **Tài liệu qua revision**: tài liệu là nguồn ngữ cảnh cho agent sau, nên mọi thay đổi đều có người duyệt.

## 4. Kiểm tra quy ước đang được tuân thủ
Trên Meridian, sau khi agent làm xong một task:
- Drawer task có: "Context agent đã pull", ít nhất một bình luận, link PR + branch, log phiên chạy kết thúc ở Review.
- Màn MCP: phiên của agent có các lệnh `tasks_claim` → `context_get` → … → `tasks_update_status` (Chờ review), không có lệnh "Bị chặn" lặp lại.
- Task không có dòng lịch sử nào agent tự đưa sang Done.

Thiếu bước nào → sửa `CLAUDE.md` của repo (hoặc mẫu này) cho rõ hơn, không sửa tay dữ liệu trên Meridian.
