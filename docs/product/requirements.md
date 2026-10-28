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
| FR-SH-04 | Footer: trạng thái MCP (n/m server online) + người dùng hiện tại | 🟡 người dùng đang hardcode | F01 → F15 |
| FR-SH-05 | Header mọi màn: kicker, tiêu đề, dòng context (dự án · sprint), ô tìm kiếm, nút "Lọc", nút hành động chính theo màn | 🟡 nút "Task mới" đã hoạt động (F11.4, ADR-018); các màn khác + tìm kiếm/lọc chưa | F01 → F11/F12/F13/F14 |
| FR-SH-06 | Đổi dự án: reset tài liệu đang xem về tài liệu đầu tiên, đóng task drawer, mở lại mọi feature group | ✅ | F01 |

### Portfolio
| Mã | Yêu cầu | TT | Feature |
|---|---|---|---|
| FR-PF-01 | Dòng tóm tắt: số dự án · số người và agent dùng chung · số task đang block | ✅ | F06 |
| FR-PF-02 | Grid project card: mã, tên, trạng thái, mô tả, progress (% TB feature), 4 ô thống kê, avatar (≤6), cảnh báo block, sprint; dự án đang mở có viền accent | ✅ | F06 |
| FR-PF-03 | Click card → đổi dự án và sang màn Feature & Task | ✅ | F06 |
| FR-PF-04 | Nút "Dự án mới" tạo dự án | ⬜ | F13 |

### Docs dự án
| Mã | Yêu cầu | TT | Feature |
|---|---|---|---|
| FR-DC-01 | Strip kho tri thức: tài liệu n/n đã index, chunk, revision chờ duyệt, agent đã ghi, index cuối, embedding; responsive container query | ✅ | F03 |
| FR-DC-02 | Nút "Index lại" chạy index thật | ⬜ | F18 |
| FR-DC-03 | Cây tài liệu group theo feature + "Kho tri thức chung"; icon sparkle cho doc do agent ghi; doc đang chọn highlight | ✅ | F03 |
| FR-DC-04 | Thân tài liệu: meta (version, trạng thái, sửa lần cuối), tóm tắt, 3 ô info (feature, index, agent đã đọc), các section | ✅ | F03 |
| FR-DC-05 | Khối "Revision chờ duyệt và lịch sử"; nút "Duyệt" chỉ hiện với revision đang chờ | ✅ duyệt ghi DB | F03 |
| FR-DC-06 | Duyệt revision **áp nội dung đề xuất vào bản chính** (hiện revision chỉ có mô tả, chưa có nội dung) | ⬜ | F12 |
| FR-DC-07 | Từ chối revision; xem diff trước khi duyệt | ⬜ | F12 |
| FR-DC-08 | Nút "Tài liệu mới"; người sửa trực tiếp tài liệu | ⬜ | F12 |
| FR-DC-09 | "Agent đã đọc" lấy từ nhật ký `docs.read` thật | ⬜ | F18 |

### Feature & Task
| Mã | Yêu cầu | TT | Feature |
|---|---|---|---|
| FR-WK-01 | Segmented "Theo feature" / "Timeline"; toggle activity rail | ✅ | F02 |
| FR-WK-02 | Banner task block (liệt kê mã + lý do, nút "Xem tất cả") | ✅ | F02 |
| FR-WK-03 | List theo feature: header feature (gập/mở, mã, tên, stage, số docs, progress, owner) + task row (mã, stage, tiêu đề, cờ block/đang chạy, assignee, trạng thái, ước lượng); viền trái accent cho task agent, amber cho task block | ✅ | F02 |
| FR-WK-04 | Responsive container query: rụng cột trạng thái/ước lượng < 880px, stage/tên assignee < 680px | ✅ | F02 |
| FR-WK-05 | View Timeline theo tuần T1–T8, bar phân biệt người / agent / chưa bắt đầu, legend | ✅ đọc từ DB (F09.3) | F02, F09 |
| FR-WK-06 | Activity rail "Agent đang làm gì", tự ẩn khi vùng làm việc < 1120px | 🟡 suy ra từ task/doc, chưa phải log sự kiện thật | F02 → F17 |
| FR-WK-07 | Task drawer: meta, cảnh báo block, context agent đã pull, log phiên chạy | 🟡 log sinh theo mẫu | F02 → F17 |
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
| FR-TM-06 | "Thêm thành viên"; "Giao task", "Xem log" trong panel | ⬜ | F13 |
| FR-TM-07 | Sửa cấu hình agent (model, MCP server, quyền ghi docs, số task đồng thời) | ⬜ | F13 |

### MCP (màn quản trị)
| Mã | Yêu cầu | TT | Feature |
|---|---|---|---|
| FR-MC-01 | Server cards: trạng thái, URL, danh sách tool, số client / lệnh 24h / lệnh cuối | ✅ dữ liệu seed | F05 → F16 |
| FR-MC-02 | Bảng "Phiên chạy của agent" cắt ngang nhiều dự án | ✅ dữ liệu seed | F05 → F16 |
| FR-MC-03 | Bảng "Nhật ký lệnh" realtime | 🟡 tĩnh | F05 → F17 |
| FR-MC-04 | "Kết nối server" (đăng ký MCP server ngoài) | ⬜ | F13 |

### Nền tảng agent (MCP server của Meridian)
Nguồn: tài liệu mẫu "MCP tool spec" (seed) + spec màn MCP.
| Mã | Yêu cầu | TT | Feature |
|---|---|---|---|
| FR-AG-01 | Meridian cung cấp MCP server thật cho agent kết nối | ⬜ | F16 |
| FR-AG-02 | Nhóm tool task: `tasks.list`, `tasks.claim`, `tasks.update_status`, `tasks.comment` | ⬜ | F16 |
| FR-AG-03 | Nhóm tool docs: `docs.read`, `docs.search`, `docs.append` (chỉ append được ghi, luôn thành revision chờ duyệt) | ⬜ | F16 |
| FR-AG-04 | `features.propose` chỉ cho BA agent | ⬜ | F16 |
| FR-AG-05 | `tasks.claim` giới hạn 2 task đồng thời mỗi agent | ⬜ | F16 |
| FR-AG-06 | Quyền ghi docs theo cấu hình agent: Chỉ đọc / Append (chờ review) / Append + sửa spec | ⬜ | F16 |
| FR-AG-07 | Giới hạn 60 lệnh/phút mỗi client | ⬜ | F16 |
| FR-AG-08 | Mọi lệnh ghi vào nhật ký kèm token đã dùng và task liên quan; mỗi kết nối là một phiên chạy | ⬜ | F16 |
| FR-AG-09 | `docs.search` tìm theo ngữ nghĩa trên kho tri thức đã index (embedding) | ⬜ | F18 |

## 2. Yêu cầu phi chức năng
| Mã | Yêu cầu | TT | Feature |
|---|---|---|---|
| NFR-01 | UI tiếng Việt, giữ thuật ngữ kỹ thuật tiếng Anh (task, feature, sprint, agent, MCP, review, backlog) | ✅ | — |
| NFR-02 | Fidelity design system Nocturne: mọi màu/spacing/radius/shadow từ token trong `app/globals.css`, không hard-code | ✅ | — |
| NFR-03 | Responsive bằng **container query**, không media query; tiêu đề task và tên thành viên không bao giờ bị ẩn | ✅ | — |
| NFR-04 | `:focus-visible` rõ ràng; nút/hàng có thể thao tác bằng bàn phím | ✅ (F10.5) | F10 |
| NFR-05 | Có loading state, error state, empty state, trang 404 | ✅ (F10.1–F10.4) | F10 |
| NFR-06 | Phân trang cho danh sách lớn (nhật ký lệnh, phiên chạy) | ⬜ | F14 |
| NFR-07 | Có test tự động (unit, integration với DB, e2e smoke) và CI chạy lint/type/build/test | 🟡 test đủ 3 tầng; CI chờ push để chạy lần đầu | F08 |
| NFR-08 | Không commit secret; mọi cấu hình qua biến môi trường (`.env.example` liệt kê đủ) | ✅ | — |
| NFR-09 | Có đăng nhập (**Google**, chỉ người đã có trong danh sách thành viên); thao tác ghi kiểm tra quyền | 🟡 đăng nhập Google có (F15.2, Better Auth); chưa chặn route, chưa phân quyền | F15 |
| NFR-10 | Triển khai được lên môi trường thật **miễn phí**: Google Cloud Run + Neon Postgres gói Free, deploy tự động từ GitHub; migrate khi deploy; budget alert; backup DB | ⬜ | F19 |
| NFR-11 | Dữ liệu thời gian lưu kiểu thời gian thật (không lưu chuỗi "chạy 14 phút", "22/08") | ✅ | F09 |
