# 04 — Dev & AI agents

**Trạng thái:** Chưa bắt đầu

## Mục tiêu
Xem ai (người hay agent) đang làm gì, cấu hình agent (model, MCP server, quyền...).

## Tham chiếu
`docs/design-reference.md` → mục "4. Dev & AI agents" (4 card pipeline, bộ lọc, danh sách thành viên, panel chi tiết, "Phân biệt người vs agent").

## Data đã sẵn có
`lib/data/team.ts` — `getTeam()`, `getTeamByProject(projectId)`, `getMemberById(id)`, `getPipelineAgents()`. Type: `Member` (đã gồm `config` optional cho agent, `skillRows`, `activity`).

## Checklist
- [ ] 4 card pipeline (BA/TA/Dev/Index) — dùng `getPipelineAgents()` đã có sẵn (đã dùng trong sidebar, tái sử dụng cho card ở đây với mô tả dài hơn từ design-reference).
- [ ] Bộ lọc `.seg`: Dự án này / Người / AI agent / Toàn tổ chức — state `filter` (client). `all` = `getTeamByProject`, `org` = `getTeam()`.
- [ ] Danh sách `.mrow` — border trái accent khi hàng đang chọn (state `member`).
- [ ] Container query ẩn cột skills (<1000px) rồi cột "đang làm" (<780px) — CSS `.mrow`/`.m-skills`/`.m-current` đã có sẵn trong `app/globals.css`.
- [ ] Panel chi tiết phải (308px, tự ẩn <1120px dùng class `.team-shell`/`.team-aside` đã có CSS sẵn): header, "Cấu hình agent" (chỉ hiện khi `member.kind === 'agent'` và có `config`), skills (thanh 4px, fill accent nếu >70%), hoạt động gần đây, footer 2 nút.

## Ghi chú
Avatar người/agent dùng class `.avatar-human` / `.avatar-agent` đã có sẵn trong `app/globals.css` (đã dùng ở sidebar footer) — tái dùng, đừng viết lại style avatar.
