# Yêu cầu sản phẩm

Tổng hợp từ spec UI (`docs/design/design-reference.md`), nội dung tài liệu mẫu "MCP tool spec" trong dữ liệu seed, và các quyết định đã chốt trong quá trình phát triển. Mỗi yêu cầu có mã cố định — khi viết task/commit, tham chiếu theo mã này.

**Trạng thái**: ✅ đã đáp ứng · 🟡 đáp ứng một phần · ⬜ chưa làm. Cột **Feature** trỏ tới file trong `docs/features/` chịu trách nhiệm.

## 1. Yêu cầu chức năng

### App shell (khung chung)
| Mã | Yêu cầu | TT | Feature |
|---|---|---|---|
| FR-SH-01 | Sidebar cố định 228px: brand, project switcher (dropdown liệt kê dự án + "Xem tất cả dự án"), nav 5 màn | ✅ | F01 |
| FR-SH-02 | Badge đếm trên nav; đổi màu amber khi có task block / revision chờ duyệt | ✅ | F01 |
| FR-SH-03 | Khối pipeline agent BA/TA/Dev/Index ở sidebar | ✅ | F01 |
| FR-SH-04 | Footer: trạng thái MCP (n/m server online) + người dùng hiện tại | ✅ người đăng nhập thật + menu đăng xuất (F15.6) | F01 → F15 |
| FR-SH-05 | Header mọi màn: kicker, tiêu đề, dòng context (dự án · sprint), ô tìm kiếm, nút "Lọc", nút hành động chính theo màn | ✅ nút hành động chính cả 5 màn: "Task mới" (F11.4, ADR-018), "Tài liệu mới" (F12.5), "Dự án mới" (F13.1), "Thêm thành viên" (F13.2), "Kết nối server" (F13.6); ô tìm kiếm (F14.2), nút "Lọc" (F14.3) | F01 → F11/F12/F13/F14 |
| FR-SH-06 | Đổi dự án: reset tài liệu đang xem về tài liệu đầu tiên, đóng task drawer, mở lại mọi feature group | ✅ | F01 |

### Portfolio
| Mã | Yêu cầu | TT | Feature |
|---|---|---|---|
| FR-PF-01 | Dòng tóm tắt: số dự án · số người và agent dùng chung · số task đang block | ✅ | F06 |
| FR-PF-02 | Grid project card: mã, tên, trạng thái, mô tả, progress (% TB feature), 4 ô thống kê, avatar (≤6), cảnh báo block, sprint; dự án đang mở có viền accent | ✅ | F06 |
| FR-PF-03 | Click card → đổi dự án và sang màn Feature & Task | ✅ | F06 |
| FR-PF-04 | Nút "Dự án mới" tạo dự án | ✅ (F13.1) | F13 |

### Docs dự án
| Mã | Yêu cầu | TT | Feature |
|---|---|---|---|
| FR-DC-01 | Strip kho tri thức: tài liệu n/n đã index, chunk, revision chờ duyệt, agent đã ghi, index cuối, embedding; responsive container query | ✅ | F03 |
| FR-DC-02 | Nút "Index lại" chạy index thật | ⬜ | F18 |
| FR-DC-03 | Cây tài liệu group theo feature + "Kho tri thức chung"; icon sparkle cho doc do agent ghi; doc đang chọn highlight | ✅ | F03 |
| FR-DC-04 | Thân tài liệu: meta (version, trạng thái, sửa lần cuối), tóm tắt, 3 ô info (feature, index, agent đã đọc), các section | ✅ | F03 |
| FR-DC-05 | Khối "Revision chờ duyệt và lịch sử"; nút "Duyệt" chỉ hiện với revision đang chờ | ✅ duyệt ghi DB; lịch sử hiện "Đã duyệt bởi …" / "Bị từ chối: …" (F12.4) | F03, F12 |
| FR-DC-06 | Duyệt revision **áp nội dung đề xuất vào bản chính** | ✅ transaction, tăng version phụ, chặn ghi đè khi tài liệu đã đổi (F12.1–F12.2) | F12 |
| FR-DC-07 | Từ chối revision; xem diff trước khi duyệt | ✅ từ chối kèm lý do, diff theo mục/đoạn (F12.3) | F12 |
| FR-DC-08 | Nút "Tài liệu mới"; người sửa trực tiếp tài liệu | ✅ tạo tài liệu (F12.5), sửa trực tiếp (F12.6) | F12 |
| FR-DC-09 | "Agent đã đọc" lấy từ nhật ký `docs.read` thật | 🟡 `docs_read` ghi tên agent vào "đã đọc" (F16.5); tính lại từ nhật ký ở F18.6 | F16 → F18 |

### Feature & Task
| Mã | Yêu cầu | TT | Feature |
|---|---|---|---|
| FR-WK-01 | Segmented "Theo feature" / "Timeline"; toggle activity rail | ✅ | F02 |
| FR-WK-02 | Banner task block (liệt kê mã + lý do, nút "Xem tất cả") | ✅ | F02 |
| FR-WK-03 | List theo feature: header feature (gập/mở, mã, tên, stage, số docs, progress, owner) + task row (mã, stage, tiêu đề, cờ block/đang chạy, assignee, trạng thái, ước lượng); viền trái accent cho task agent, amber cho task block | ✅ | F02 |
| FR-WK-04 | Responsive container query: rụng cột trạng thái/ước lượng < 880px, stage/tên assignee < 680px | ✅ | F02 |
| FR-WK-05 | View Timeline theo tuần T1–T8, bar phân biệt người / agent / chưa bắt đầu, legend | ✅ đọc từ DB (F09.3) | F02, F09 |
| FR-WK-06 | Activity rail "Agent đang làm gì", tự ẩn khi vùng làm việc < 1120px | ✅ đọc bảng sự kiện thật `ActivityEvent` (F17.1); cập nhật không cần reload bằng polling ngắn (F17.3) | F02 → F17 |
| FR-WK-07 | Task drawer: meta, cảnh báo block, context agent đã pull, log phiên chạy | ✅ log + context docs từ sự kiện và nhật ký MCP thật (F17.4) | F02 → F17 |
| FR-WK-08 | Drawer: "Chuyển stage", "Giao cho agent" | ✅ ghi DB qua server action (F11.3) | F11 |
| FR-WK-09 | Tạo task ("Task mới"); đặt/gỡ trạng thái block | ✅ tạo task (F11.4), block/gỡ block (F11.5) | F11 |

### Dev & AI agents
| Mã | Yêu cầu | TT | Feature |
|---|---|---|---|
| FR-TM-01 | 4 card pipeline (stage, tên agent, mô tả) | ✅ | F04 |
| FR-TM-02 | Bộ lọc: Dự án này / Người / AI agent / Toàn tổ chức | ✅ | F04 |
| FR-TM-03 | Danh sách thành viên (avatar, tên+handle, role, skills, đang làm, trạng thái) + responsive | ✅ | F04 |
| FR-TM-04 | Panel chi tiết: cấu hình agent (chỉ agent), skills có thanh mức, hoạt động gần đây | ✅ | F04 |
| FR-TM-05 | Phân biệt người / agent xuyên suốt (avatar, tag role) | ✅ | F04 |
| FR-TM-06 | "Thêm thành viên"; "Giao task", "Xem log" trong panel | ✅ thêm thành viên (F13.2), giao task (F13.3), xem log (F13.4) | F13 |
| FR-TM-07 | Sửa cấu hình agent (model, MCP server, quyền ghi docs, số task đồng thời) | ✅ model `AgentConfig` + form (F13.5) | F13 |

### MCP (màn quản trị)
| Mã | Yêu cầu | TT | Feature |
|---|---|---|---|
| FR-MC-01 | Server cards: trạng thái, URL, danh sách tool, số client / lệnh 24h / lệnh cuối | ✅ dữ liệu seed | F05 → F16 |
| FR-MC-02 | Bảng "Phiên chạy của agent" cắt ngang nhiều dự án | ✅ dữ liệu seed | F05 → F16 |
| FR-MC-03 | Bảng "Nhật ký lệnh" realtime | ✅ nhật ký thật (F16.2) + polling ngắn (F17.3) | F05 → F17 |
| FR-MC-04 | "Kết nối server" (đăng ký MCP server ngoài) | ✅ thêm/sửa/xoá (F13.6) | F13 |

### Nền tảng agent (MCP server của Meridian)
Nguồn: tài liệu mẫu "MCP tool spec" (seed) + spec màn MCP.
| Mã | Yêu cầu | TT | Feature |
|---|---|---|---|
| FR-AG-01 | Meridian cung cấp MCP server thật cho agent kết nối | ✅ `/api/mcp` Streamable HTTP + token agent (F16.1) | F16 |
| FR-AG-02 | Nhóm tool task: `tasks.list`, `tasks.claim`, `tasks.update_status`, `tasks.comment` | ✅ `tasks_list` (F16.1), `tasks_claim` (F16.3), `tasks_update_status` + `tasks_comment` (F16.4) | F16 |
| FR-AG-03 | Nhóm tool docs: `docs.read`, `docs.search`, `docs.append` (chỉ append được ghi, luôn thành revision chờ duyệt) | ✅ `docs_read`, `docs_search` (từ khoá), `docs_append` → revision (F16.5) | F16 |
| FR-AG-04 | `features.propose` chỉ cho BA agent | ✅ theo `AgentConfig.canProposeFeatures`; lead duyệt ở màn work (F16.6) | F16 |
| FR-AG-05 | `tasks.claim` giới hạn 2 task đồng thời mỗi agent | ✅ theo `AgentConfig.maxConcurrentTasks` (F16.3) | F16 |
| FR-AG-06 | Quyền ghi docs theo cấu hình agent: Chỉ đọc / Append (chờ review) / Append + sửa spec | 🟡 "Chỉ đọc" chặn `docs_append` (F16.7); hai mức append đều tạo revision chờ duyệt | F16 |
| FR-AG-07 | Giới hạn 60 lệnh/phút mỗi client | ✅ theo token, đếm từ nhật ký trong DB (F16.7) | F16 |
| FR-AG-08 | Mọi lệnh ghi vào nhật ký kèm token đã dùng và task liên quan; mỗi kết nối là một phiên chạy | ✅ nhật ký + `tokenId`, phiên (agent, dự án) gắn task (F16.2, F16.7) | F16 |
| FR-AG-09 | `docs.search` tìm theo ngữ nghĩa trên kho tri thức đã index (embedding) | ⬜ | F18 |

### Giai đoạn 2 — data foundation (lập 2026-10-30, `docs/ROADMAP.md`)
| Mã | Yêu cầu | TT | Feature |
|---|---|---|---|
| FR-OR-01 | Có backup DB production định kỳ và cách khôi phục đã thử | ⬜ | F20 |
| FR-OR-02 | Tech lead quản trị thành viên (hồ sơ, email đăng nhập, quyền tech lead) trên UI | ✅ (F20.2) | F20 |
| FR-OR-03 | Dự án thật chạy song song dự án mẫu đã lưu trữ | ⬜ | F20 |
| FR-PM-01 | Lead tạo / sửa feature (owner, stage, kế hoạch) | ✅ tạo (thành viên) / sửa (tech lead, người tạo dự án) (F21.1); agent đề xuất + lead duyệt (F16.6) | F21 |
| FR-PM-02 | % tiến độ feature / dự án tính từ task thật | ✅ trọng số story point (F21.2) | F21 |
| FR-PM-03 | Quản lý sprint: tạo, đặt sprint hiện tại, gán / lọc task theo sprint | ⬜ | F21 |
| FR-PM-04 | Lưu trữ task | ⬜ | F21 |
| FR-PM-05 | Người và agent cùng bình luận trên task | 🟡 agent bình luận qua MCP (F16.4) | F21 |
| FR-PM-06 | Acceptance criteria dạng checklist trên task | ⬜ | F21 |
| FR-QA-01 | Lưu lịch sử chuyển stage / trạng thái của mọi task | ✅ `TaskTransition` từ web + MCP (F22.1) | F22 |
| FR-QA-02 | Task do agent làm phải qua cổng review của người (duyệt / trả lại kèm lý do) | ✅ (F22.2) | F22 |
| FR-QA-03 | Definition of Done theo dự án, áp khi chuyển Review / Done | ⬜ | F22 |
| FR-QA-04 | Task liên kết PR / branch / commit | ✅ agent báo qua MCP, người nhập ở drawer (F22.4) | F22 |
| FR-QA-05 | Chỉ số chất lượng: cycle time, tỉ lệ trả lại, thời gian bị block | ⬜ | F22 |
| FR-TK-01 | Ghi nhận token AI theo task / phiên / agent / dự án | ⬜ | F23 |
| FR-TK-02 | Ước tính chi phí theo bảng giá model | ⬜ | F23 |
| FR-TK-03 | Ngân sách token theo dự án / agent, cảnh báo, tuỳ chọn chặn | ⬜ | F23 |
| FR-TK-04 | So sánh ước lượng với effort thực tế (thời gian chạy + token) | ⬜ | F23 |
| FR-AG-10 | Agent lấy đủ ngữ cảnh task trong một lệnh (`context_get`) | ✅ (F24.1; acceptance criteria thêm khi có F21.6) | F24 |
| FR-AG-11 | TA agent đề xuất chia task, lead duyệt | ⬜ | F24 |
| FR-AG-12 | Agent đề xuất tài liệu mới, lead duyệt | ⬜ | F24 |
| FR-AG-13 | Template tài liệu: PRD, tech spec, ADR, runbook | ⬜ | F24 |
| FR-AG-14 | Quy ước làm việc chuẩn (CLAUDE.md mẫu) cho repo dùng Meridian | 🟡 mẫu + guide (F24.5); chờ thử trên repo thật (F24.7) | F24 |
| FR-MB-01 | Inbox "Cần tôi xử lý" gom mọi việc chờ duyệt | ✅ | F25 |
| FR-MB-02 | Theo dõi trạng thái và duyệt trên màn hình điện thoại (390px) | ⬜ | F25 |
| FR-MB-03 | Cài lên màn hình chính (PWA) | ⬜ | F25 |
| FR-SK-01 | Tạo / sửa skill theo định dạng `SKILL.md`, có phiên bản + diff | ⬜ | F27 |
| FR-SK-02 | Bộ skill dùng chung toàn tổ chức + bắt buộc theo dự án + thêm theo agent, ghim phiên bản | ⬜ | F27 |
| FR-SK-03 | Agent nhận đúng bộ skill được gán qua MCP | ⬜ | F27 |
| FR-SK-04 | Đồng bộ skill vào repo (`.claude/skills/` + lock có hash), CI phát hiện lệch | ⬜ | F27 |
| FR-SK-05 | Agent đề xuất cải tiến skill → người duyệt | ⬜ | F27 |
| FR-SK-06 | Thống kê dùng skill gắn với chất lượng / token của task | ⬜ | F27 |
| FR-SK-07 | Bộ shared skills khởi điểm (quy trình làm việc với Meridian, chuẩn code / test / migration) | ⬜ | F27 |
| FR-DF-01 | API đọc cho hệ thống khác (dự án, task, chỉ số, token) | ⬜ | F26 |
| FR-DF-02 | Báo cáo tiến độ định kỳ + xuất CSV | ⬜ | F26 |
| FR-DF-03 | Tích hợp GitHub: trạng thái PR / CI cập nhật task | ⬜ | F26 |

## 2. Yêu cầu phi chức năng
| Mã | Yêu cầu | TT | Feature |
|---|---|---|---|
| NFR-01 | UI tiếng Việt, giữ thuật ngữ kỹ thuật tiếng Anh (task, feature, sprint, agent, MCP, review, backlog) | ✅ | — |
| NFR-02 | Fidelity design system Nocturne: mọi màu/spacing/radius/shadow từ token trong `app/globals.css`, không hard-code | ✅ | — |
| NFR-03 | Responsive bằng **container query**, không media query; tiêu đề task và tên thành viên không bao giờ bị ẩn | ✅ | — |
| NFR-04 | `:focus-visible` rõ ràng; nút/hàng có thể thao tác bằng bàn phím | ✅ (F10.5) | F10 |
| NFR-05 | Có loading state, error state, empty state, trang 404 | ✅ (F10.1–F10.4) | F10 |
| NFR-06 | Phân trang cho danh sách lớn (nhật ký lệnh, phiên chạy) | ✅ cursor 50 dòng + "Xem thêm" (F14.4) | F14 |
| NFR-07 | Có test tự động (unit, integration với DB, e2e smoke) và CI chạy lint/type/build/test | ✅ unit + integration + e2e, CI GitHub Actions chạy mọi PR | F08 |
| NFR-08 | Không commit secret; mọi cấu hình qua biến môi trường (`.env.example` liệt kê đủ) | ✅ | — |
| NFR-09 | Có đăng nhập (**Google**, chỉ người đã có trong danh sách thành viên); thao tác ghi kiểm tra quyền | 🟡 đăng nhập Google, chặn route, ma trận quyền + UI theo quyền (F15.2–F15.6); còn người dùng thử đăng xuất / email lạ trên production | F15 |
| NFR-10 | Triển khai được lên môi trường thật **miễn phí**: Google Cloud Run + Neon Postgres gói Free, deploy tự động từ GitHub; migrate khi deploy; budget alert; backup DB | 🟡 Cloud Run + Neon Free, deploy + migrate tự động, budget alert (F19); còn backup (F20.1) | F19, F20 |
| NFR-11 | Dữ liệu thời gian lưu kiểu thời gian thật (không lưu chuỗi "chạy 14 phút", "22/08") | ✅ | F09 |
