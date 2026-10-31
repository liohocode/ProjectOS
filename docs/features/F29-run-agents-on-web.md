# F29 — Gắn API key và chạy agent trực tiếp từ web

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Chưa bắt đầu — chờ quyết định F29.1 | 8b | F28, F22.4, F24.5 | FR-RUN-01…05 |

## Mục tiêu
Từ một feature / task trên Meridian, bấm **"Chạy với agent"**: agent dùng API key đã gắn cho dự án / feature, làm task theo quy ước F24.5 (claim → làm → PR → Review), người theo dõi log, chi phí và duyệt kết quả ngay trên web.

## Phạm vi
- **Trong**: lưu API key an toàn (mã hoá, không bao giờ hiện lại), gắn key cho dự án (mặc định) hoặc feature (ghi đè), lượt chạy (`AgentRun`) có trạng thái / log / PR / token, huỷ lượt chạy, giới hạn chi phí.
- **Ngoài**: agent chạy dài trong request web (Cloud Run không giữ request lâu — ADR-016): việc chạy thật nằm ở runtime riêng, web chỉ khởi động + polling.

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F29.1 | **Quyết định**: runtime chạy agent (khuyến nghị: GitHub Actions + Claude Code trên repo của dự án) và cách lưu API key (khuyến nghị: mã hoá AES-256-GCM trong DB, khoá chủ trong Secret Manager) | S | — | Chờ Lio |
| F29.2 | Model `ApiCredential` (provider, key mã hoá, 4 ký tự cuối, phạm vi dự án / feature, người tạo, thu hồi) + UI thêm / thu hồi (tech lead) + ADR | M | F29.1 | Chưa làm |
| F29.3 | Model `AgentRun` (task, agent, credential, trạng thái queued / running / succeeded / failed / cancelled, PR, token, chi phí, log) + nút "Chạy với agent" trên task / feature | M | F29.2 | Chưa làm |
| F29.4 | Runner theo quyết định F29.1: khởi động lượt chạy, truyền key + token MCP tạm thời, nhận kết quả (PR, trạng thái) — agent báo tiến độ qua MCP | L → tách khi làm | F29.3 | Chưa làm |
| F29.5 | Theo dõi trên web: log lượt chạy trong drawer (polling ngắn), huỷ lượt chạy, token / chi phí thật từ API (bổ sung F23) | M | F29.4 | Chưa làm |
| F29.6 | Giới hạn: tối đa lượt chạy đồng thời / dự án, ngân sách chi phí / tháng, chặn khi vượt | S | F29.5 | Chưa làm |

## Quyết định / ghi chú
- **2026-10-31** (Lio): feature có thể gắn thêm API key và chạy trực tiếp trên web. Lưu key và chọn runtime là quyết định kiến trúc + bảo mật → F29.1 chờ Lio chốt (đề xuất trong ROADMAP "Quyết định đang mở").
- Token / chi phí từ lượt chạy trên web lấy trực tiếp từ API (chính xác hơn agent tự báo — F23.1 vẫn dùng cho agent chạy ngoài web).
