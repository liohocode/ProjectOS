# F24 — Hỗ trợ coding agent & tài liệu kỹ thuật

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Chưa bắt đầu | 8 | F16, F21.6 | FR-AG-10…14 |

## Mục tiêu
Agent lấy đủ ngữ cảnh trong **một lệnh**, tự chia task / đề xuất tài liệu mới theo đúng governance, và có quy ước làm việc chuẩn để mọi repo của công ty dùng Meridian giống nhau.

## Phạm vi
- **Trong**: tool MCP mới, template tài liệu (PRD, tech spec, ADR, runbook), CLAUDE.md mẫu cho repo dùng Meridian.
- **Ngoài**: tìm kiếm ngữ nghĩa (F18 — hoãn), OAuth cho MCP (backlog).

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F24.1 | Tool `context_get(taskId)`: task + feature + acceptance criteria + tài liệu liên quan + bình luận + lý do trả lại | M | F21.6 | Chưa làm |
| F24.2 | Tool `tasks_create` (TA agent chia task) — tạo task "đề xuất", lead duyệt như feature đề xuất | M | F21.1 | Chưa làm |
| F24.3 | Tool `docs_create` — đề xuất tài liệu mới, lead duyệt mới xuất hiện | S | — | Chưa làm |
| F24.4 | Template tài liệu (PRD, Tech spec, ADR, Runbook) khi tạo tài liệu — UI + MCP | S | — | Chưa làm |
| F24.5 | `docs/guides/agent-workflow.md` + CLAUDE.md mẫu cho repo dùng Meridian: claim → context → làm → báo PR → Review → báo token | S | F22.4 | Chưa làm |
| F24.6 | Gắn tài liệu ↔ task (task trỏ tới tài liệu spec; `context_get` trả kèm) | S | — | Chưa làm |

### F24.1 — `context_get`
**Hoàn thành khi**:
- [ ] Agent gọi một lệnh nhận đủ thông tin để bắt đầu task (integration qua MCP client SDK); `docs.read` của tài liệu kèm theo được ghi để drawer hiện context (F17.4)

### F24.5 — Quy ước làm việc cho agent
**Hoàn thành khi**:
- [ ] Một repo thử nghiệm dùng CLAUDE.md mẫu: agent tự claim, làm, báo PR, đẩy Review không cần nhắc

## Quyết định / ghi chú
