# F16 — MCP server cho agent (lõi sản phẩm)

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Xong | 4 | F09, F12.1, F13.5, F15.5 (một số task chạy trước được, xem cột phụ thuộc) | FR-AG-01…08 |

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
| F16.2 | Lớp bọc tool call: ghi `McpLogEntry`, vòng đời `McpSession` | M | F16.1, F09.4 | Xong — 2026-10-30 |
| F16.3 | `tasks_claim` với giới hạn task đồng thời | M | F16.2, F09.2 | Xong — 2026-10-30 |
| F16.4 | `tasks_update_status`, `tasks_comment` (+ model `TaskComment`, hiện trong drawer) | M | F16.3 | Xong — 2026-10-30 |
| F16.5 | `docs_read`, `docs_search` (từ khoá), `docs_append` → revision chờ duyệt | M | F16.2, F12.1 | Xong — 2026-10-30 |
| F16.6 | `features_propose` (chỉ BA agent) + UI duyệt feature đề xuất | M | F16.2 | Xong — 2026-10-30 |
| F16.7 | Quyền theo cấu hình agent + rate limit 60 lệnh/phút | S | F16.2, F13.5 | Xong — 2026-10-30 |
| F16.8 | Trạng thái server thật cho `meridian-core` / `meridian-docs` | S | F16.2 | Xong — 2026-10-30 |
| F16.9 | Hướng dẫn kết nối agent + test tích hợp gọi tool | S | F16.3, F16.5 | Xong — 2026-10-30 |

### F16.1 — Spike + khung endpoint
**Làm gì**: đánh giá `@modelcontextprotocol/sdk` (transport Streamable HTTP) chạy trong Route Handler Next 16 (`app/api/mcp/route.ts`) — chạy được cả `npm run dev` lẫn trong container production (F19.2), chế độ stateless; hoặc adapter có sẵn cho Next; chọn và ghi ADR. Xác thực Bearer token: dùng `verifyAgentToken` (F15.5); nếu F15 chưa xong, tạm map token qua biến môi trường `MCP_DEV_TOKENS="token1:agent-atlas,token2:agent-vega"` (chỉ dev, ghi rõ trong `.env.example`). Tool đầu tiên `tasks_list(projectId?, stage?, assigneeId?)` chỉ đọc.
**Hoàn thành khi**:
- [x] `claude mcp add --transport http meridian http://localhost:3000/api/mcp --header "Authorization: Bearer <token>"` kết nối được, gọi `tasks_list` trả đúng dữ liệu — *thử bằng MCP client của SDK (`StreamableHTTPClientTransport`) vào bản build production: initialize, `tools/list`, `tasks_list` đúng; Claude Code CLI không có trong container — người dùng thử lại bằng lệnh trên*
- [x] Không có token / token sai → 401 (`app/api/mcp/route.integration.test.ts`)

### F16.2 — Ghi phiên và nhật ký
**Làm gì**: hàm bọc mọi tool handler: ghi `McpLogEntry` (agent, tool hiển thị dạng `tasks.claim`, target, result `OK`/`Chờ review`/`Bị chặn`, thời điểm); quản lý `McpSession` theo MCP session id (tạo khi khởi tạo phiên, `toolCalls++`, `endedAt` khi đóng hoặc hết hạn, `projectId`/`taskId` theo task đang thao tác). Token đã dùng: ghi nếu client gửi kèm, không thì để 0.
**Hoàn thành khi**:
- [x] Gọi tool từ Claude Code → màn MCP thấy phiên mới và dòng nhật ký mới (sau reload) — *thử bằng MCP client SDK vào bản build production; integration `lib/mcp/audit.integration.test.ts`, `app/api/mcp/route.integration.test.ts`*

### F16.3 — `tasks_claim`
**Làm gì**: agent claim task → task gán cho agent, `runningSince = now`, trạng thái "Đang chạy". Từ chối (`Bị chặn`) nếu agent đã có ≥ `maxConcurrentTasks` task đang chạy (mặc định 2 — FR-AG-05), nếu task đang bị block, hoặc task đã Done.
**Hoàn thành khi**:
- [x] Test: claim task thứ 3 khi đang chạy 2 → bị chặn và có log `Bị chặn` (`lib/domain/tasks.integration.test.ts`, `app/api/mcp/route.integration.test.ts`)

### F16.4 — `tasks_update_status`, `tasks_comment`
**Làm gì**: cập nhật trạng thái/stage (agent không được tự chuyển sang `Done` — chỉ tới `Review`, người duyệt mới Done). Model `TaskComment(id, taskId, authorId, body, createdAt)`; hiển thị bình luận trong task drawer (mục mới "Bình luận").
**Hoàn thành khi**:
- [x] Agent comment → thấy trong drawer; agent set `Done` → bị chặn (integration domain + route, e2e `task-comments.spec.ts`)

### F16.5 — Tool tài liệu
**Làm gì**: `docs_read(docId)` trả nội dung + ghi agent vào danh sách đã đọc (F18.6 sẽ chuyển sang tính từ log). `docs_search(projectId, query)` — tìm theo từ khoá trong tiêu đề/tóm tắt/section (F18.5 nâng cấp ngữ nghĩa). `docs_append(docId, what, proposedSections)` → gọi `createRevision` (F12.1), kết quả log `Chờ review`; **không bao giờ** sửa trực tiếp `Doc`.
**Hoàn thành khi**:
- [x] Agent append → màn docs thấy revision chờ duyệt, người duyệt được (F12.2) (`lib/domain/agentDocs.integration.test.ts`)

### F16.6 — `features_propose`
**Làm gì**: thêm `Feature.status` enum (`proposed`, `active`, `rejected`). Chỉ agent có `canProposeFeatures` (BA agent) gọi được. Feature đề xuất hiện ở màn work trong khu "Feature đề xuất — chờ duyệt" với nút Duyệt/Từ chối cho lead; list chính và timeline chỉ hiện `active`.
**Hoàn thành khi**:
- [x] Vega (TA) gọi → bị chặn; Bảo (BA) gọi → lead thấy và duyệt được (`lib/domain/features.integration.test.ts`, governance test, e2e `feature-proposals.spec.ts`)

### F16.7 — Quyền + rate limit
**Làm gì**: kiểm tra trước mỗi tool: agent có quyền với dự án (thuộc `ProjectMember`), quyền ghi docs (`read_only` → chặn `docs_append`), server được cấu hình cho agent (`AgentConfig.mcpServers`). Rate limit 60 lệnh/phút/token — **không** đếm trong bộ nhớ (Cloud Run có thể nhiều instance / scale về 0, ADR-016): đếm số `McpLogEntry` của token trong 60 giây gần nhất (đã có index `at desc`). Vượt → `Bị chặn` + log.
**Hoàn thành khi**:
- [x] Scout (`read_only`) gọi `docs_append` → bị chặn; bắn 61 lệnh/phút → lệnh 61 bị chặn (`app/api/mcp/governance.integration.test.ts`)

### F16.8 — Trạng thái server thật
**Làm gì**: `meridian-core` (tool task/feature) và `meridian-docs` (tool docs) là 2 "server" logic cùng endpoint (hoặc 2 path `/api/mcp/core`, `/api/mcp/docs` — chọn ở F16.1). `lastCommandAt`, `commandsPerDay`, `clients` tính từ `McpLogEntry`/`McpSession` thay vì cột tĩnh; `status` = `online` khi endpoint chạy.
**Hoàn thành khi**:
- [x] Card server ở màn MCP phản ánh số liệu thật sau khi gọi tool (`lib/mcp/audit.integration.test.ts`)

### F16.9 — Hướng dẫn + test
**Làm gì**: `docs/guides/connect-agent.md`: tạo token, lệnh `claude mcp add`, danh sách tool + tham số + luật governance. Integration test dùng MCP client của SDK gọi các tool chính trên DB test.
**Hoàn thành khi**:
- [x] Người mới làm theo hướng dẫn kết nối được trong < 5 phút — *hướng dẫn `docs/guides/connect-agent.md` (3 bước); test luồng đầy đủ bằng MCP client SDK `app/api/mcp/client.integration.test.ts`. Cần Lio thử thật bằng Claude Code trên production để xác nhận thời gian.*

## Quyết định / ghi chú
- **F16.6 (2026-10-30)**: migration chỉ thêm `FeatureStatus` (`proposed`/`active`/`rejected`, mặc định `active` → dữ liệu cũ không đổi) + `proposedById`, `proposal`, `proposedAt`, `rejectedReason`. `proposeFeature` (`lib/domain/features.ts`): mã `FEAT-<max+1>` toàn hệ thống (trùng khi đề xuất đồng thời → thử lại), stage BA, chưa giao ai. Chặn theo `canProposeFeatures` ở governance (F16.7). List chính, timeline, cây tài liệu, tìm kiếm và "Task mới" chỉ dùng feature `active`. Quyền duyệt: thêm `feature.review` vào ma trận (tech lead / người tạo dự án — giống duyệt revision; ADR-021). UI: khu "Feature đề xuất — chờ duyệt" trên list ở màn work (`ProposedFeatures`), ai cũng xem, người có quyền thấy Duyệt / Từ chối (bắt buộc lý do). Duyệt / từ chối ghi có điều kiện `status = proposed` (hai người cùng duyệt: người sau nhận lỗi).
- **F16.8 (2026-10-30)**: hai server logic cùng một endpoint `/api/mcp` (đã chọn ở F16.1). `getMcpServers` tính cho `meridian-core` / `meridian-docs` từ `McpLogEntry` (một query gom nhóm): lệnh 24h, **số agent khác nhau đã gọi trong 24h** (= "client"), lệnh cuối; `status` luôn `online` (endpoint chạy cùng app); danh sách tool lấy từ code (`lib/mcp/tools.ts` — `TOOL_SERVER` chuyển sang đây, dùng chung với governance). Bỏ ghi `mcp_servers.lastCommandAt` ở mỗi lệnh. Server ngoài giữ số liệu lưu. **Hệ quả với dữ liệu mẫu**: thẻ server nội bộ không còn số giả (1284 lệnh/ngày…) mà là số thật từ nhật ký.
- **F16.9 (2026-10-30)**: `docs/guides/connect-agent.md` (tạo token → `claude mcp add` → bảng tool → luật governance → gỡ lỗi). Integration test dùng `Client` + `StreamableHTTPClientTransport` của SDK, `fetch` nối thẳng vào route handler (không cần server chạy): liệt kê 7 tool + luồng list → claim → comment → Review → search → read → append, kiểm tra nhật ký đúng thứ tự.
- **F16.7 (2026-10-30)**: `lib/mcp/governance.ts`, kiểm tra trong `logged()` trước mọi handler (rate limit trước, rồi cấu hình agent — đọc `AgentConfig` tối đa một lần mỗi request). Tool → server: `tasks_*`, `features_propose` → `meridian-core`; `docs_*` → `meridian-docs` — agent phải có server đó trong `AgentConfig.mcpServers` (dữ liệu mẫu: Vega không có `meridian-docs`, Scout không có `meridian-core` → bị chặn tương ứng; sửa ở panel agent). `docs_append` chặn khi "Chỉ đọc"; `features_propose` cần `canProposeFeatures` (F16.6 dùng). Rate limit 60 lệnh/phút/**token**: migration chỉ thêm `McpLogEntry.tokenId` (+ index `tokenId, at`), đếm cả lệnh bị chặn trong 60 giây gần nhất (spam liên tục vẫn bị chặn). Bị chặn → kết quả `isError` + `{ denied, reason }`, nhật ký "Bị chặn" target "rate limit" / "không đủ quyền". Tool vẫn hiện trong `tools/list` dù agent không được gọi (để lệnh bị chặn có nhật ký, đúng yêu cầu task). Phân biệt `append_review` / `append_edit_spec` chưa có tác dụng — cả hai đều chỉ tạo revision chờ duyệt.
- **F16.5 (2026-10-30)**: `lib/domain/agentDocs.ts`. `docs_read` thêm tên agent vào `Doc.readBy` (bỏ "—" của dữ liệu mẫu; giữ "Tất cả agent"). `docs_search(query, projectId?)` — ILIKE + `unaccent` trên tiêu đề / tóm tắt / `sections::text`, chỉ dự án agent thuộc, tiêu đề khớp xếp trước, tối đa 10; `projectId` tuỳ chọn (spec ghi bắt buộc — agent thường chưa biết id). `docs_append(docId, what, summary?, content?)`: `content` là **markdown** (cùng định dạng form sửa tài liệu, `markdownToSections`) thay vì mảng `proposedSections` — dễ cho agent; luôn `createRevision` (F12.1), nhật ký "Chờ review". Quyền ghi docs theo `AgentConfig.docsWritePermission` là F16.7.
- **F16.4 (2026-10-30)**: migration chỉ thêm `task_comments`. `updateTaskByAgent` / `commentOnTask` (`lib/domain/tasks.ts`). Agent **chỉ sửa task đang giao cho mình** (phải `tasks_claim` trước) — thêm ngoài spec để agent không sửa việc của người khác; bình luận thì được trên mọi task trong dự án của mình. Stage cho phép BA/TA/Dev/Review, trạng thái "Đang làm"/"Chờ"/"Chờ review"; Done / "Xong" bị chặn (enum của tool không có Done, domain chặn lần nữa); "Đang chạy" phải qua `tasks_claim`. Đổi trạng thái = rời "Đang chạy" → xoá `runningSince` (nhả task khỏi giới hạn F16.3). Nhật ký: chuyển sang Review / "Chờ review" ghi kết quả "Chờ review". Drawer: mục "Bình luận" (cũ trước) trên "Log phiên chạy"; bình luận của cả dự án tải một query (`getTaskCommentsByProject`). Người chưa bình luận được từ UI (ngoài phạm vi — thêm sau nếu cần).
- **F16.3 (2026-10-30)**: `claimTask` (`lib/domain/tasks.ts`) trong transaction, khoá dòng `members` của agent (`SELECT … FOR UPDATE`) để hai lệnh claim đồng thời không cùng vượt giới hạn. Giới hạn = `AgentConfig.maxConcurrentTasks` (mặc định 2); "đang chạy" = task giao cho agent có `runningSince`. Thêm chặn ngoài spec: task đang được người/agent khác chạy; task không thuộc dự án của agent (báo như không tồn tại). Claim lại task mình đang chạy → OK, không đổi. Claim thành công ghi `Member.current` + hoạt động "Claim T-xxx qua MCP" và revalidate layout. Bị chặn → kết quả tool `isError: true` kèm `reason`, nhật ký "Bị chặn". Chưa có "nhả task" — `tasks_update_status` (F16.4) sẽ xoá `runningSince` khi chuyển khỏi "Đang chạy".
- **F16.2 (2026-10-30)**: endpoint stateless (ADR-022) nên **không có MCP session id** → "phiên" = (agent, dự án), còn mở khi lệnh cuối cách đây < 30 phút (`SESSION_IDLE_MS`); phiên quá hạn đóng **lười** ở lệnh kế tiếp của agent (`endedAt` = lệnh cuối, "Đang chạy" → "Xong") — không cần job nền. Migration chỉ thêm `McpSession.lastCallAt` (null = dữ liệu mẫu, không bị đóng tự động). `lib/mcp/audit.ts` `recordToolCall` (một transaction: dòng `McpLogEntry` tên dạng `tasks.list`, `meridian-core.lastCommandAt`, phiên). `logged()` trong `lib/mcp/server.ts` bọc mọi handler; lỗi bất ngờ ghi "Bị chặn". Dự án của phiên: tham số `projectId` nếu agent thuộc dự án đó, không truyền mà agent chỉ thuộc một dự án → dự án đó, ngược lại chỉ ghi nhật ký. `tokensUsed` để 0 (client chưa gửi). Thời lượng phiên mở vẫn tính tới hiện tại cho tới khi được đóng lười — chấp nhận.
- **F16.1 (2026-10-30)** — ADR-022. `app/api/mcp/route.ts` (POST; GET/DELETE → 405), `lib/mcp/server.ts` (`createMeridianMcpServer(agent)`), `lib/domain/tasks.ts` (`listTasksForMember`). Không cần `MCP_DEV_TOKENS` vì F15.5 đã xong: token tạo ở panel agent (màn team, tech lead). `tasks_list(projectId?, stage?, assigneeId?)` — chỉ task trong dự án agent thuộc về, tối đa 200; `assigneeId: "me"` = chính agent. Kết quả trả JSON trong content text.
