# F27 — Skills hub cho coding agent

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Chưa bắt đầu | 8 | F16, F24.1 | FR-SK-01…07 |

## Mục tiêu
Meridian là **nơi tạo, quản lý và phân phối skills** cho mọi coding agent của công ty: một bộ **shared skills đồng nhất** (quy trình làm việc, chuẩn code, cách viết test / migration / tài liệu…) có phiên bản, được duyệt như tài liệu, gán theo dự án / agent, và mọi repo / agent nhận **đúng cùng một phiên bản**.

## Phạm vi
- **Trong**: lưu skill theo định dạng chuẩn `SKILL.md` (frontmatter `name` / `description` + nội dung + file kèm), phiên bản + duyệt, gán skill cho tổ chức / dự án / agent, phân phối qua MCP và đồng bộ vào repo (`.claude/skills/`, `skills-lock.json` có hash), agent đề xuất cải tiến skill, thống kê dùng skill.
- **Ngoài**: chợ skill công khai, chạy / thực thi skill phía server (skill do agent chạy trong môi trường của nó).

## Tham chiếu
- Định dạng đang dùng trong repo: `.agents/skills/*/SKILL.md`, `skills-lock.json` (nguồn + `computedHash`).
- Governance tài liệu (F12, F16.5): mọi thay đổi do agent đề xuất → bản chờ người duyệt.
- F24.5 (quy ước làm việc cho agent) chuyển thành skill dùng chung đầu tiên.

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F27.1 | Model `Skill` + `SkillVersion` (phạm vi tổ chức / dự án, nội dung `SKILL.md` + file kèm, hash, trạng thái) + ADR định dạng | M | — | Chưa làm |
| F27.2 | Màn **Skills**: danh sách, xem, tạo / sửa (tech lead), lịch sử phiên bản + diff, nhập từ `SKILL.md` | L | F27.1 | Chưa làm |
| F27.3 | Gán skill: bộ dùng chung toàn tổ chức, bắt buộc theo dự án, thêm theo agent (`AgentConfig`); ghim phiên bản | M | F27.1 | Chưa làm |
| F27.4 | MCP `skills_list`, `skills_get(name)` — trả đúng bộ + phiên bản được gán cho agent / dự án; ghi nhật ký | M | F27.3 | Chưa làm |
| F27.5 | Đồng bộ vào repo: endpoint xuất + script `npm run skills:sync` ghi `.claude/skills/` + `skills-lock.json` (hash), kiểm tra lệch trong CI | M | F27.3 | Chưa làm |
| F27.6 | Agent đề xuất cải tiến / skill mới (`skills_propose`) → phiên bản chờ duyệt, diff, duyệt / từ chối | M | F27.2, F27.4 | Chưa làm |
| F27.7 | Thống kê dùng skill: agent / dự án / phiên bản nào, gắn với chất lượng (F22.5) và token (F23.3) của task | S | F27.4, F22.5, F23.3 | Chưa làm |
| F27.8 | Bộ shared skills khởi điểm: `meridian-workflow` (từ F24.5), chuẩn code / test / migration của công ty, nhập skills Prisma hiện có | S | F27.2, F24.5 | Chưa làm |

### F27.1 — Model + định dạng
**Làm gì**: `Skill(id, name unique theo phạm vi, scope org|project, projectId?, description, currentVersionId, archivedAt?)`, `SkillVersion(id, skillId, version semver, body (SKILL.md), files Json (đường dẫn → nội dung, giới hạn kích thước), hash SHA-256 nội dung, status pending|active|rejected, authorId, approvedById?, createdAt)`. ADR: tương thích định dạng Agent Skills (`SKILL.md` + frontmatter), hash giống `skills-lock.json` để kiểm tra đồng nhất.
**Hoàn thành khi**:
- [ ] Nhập một `SKILL.md` có sẵn → lưu, hash khớp `computedHash` cách tính hiện tại (integration)

### F27.2 — Màn Skills
**Làm gì**: mục nav mới "Skills" (cấp tổ chức, như Portfolio). Danh sách (tên, mô tả, phạm vi, phiên bản hiện tại, số dự án / agent dùng), trang chi tiết render markdown, lịch sử phiên bản + diff (dùng lại diff của revision F12.4). Tạo / sửa: tech lead (quyền `skill.manage` — thêm vào ma trận ADR-021); sửa = phiên bản mới.
**Hoàn thành khi**:
- [ ] Tạo skill, sửa ra phiên bản 2, xem diff v1 → v2 (e2e)

### F27.3 — Gán skill
**Làm gì**: bộ "dùng chung" (mọi agent mọi dự án), "bắt buộc theo dự án", "thêm theo agent"; mặc định theo phiên bản mới nhất đã duyệt, cho phép ghim phiên bản. Panel agent + cài đặt dự án hiện danh sách skill hiệu lực.
**Hoàn thành khi**:
- [ ] Bộ skill hiệu lực của một agent trong một dự án tính đúng (dùng chung ∪ dự án ∪ agent, phiên bản ghim) (integration)

### F27.4 — Phân phối qua MCP
**Làm gì**: `skills_list` (tên, mô tả, phiên bản, hash), `skills_get(name)` (nội dung + file kèm); governance F16.7 (server `meridian-core`). Nhật ký ghi tên + phiên bản skill.
**Hoàn thành khi**:
- [ ] Agent nhận đúng bộ skill được gán qua MCP client SDK (integration)

### F27.5 — Đồng bộ vào repo
**Làm gì**: `GET /api/skills/export?project=<id>` (token agent hoặc token tích hợp F26.1) → gói skill hiệu lực; script `scripts/skills-sync.ts` ghi `.claude/skills/<name>/SKILL.md` + file kèm + `skills-lock.json` (nguồn `meridian`, hash); `--check` cho CI báo lệch. Hướng dẫn trong `docs/guides/agent-skills.md`.
**Hoàn thành khi**:
- [ ] Hai repo chạy sync nhận skill giống hệt (hash khớp); sửa tay skill trong repo → `--check` báo lệch

### F27.6 — Agent đề xuất skill
**Làm gì**: `skills_propose(name, body, files?, what)` → `SkillVersion` status pending; inbox duyệt (F25.2) + màn Skills hiện diff; duyệt → thành phiên bản hiện tại.
**Hoàn thành khi**:
- [ ] Agent đề xuất sửa skill → lead thấy diff, duyệt → agent khác nhận phiên bản mới qua `skills_get`

## Quyết định / ghi chú
- Người dùng yêu cầu bổ sung 2026-10-30: "tạo, quản lý và cung cấp skills cho các coding agent, shared skills đồng nhất".
