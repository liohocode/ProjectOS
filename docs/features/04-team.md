# 04 — Dev & AI agents

**Trạng thái:** Xong (v1)

## Mục tiêu
Xem ai (người hay agent) đang làm gì, cấu hình agent (model, MCP server, quyền...).

## Tham chiếu
`docs/design-reference.md` → mục "4. Dev & AI agents" (4 card pipeline, bộ lọc, danh sách thành viên, panel chi tiết, "Phân biệt người vs agent").

## Data đã sẵn có
`lib/data/team.ts` — `getTeam()`, `getTeamByProject(projectId)`, `getMemberById(id)`, `getPipelineAgents()`. Type: `Member` (đã gồm `config` optional cho agent, `skillRows`, `activity`).

## Đã làm
- [x] 4 card pipeline (`PipelineCards`, mô tả dài lấy từ design-reference, dùng lại `getPipelineAgents()` đã có ở sidebar).
- [x] Bộ lọc `.seg` (`TeamScreen`, state `filter` client): `all`/`human`/`agent` lọc trên `getTeamByProject`, `org` = `getTeam()`.
- [x] Danh sách `.mrow` (`MemberRow`) — border trái accent khi `is-selected`.
- [x] Container query ẩn cột skills/`m-current` — container `team` khai báo ở `.member-list`.
- [x] Panel chi tiết phải (`MemberPanel`, container `team-shell` khai báo ở `.team-shell`): cấu hình agent (chỉ khi có `config`), skills bar, hoạt động gần đây, footer 2 nút.

## Còn thiếu / cần làm tiếp
- [ ] Nút "Xem log" / "Giao task" ở footer panel chưa có hành vi — khác với "Giao cho agent" trong task drawer (mục tiêu rõ: 1 task cụ thể), "Giao task" ở đây cần chọn task nào trong số nhiều feature/task của project, chưa rõ UX (danh sách task nào hiện ra?) nên để ngỏ chờ làm rõ thay vì bịa flow.
- [ ] Khi đổi filter sang "org", state `selectedId` có thể trỏ tới member đã bị lọc khỏi `shown` — panel vẫn hiển thị đúng member đó (dùng `orgTeam.find` để tra cứu) nhưng danh sách bên trái không còn highlight hàng nào tương ứng nếu member đó không thuộc `shown`; chấp nhận được cho v1, cân nhắc auto-select lại nếu cần UX chặt hơn.

## Ghi chú
Avatar người/agent dùng class `.avatar-human` / `.avatar-agent` có sẵn trong `app/globals.css` — tái dùng, không viết lại style avatar.
