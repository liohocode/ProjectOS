# F23 — Effort & AI token

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Chưa bắt đầu | 8 | F16, F22.1 | FR-TK-01…04 |

## Mục tiêu
Biết **mỗi task / feature / dự án tốn bao nhiêu token AI (và tiền)** so với giá trị nó tạo ra; đặt ngân sách để agent không đốt token vô hạn. Hiện `McpSession.tokensUsed` luôn 0.

## Phạm vi
- **Trong**: ghi nhận token theo task / phiên / agent, tổng hợp, ngân sách + cảnh báo, so sánh ước lượng vs thực tế.
- **Ngoài**: lấy hoá đơn trực tiếp từ nhà cung cấp AI (cần quyết định F23.1).

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F23.1 | **Quyết định** nguồn số token: agent tự báo qua MCP (khuyến nghị) / đọc từ API nhà cung cấp | S | — | Xong — 2026-10-30 (agent tự báo qua MCP) |
| F23.2 | Model `TokenUsage` + MCP tool `usage_report` (model, input/output tokens, chi phí ước tính, task) | M | F23.1 | Chưa làm |
| F23.3 | Tổng hợp + hiển thị: drawer task, panel agent, portfolio, phiên MCP (`tokensUsed` thật) | M | F23.2 | Chưa làm |
| F23.4 | Ngân sách token theo dự án / agent / tháng + cảnh báo trong app; tuỳ chọn chặn MCP khi vượt | M | F23.3 | Chưa làm |
| F23.5 | Effort: ước lượng (story point) vs thực tế (thời gian chạy + token) theo feature / sprint | S | F22.1, F23.3 | Chưa làm |

### F23.2 — Ghi token
**Làm gì**: `TokenUsage(id, agentId, tokenId, taskId?, projectId, model, inputTokens, outputTokens, costUsd?, at)`; tool `usage_report` (agent gọi cuối mỗi bước / phiên). Bảng giá model cấu hình (`lib/tokenPricing.ts`) để ước tính chi phí. Hướng dẫn trong `connect-agent.md` + CLAUDE.md mẫu (F24.5) cách agent báo.
**Hoàn thành khi**:
- [ ] Agent báo token → phiên MCP + drawer task hiện số token (integration qua MCP client SDK)

### F23.4 — Ngân sách
**Làm gì**: `TokenBudget(projectId | agentId, month, limit)`; badge cảnh báo ở portfolio / panel agent khi > 80% / 100%; cấu hình "chặn khi vượt" → governance F16.7 trả "Bị chặn".
**Hoàn thành khi**:
- [ ] Vượt ngân sách → cảnh báo hiện; bật chặn → lệnh MCP bị chặn kèm lý do

## Quyết định / ghi chú
- **F23.1 (2026-10-30)** — người dùng chốt: agent tự báo token qua MCP (`usage_report`); không đọc hoá đơn nhà cung cấp.
