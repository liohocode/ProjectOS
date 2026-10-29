# F13 — Quản lý dự án, thành viên, cấu hình agent, MCP server

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Đang làm | 2 | F11.2, F11.4 | FR-PF-04, FR-TM-06, FR-TM-07, FR-MC-04 |

## Mục tiêu
Các nút hành động còn "chết" ở Portfolio, Team, MCP hoạt động thật: tạo dự án, thêm thành viên, giao task / xem log từ panel thành viên, sửa cấu hình agent, đăng ký MCP server ngoài.

## Phạm vi
- **Trong**: dialog + server action cho từng thực thể; model cấu hình agent có cấu trúc.
- **Ngoài**: phân quyền (F15), áp dụng cấu hình agent khi agent gọi MCP (F16.7), kiểm tra sức khoẻ MCP server ngoài (F16.8).

## Tham chiếu
- Khuôn mẫu dialog theo URL: ADR "Dialog điều khiển bằng URL" (tạo ở F11.4)
- Code: `components/team/MemberPanel.tsx`, `components/portfolio/*`, `app/[project]/{portfolio,team,mcp}/page.tsx`, `lib/data/team.ts`

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F13.1 | "Dự án mới" | M | F11.4 | Xong |
| F13.2 | "Thêm thành viên" (gán người có sẵn / tạo mới) | M | F11.4 | Xong |
| F13.3 | Panel thành viên: "Giao task" | S | F11.2 | Xong |
| F13.4 | Panel thành viên: "Xem log" | S | F14.3 | Chưa làm |
| F13.5 | Model `AgentConfig` + form sửa cấu hình agent | M | F11.4 | Chưa làm |
| F13.6 | "Kết nối server" + sửa/xoá MCP server | S | F11.4 | Chưa làm |
| F13.7 | Gỡ thành viên khỏi dự án; lưu trữ dự án | S | F13.1, F13.2 | Chưa làm |

### F13.1 — Dự án mới
**Làm gì**: dialog ở màn portfolio: mã 2 ký tự, tên, id (gợi ý slug từ tên, cho sửa), mô tả, trạng thái, sprint đầu tiên (nếu F09.1 xong). Action `createProject`: kiểm tra id/mã không trùng, tự gán người tạo vào `ProjectMember`. Tạo xong → `/<id>/work` (sẽ thấy empty state F10.4).
**Hoàn thành khi**:
- [x] Dự án mới xuất hiện ở portfolio + project switcher (e2e `new-project.spec.ts`)

### F13.2 — Thêm thành viên
**Làm gì**: dialog ở màn team 2 tab: (a) "Từ tổ chức" — chọn người/agent chưa thuộc dự án → `addProjectMember`; (b) "Tạo mới" — tên, handle, người/agent, role, skills (+ cấu hình nếu là agent, dùng form F13.5) → `createMember` (id: `agent-<slug>` cho agent, slug tên cho người) rồi gán vào dự án.
**Hoàn thành khi**:
- [x] Thành viên mới hiện trong danh sách "Dự án này" và trong picker "Giao cho agent" của drawer (nếu là agent) (e2e `add-member.spec.ts`)

### F13.3 — Giao task từ panel thành viên
**Làm gì**: nút "Giao task" mở dialog liệt kê task của dự án chưa Done và chưa giao cho thành viên này (nhóm theo feature) → chọn → `assignTask` (F11.2).
**Hoàn thành khi**:
- [x] Giao xong, cột "Đang làm" của thành viên và task row ở màn work cập nhật (e2e `assign-from-team.spec.ts`)

### F13.4 — Xem log
**Làm gì**: agent → điều hướng `/<project>/mcp?agent=<memberId>` (cần bộ lọc F14.3). Người → dialog liệt kê toàn bộ `MemberActivity` (phân trang đơn giản).
**Hoàn thành khi**:
- [ ] Cả hai trường hợp hoạt động

### F13.5 — Cấu hình agent có cấu trúc
**Làm gì**: hiện `Member.config` là `Json` mảng cặp `[label, value]` — không dùng được cho việc kiểm tra quyền ở F16. Thêm model `AgentConfig(memberId PK, model String, mcpServers String[], docsWritePermission enum {read_only, append_review, append_edit_spec}, maxConcurrentTasks Int @default(2), canProposeFeatures Boolean, canAssignTo String[], extra Json?)`. Migration + seed chuyển từ `config` cũ (Chỉ đọc → `read_only`, "Append (chờ review)" → `append_review`, "Append + sửa spec" → `append_edit_spec`). `lib/data/team.ts` dựng lại mảng hiển thị `config` từ model mới (UI panel không đổi). Form sửa cấu hình trong panel agent → `updateAgentConfig`.
**Hoàn thành khi**:
- [ ] Panel hiển thị như cũ; sửa model/quyền → reload giữ nguyên; `data-model.md` cập nhật

### F13.6 — MCP server ngoài
**Làm gì**: dialog "Kết nối server" ở màn MCP: tên, URL, danh sách tool → `createMcpServer` (trạng thái mặc định `limited` cho tới khi F16.8 kiểm tra). Trên mỗi `ServerCard`: sửa / xoá (xác nhận). Không cho xoá `meridian-core`, `meridian-docs` (server nội bộ).
**Hoàn thành khi**:
- [ ] Thêm/sửa/xoá server hoạt động, số "MCP: n/m server online" ở footer cập nhật

### F13.7 — Gỡ thành viên, lưu trữ dự án
**Làm gì**: gỡ thành viên khỏi dự án (chặn nếu còn task chưa Done được giao — yêu cầu giao lại trước). Lưu trữ dự án: thêm `Project.archivedAt`; dự án lưu trữ ẩn khỏi switcher, hiện mờ ở portfolio.
**Hoàn thành khi**:
- [ ] Cả hai thao tác có xác nhận và kiểm tra ràng buộc

## Quyết định / ghi chú
- **F13.3 (2026-10-29)**: Dialog cục bộ trong panel (không theo URL — hành động phụ, gắn với thành viên đang chọn). Page tải sẵn task chưa Done của dự án (nhóm theo feature); dialog bỏ task đang giao cho chính thành viên. `assignTask` (F11.2) nay ghi luôn `Member.current = "<id> <tiêu đề>"` — cột "Đang làm" ở màn team phản ánh việc vừa giao (áp dụng cả khi giao từ drawer màn work). Thành viên chưa thuộc dự án (xem "Toàn tổ chức") → nút khoá kèm tooltip.
- **F13.2 (2026-10-29)**: `lib/actions/members.ts`: `addProjectMember` (gán người/agent có sẵn) + `createMember` (id slug tên cho người, `agent-<slug>` cho agent, hậu tố `-2`… khi trùng; handle mặc định `@slug` / `agent`; skills tách dấu phẩy; email đăng nhập chỉ cho người, không trùng; trạng thái "Chờ", "Chưa có việc"). Dialog 2 tab ở màn team (`?new=1`); tab "Từ tổ chức" chỉ liệt kê người chưa thuộc dự án. Cấu hình agent khi tạo mới: F13.5 tạo `AgentConfig` mặc định.
- **F13.1 (2026-10-29)**: `lib/actions/projects.ts` `createProject` + `lib/projectRules.ts` (trạng thái chọn được, id dành riêng, regex id/mã, gợi ý mã). Id dự án là đoạn đầu URL nên chặn trùng route gốc (`api`, `login`, `_next`…); id 2–40 ký tự `[a-z0-9-]`, không đổi sau khi tạo. Mã 2 ký tự không có unique ở DB — action kiểm tra trùng trước khi tạo (đủ cho quy mô hiện tại; tạo trùng đồng thời chỉ ra hai mã giống nhau, không hỏng dữ liệu). Form tự gợi ý id (slug) + mã theo tên cho tới khi người dùng sửa tay. Sprint đầu tiên tuỳ chọn (tên + 2 ngày) → tạo `Sprint` và đặt `currentSprintId` trong cùng transaction. Người tạo vào `ProjectMember` nên thấy dự án ngay ở switcher (F15.3 chỉ hiện dự án mình thuộc về).
- Giữ `Member.config` (Json) cho tới khi F13.5 xong, sau đó xoá cột trong cùng migration.
