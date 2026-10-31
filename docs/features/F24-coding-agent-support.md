# F24 — Hỗ trợ coding agent & tài liệu kỹ thuật

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Đang làm | 8 | F16, F21.6 | FR-AG-10…14 |

## Mục tiêu
Agent lấy đủ ngữ cảnh trong **một lệnh**, tự chia task / đề xuất tài liệu mới theo đúng governance, và có quy ước làm việc chuẩn để mọi repo của công ty dùng Meridian giống nhau.

## Phạm vi
- **Trong**: tool MCP mới, template tài liệu (PRD, tech spec, ADR, runbook), CLAUDE.md mẫu cho repo dùng Meridian.
- **Ngoài**: tìm kiếm ngữ nghĩa (F18 — hoãn), OAuth cho MCP (backlog).

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F24.1 | Tool `context_get(taskId)`: task + feature + acceptance criteria + tài liệu liên quan + bình luận + lý do trả lại | M | F21.6 | Xong — 2026-10-31 (acceptance criteria thêm ở F21.6) |
| F24.2 | Tool `tasks_create` (TA agent chia task) — tạo task "đề xuất", lead duyệt như feature đề xuất | M | F21.1 | Chưa làm |
| F24.3 | Tool `docs_create` — đề xuất tài liệu mới, lead duyệt mới xuất hiện | S | — | Chưa làm |
| F24.4 | Template tài liệu (PRD, Tech spec, ADR, Runbook) khi tạo tài liệu — UI + MCP | S | — | Chưa làm |
| F24.5 | `docs/guides/agent-workflow.md` + CLAUDE.md mẫu cho repo dùng Meridian: claim → context → làm → báo PR → Review → báo token (thành skill dùng chung ở F27.8) | S | F22.4 | Xong — 2026-10-31 (bước báo token thêm khi F23.2 xong) |
| F24.6 | Gắn tài liệu ↔ task (task trỏ tới tài liệu spec; `context_get` trả kèm) | S | — | Chưa làm |
| F24.7 | Thử quy ước F24.5 trên một repo thật: agent dùng CLAUDE.md mẫu tự claim, làm, báo PR, đẩy Review không cần nhắc — sửa mẫu theo kết quả | S | F24.5 | Chưa làm — **cần Lio** chọn repo thử + tạo token agent trên production |

### F24.1 — `context_get`
**Hoàn thành khi**:
- [x] Agent gọi một lệnh nhận đủ thông tin để bắt đầu task (integration qua MCP client SDK); `docs.read` của tài liệu kèm theo được ghi để drawer hiện context (F17.4) — `app/api/mcp/client.integration.test.ts`

### F24.5 — Quy ước làm việc cho agent
**Hoàn thành khi**:
- [x] Có guide + CLAUDE.md mẫu; các lệnh MCP trong mẫu chạy đúng thứ tự qua client SDK (bước đẩy Review kèm PR: `app/api/mcp/client.integration.test.ts`)

### F24.7 — Thử trên repo thật
**Hoàn thành khi**:
- [ ] Một repo thử nghiệm dùng CLAUDE.md mẫu: agent tự claim, làm, báo PR, đẩy Review không cần nhắc; drawer task đạt checklist mục 4 của `agent-workflow.md`

## Quyết định / ghi chú
- **F24.5 (2026-10-31)**: tách phần "thử trên repo thật" ra F24.7 (cần repo + token production — việc của Lio). Mẫu ở `docs/templates/CLAUDE.meridian.md` (chép tay vào repo; F27.8 thay bằng skill phân phối qua Meridian). Quy ước: một task = một branch = một PR; đẩy Review bằng **một** lệnh `tasks_update_status` kèm `prUrl` + `branch`; vướng thì `Chờ` + bình luận thay vì đoán; bị trả lại thì đọc `lastReturn` trước. Bước báo token để trống tới khi có `usage_report` (F23.2).
- **F24.1 (2026-10-31)**: làm trước F21.6 (không chờ acceptance criteria — thêm vào `context_get` khi F21.6 xong). `lib/domain/taskContext.ts`: task (kèm `lastReturn`), feature, tối đa 5 tài liệu của feature **đầy đủ nội dung** (mới sửa trước, còn lại liệt kê ở `moreDocs`), 30 bình luận gần nhất, toàn bộ lịch sử trạng thái. Tài liệu chỉ kèm khi agent có `meridian-docs` (governance F16.7). Mỗi tài liệu gửi kèm ghi một dòng nhật ký `docs.read` (không gắn token — không tính rate limit) → drawer "Context agent đã pull" (F17.4; cửa sổ ghép phiên nới 60 giây vì phiên bắt đầu ngay sau các dòng này).
