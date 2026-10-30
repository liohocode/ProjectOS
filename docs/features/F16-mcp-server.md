# F16 — MCP server cho agent (lõi sản phẩm)

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Đang làm | 4 | F09, F12.1, F13.5, F15.5 (một số task chạy trước được, xem cột phụ thuộc) | FR-AG-01…08 |

## Mục tiêu
Đây là thứ biến Meridian từ "bảng theo dõi" thành **nơi agent làm việc thật**: Meridian tự chạy MCP server; agent (Claude Code, v.v.) kết nối bằng token, đọc task/tài liệu, claim task, cập nhật trạng thái, đề xuất thay đổi tài liệu (thành revision chờ người duyệt). Mọi lệnh và mọi phiên được ghi vào `McpLogEntry` / `McpSession` — dữ liệu mà màn MCP đang hiển thị từ seed.

## Phạm vi
- **Trong**: endpoint MCP trong app Next.js, các tool theo "MCP tool spec", ghi phiên/nhật ký, luật governance (giới hạn claim, quyền ghi docs, rate limit), trạng thái server thật, hướng dẫn kết nối.
- **Ngoài**: tìm kiếm ngữ nghĩa (F18 — `docs_search` bản đầu dùng tìm theo từ khoá), đẩy realtime lên UI (F17).

## Tham chiếu
- `docs/product/requirements.md` → FR-AG-01…08 (nguồn: tài liệu seed "MCP tool spec", id `mcp-spec`)
- `docs/product/overview.md` → "Governance tài liệu", "MCP"
- Model: `McpServer`, `McpSession`, `McpLogEntry`, `Task`, `DocRevision` (`prisma/schema.prisma`)
- Code tái dùng: `createRevision` (F12.1), `assignTask`/`updateTaskStatus` logic (F11.2) — tách logic nghiệp vụ ra hàm dùng chung, không gọi server action từ route MCP

## Lưu ý kỹ thuật quan trọng
- **Tên tool**: nhiều client MCP (gồm Claude) chỉ chấp nhận tên tool khớp `^[a-zA-Z0-9_-]{1,64}$` — **không dùng dấu chấm**. Tên thật của tool: `tasks_list`, `tasks_claim`, `tasks_update_status`, `tasks_comment`, `docs_read`, `docs_search`, `docs_append`, `features_propose`. UI/nhật ký vẫn hiển thị dạng `tasks.claim` như spec (map ở biên).
- Route MCP **không** đi qua session người dùng (F15.3 loại trừ `/api/mcp`), xác thực bằng `Authorization: Bearer <agent token>`.
- Logic nghiệp vụ dùng chung giữa server action (UI) và MCP tool đặt ở `lib/domain/<domain>.ts` (thuần, nhận `actorId`), server action và MCP tool chỉ là lớp vỏ.
- **Production chạy trên Google Cloud Run (ADR-016)**: Cloud Run tính tiền suốt thời gian request còn mở, có thể chạy nhiều instance và scale về 0 → dùng Streamable HTTP chế độ **stateless**, trả JSON, **không** mở stream SSE dài (GET stream); không giữ trạng thái phiên MCP hay bộ đếm rate limit trong RAM — lưu trong Postgres.

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F16.1 | Spike + khung endpoint MCP, xác thực token, tool `tasks_list` | M | — (F15.5 nếu có) | Xong — 2026-10-30 |
| F16.2 | Lớp bọc tool call: ghi `McpLogEntry`, vòng đời `McpSession` | M | F16.1, F09.4 | Chưa làm |
| F16.3 | `tasks_claim` với giới hạn task đồng thời | M | F16.2, F09.2 | Chưa làm |
| F16.4 | `tasks_update_status`, `tasks_comment` (+ model `TaskComment`, hiện trong drawer) | M | F16.3 | Chưa làm |
| F16.5 | `docs_read`, `docs_search` (từ khoá), `docs_append` → revision chờ duyệt | M | F16.2, F12.1 | Chưa làm |
| F16.6 | `features_propose` (chỉ BA agent) + UI duyệt feature đề xuất | M | F16.2 | Chưa làm |
| F16.7 | Quyền theo cấu hình agent + rate limit 60 lệnh/phút | S | F16.2, F13.5 | Chưa làm |
| F16.8 | Trạng thái server thật cho `meridian-core` / `meridian-docs` | S | F16.2 | Chưa làm |
| F16.9 | Hướng dẫn kết nối agent + test tích hợp gọi tool | S | F16.3, F16.5 | Chưa làm |

### F16.1 — Spike + khung endpoint
**Làm gì**: đánh giá `@modelcontextprotocol/sdk` (transport Streamable HTTP) chạy trong Route Handler Next 16 (`app/api/mcp/route.ts`) — chạy được cả `npm run dev` lẫn trong container production (F19.2), chế độ stateless; hoặc adapter có sẵn cho Next; chọn và ghi ADR. Xác thực Bearer token: dùng `verifyAgentToken` (F15.5); nếu F15 chưa xong, tạm map token qua biến môi trường `MCP_DEV_TOKENS="token1:agent-atlas,token2:agent-vega"` (chỉ dev, ghi rõ trong `.env.example`). Tool đầu tiên `tasks_list(projectId?, stage?, assigneeId?)` chỉ đọc.
**Hoàn thành khi**:
- [x] `claude mcp add --transport http meridian http://localhost:3000/api/mcp --header "Authorization: Bearer <token>"` kết nối được, gọi `tasks_list` trả đúng dữ liệu — *thử bằng MCP client của SDK (`StreamableHTTPClientTransport`) vào bản build production: initialize, `tools/list`, `tasks_list` đúng; Claude Code CLI không có trong container — người dùng thử lại bằng lệnh trên*
- [x] Không có token / token sai → 401 (`app/api/mcp/route.integration.test.ts`)

### F16.2 — Ghi phiên và nhật ký
**Làm gì**: hàm bọc mọi tool handler: ghi `McpLogEntry` (agent, tool hiển thị dạng `tasks.claim`, target, result `OK`/`Chờ review`/`Bị chặn`, thời điểm); quản lý `McpSession` theo MCP session id (tạo khi khởi tạo phiên, `toolCalls++`, `endedAt` khi đóng hoặc hết hạn, `projectId`/`taskId` theo task đang thao tác). Token đã dùng: ghi nếu client gửi kèm, không thì để 0.
**Hoàn thành khi**:
- [ ] Gọi tool từ Claude Code → màn MCP thấy phiên mới và dòng nhật ký mới (sau reload)

### F16.3 — `tasks_claim`
**Làm gì**: agent claim task → task gán cho agent, `runningSince = now`, trạng thái "Đang chạy". Từ chối (`Bị chặn`) nếu agent đã có ≥ `maxConcurrentTasks` task đang chạy (mặc định 2 — FR-AG-05), nếu task đang bị block, hoặc task đã Done.
**Hoàn thành khi**:
- [ ] Test: claim task thứ 3 khi đang chạy 2 → bị chặn và có log `Bị chặn`

### F16.4 — `tasks_update_status`, `tasks_comment`
**Làm gì**: cập nhật trạng thái/stage (agent không được tự chuyển sang `Done` — chỉ tới `Review`, người duyệt mới Done). Model `TaskComment(id, taskId, authorId, body, createdAt)`; hiển thị bình luận trong task drawer (mục mới "Bình luận").
**Hoàn thành khi**:
- [ ] Agent comment → thấy trong drawer; agent set `Done` → bị chặn

### F16.5 — Tool tài liệu
**Làm gì**: `docs_read(docId)` trả nội dung + ghi agent vào danh sách đã đọc (F18.6 sẽ chuyển sang tính từ log). `docs_search(projectId, query)` — tìm theo từ khoá trong tiêu đề/tóm tắt/section (F18.5 nâng cấp ngữ nghĩa). `docs_append(docId, what, proposedSections)` → gọi `createRevision` (F12.1), kết quả log `Chờ review`; **không bao giờ** sửa trực tiếp `Doc`.
**Hoàn thành khi**:
- [ ] Agent append → màn docs thấy revision chờ duyệt, người duyệt được (F12.2)

### F16.6 — `features_propose`
**Làm gì**: thêm `Feature.status` enum (`proposed`, `active`, `rejected`). Chỉ agent có `canProposeFeatures` (BA agent) gọi được. Feature đề xuất hiện ở màn work trong khu "Feature đề xuất — chờ duyệt" với nút Duyệt/Từ chối cho lead; list chính và timeline chỉ hiện `active`.
**Hoàn thành khi**:
- [ ] Vega (TA) gọi → bị chặn; Bảo (BA) gọi → lead thấy và duyệt được

### F16.7 — Quyền + rate limit
**Làm gì**: kiểm tra trước mỗi tool: agent có quyền với dự án (thuộc `ProjectMember`), quyền ghi docs (`read_only` → chặn `docs_append`), server được cấu hình cho agent (`AgentConfig.mcpServers`). Rate limit 60 lệnh/phút/token — **không** đếm trong bộ nhớ (Cloud Run có thể nhiều instance / scale về 0, ADR-016): đếm số `McpLogEntry` của token trong 60 giây gần nhất (đã có index `at desc`). Vượt → `Bị chặn` + log.
**Hoàn thành khi**:
- [ ] Scout (`read_only`) gọi `docs_append` → bị chặn; bắn 61 lệnh/phút → lệnh 61 bị chặn

### F16.8 — Trạng thái server thật
**Làm gì**: `meridian-core` (tool task/feature) và `meridian-docs` (tool docs) là 2 "server" logic cùng endpoint (hoặc 2 path `/api/mcp/core`, `/api/mcp/docs` — chọn ở F16.1). `lastCommandAt`, `commandsPerDay`, `clients` tính từ `McpLogEntry`/`McpSession` thay vì cột tĩnh; `status` = `online` khi endpoint chạy.
**Hoàn thành khi**:
- [ ] Card server ở màn MCP phản ánh số liệu thật sau khi gọi tool

### F16.9 — Hướng dẫn + test
**Làm gì**: `docs/guides/connect-agent.md`: tạo token, lệnh `claude mcp add`, danh sách tool + tham số + luật governance. Integration test dùng MCP client của SDK gọi các tool chính trên DB test.
**Hoàn thành khi**:
- [ ] Người mới làm theo hướng dẫn kết nối được trong < 5 phút

## Quyết định / ghi chú
- **F16.1 (2026-10-30)** — ADR-022. `app/api/mcp/route.ts` (POST; GET/DELETE → 405), `lib/mcp/server.ts` (`createMeridianMcpServer(agent)`), `lib/domain/tasks.ts` (`listTasksForMember`). Không cần `MCP_DEV_TOKENS` vì F15.5 đã xong: token tạo ở panel agent (màn team, tech lead). `tasks_list(projectId?, stage?, assigneeId?)` — chỉ task trong dự án agent thuộc về, tối đa 200; `assigneeId: "me"` = chính agent. Kết quả trả JSON trong content text.
