# F28 — Kế hoạch & tài liệu kỹ thuật của Meridian trên web (dogfooding)

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Đang làm | 7b | F21.7–F21.11 | FR-DF-01…05 |

## Mục tiêu
Chuyển kế hoạch đang nằm trong `.md` (ROADMAP, file feature, yêu cầu, ADR, data model) lên chính Meridian: **dự án "Meridian" là dự án thật đầu tiên**. Vừa code vừa xem tiến độ trên web; DB là nguồn sự thật, agent nhận / đóng task qua MCP thay vì sửa `.md`.

## Phạm vi
- **Trong**: script import `.md` → DB (feature, task, tiêu chí, phụ thuộc, ghi chú quyết định, tài liệu kỹ thuật), màn Roadmap, chuyển quy trình làm việc (WORKFLOW / CLAUDE.md) sang MCP, bản export `.md` tự sinh để đọc trong repo.
- **Ngoài**: chạy agent từ web (F29), nhiều tổ chức (backlog).

## Tham chiếu
- Nguồn import: `docs/ROADMAP.md`, `docs/features/F*.md`, `docs/product/requirements.md`, `docs/architecture/*.md`, `docs/guides/*.md`
- Quy trình hiện tại: `docs/WORKFLOW.md`, `docs/guides/agent-workflow.md`

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F28.1 | Feature có phase + phụ thuộc giữa feature; dự án có danh sách phase (tên, mục tiêu, thứ tự) | S | F21.9 | Xong — 2026-10-31 |
| F28.2 | Script `scripts/import-plan.ts`: đọc `docs/features/*.md` + ROADMAP → upsert dự án `meridian` (feature, task, mô tả, cỡ, phụ thuộc, tiêu chí "Hoàn thành khi", trạng thái, ghi chú quyết định); `--dry-run`, chạy lại không nhân đôi | M | F28.1, F21.8 | Xong — 2026-10-31 |
| F28.3 | Import tài liệu kỹ thuật (requirements, ADR, data model, overview, guides) thành Doc markdown, gắn feature khi có | S | F21.11 | Chưa làm |
| F28.4 | Màn **Roadmap** của dự án: tiến độ theo phase / feature, quyết định đang mở (task "Cần quyết định"), "việc nên nhận tiếp" (task chưa làm có phụ thuộc đã xong) | M | F28.1 | Chưa làm |
| F28.5 | Import lên production (dự án `meridian`) + chuyển nguồn sự thật: WORKFLOW / CLAUDE.md / agent-workflow đổi sang nhận – đóng task qua MCP; `.md` kế hoạch thành bản export tự sinh (`npm run plan:export`) | M | F28.2–F28.4 | Chưa làm — Lio đã duyệt 2026-10-31 (dự án mới `meridian` trên production, không đụng dữ liệu mẫu) |
| F28.6 | Agent phát triển Meridian (Claude Code) dùng token MCP production cho dự án `meridian` — dogfooding hằng ngày (gộp F24.7) | S | F28.5 | Chưa làm — Lio tạo token |

### F28.1 — Phase + phụ thuộc feature
**Hoàn thành khi**:
- [x] Feature gắn phase, thêm / bỏ phụ thuộc giữa feature (không vòng) ở trang chi tiết (integration `lib/actions/features.integration.test.ts`, e2e `feature-detail.spec.ts`)

### F28.2 — Import kế hoạch
**Làm gì**: parser thuần (`lib/planImport.ts`, unit test trên file feature mẫu) tách: bảng đầu (trạng thái / phase / phụ thuộc), Mục tiêu + Phạm vi → mô tả feature, bảng Tasks (mã, tiêu đề, cỡ, phụ thuộc, trạng thái → stage), mục `### FXX.n` (Làm gì → mô tả task, "Hoàn thành khi" → tiêu chí, `[x]` → đã đạt), "Quyết định / ghi chú" → ghi chú feature. Mã feature giữ nguyên (`F21`), mã task `F21.3` lưu ở trường mã hiển thị riêng (id task vẫn `T-n`).
**Hoàn thành khi**:
- [x] Import toàn bộ `docs/features` vào DB dev: số feature / task / task xong khớp ROADMAP; chạy lại lần 2 không đổi gì (unit `lib/planImport.test.ts` trên file thật, integration `lib/domain/planImport.integration.test.ts`)

### F28.5 — Chuyển nguồn sự thật
**Hoàn thành khi**:
- [ ] Một task mới làm từ đầu đến cuối chỉ qua Meridian (claim → context_get → PR → Review → duyệt trên web), không sửa `.md` kế hoạch bằng tay

## Quyết định / ghi chú
- **F28.2 (2026-10-31)**: parser thuần `lib/planImport.ts` (unit test chạy trên chính `docs/features/*.md` + so tổng với ROADMAP — bắt được ROADMAP ghi F19 8/9 trong khi file có 10 task, đã sửa) + ghi DB `lib/domain/planImport.ts` (một transaction; `--dry-run` chạy hết rồi rollback). Khớp: phase theo (dự án, code), feature id = mã kế hoạch (`F21`; từ chối nếu id đã thuộc dự án khác), task theo (dự án, `code`) — task mới lấy id `T-n` tiếp theo. Mỗi lần chạy ghi đè nội dung từ `.md` (tiêu đề, stage, mô tả, cỡ, tiêu chí, phụ thuộc, thứ tự). Trạng thái: Xong → Done; Đang làm → Dev; Chưa làm → TA / Chờ; Hoãn / Chặn / "cần Lio" → block kèm lý do (`needsDecision` khi cần Lio / quyết định); "Chuyển → / thay bằng / gộp vào" → task lưu trữ. "Tham chiếu" ghép vào phạm vi, "Đã chuyển sang feature khác" ghép vào ghi chú. Task mới giao cho `--assignee`. `npm run plan:import -- --assignee <id> [--project meridian] [--dry-run]`. Đã chạy trên DB dev: 13 phase, 29 feature, 169 task (120 xong), 128 tiêu chí, 50 phụ thuộc feature, 138 phụ thuộc task.
- **F28.1 (2026-10-31)**: migration chỉ thêm bảng `project_phases` (`code` duy nhất trong dự án, vd "7", "7b" — khoá cho import F28.2; `position` thứ tự), `feature_dependencies` (cùng dự án, không vòng — dùng lại `wouldCreateCycle`), cột `Feature.phaseId?` (`SET NULL`). Trang chi tiết feature: chọn phase, mục "Phụ thuộc" (feature cần xong trước + feature đang chờ). Quyền `feature.manage`. Tạo / sửa phase chưa có UI — import F28.2 tạo, màn Roadmap F28.4 hiển thị. Seed: rv-web 2 phase, FEAT-120 phụ thuộc FEAT-118.
- **2026-10-31** (Lio): hoàn thiện feature & task trước, rồi đưa kế hoạch + tài liệu kỹ thuật từ `.md` lên web (lưu DB), để vừa code vừa theo dõi tiến độ trên web. Thay cho F20.3 (onboarding dự án thật): Meridian là dự án thật đầu tiên.
