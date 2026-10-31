# Mô hình dữ liệu

Nguồn sự thật: `prisma/schema.prisma`. File này giải thích quan hệ, quy ước và các điểm còn tạm. Sửa schema → cập nhật file này trong cùng commit.

## Sơ đồ quan hệ
```
Project 1─n Feature 1─n Task
Project 1─n Sprint; Project 0..1─1 Sprint (currentSprint — sprint hiện tại); Sprint 1─n Task (F21.3, task có thể chưa xếp sprint)
Project 1─n Doc            (Doc.featureId null = "Kho tri thức chung" của project)
Feature 1─n Doc
Doc     1─n DocRevision    (author, approvedBy → Member)
Member  n─n Project        (qua ProjectMember — "phân bổ" người/agent vào dự án)
Member  1─n MemberSkillRow, MemberActivity
Member  0..1─1 AgentConfig   (chỉ agent — F13.5)
Member  1─n Feature (owner), Task (assignee), Doc (author)
Member  1─n McpSession, McpLogEntry      (agent; log có thể là người, vd duyệt revision)
Project 1─n McpSession; Task 0─n McpSession
McpServer  (độc lập)
Member  0..1─1 AuthUser 1─n AuthSession, AuthAccount   (đăng nhập Google, chỉ Member người — ADR-020)
AuthVerification  (độc lập, Better Auth dùng cho token tạm)
```

## Bảng
| Model (bảng) | Khoá | Ghi chú |
|---|---|---|
| `Project` (`projects`) | `id` chuỗi (`rv-web`) | `currentSprintId` → sprint hiện tại; nhãn hiển thị "Sprint 14 · 12–26/08" dựng lại bằng `lib/sprint.ts`; `archivedAt` (F13.7) khác null = dự án lưu trữ — ẩn khỏi switcher, hiện mờ ở portfolio; `createdById` (F15.4) → `Member` người tạo, null với dự án mẫu — được duyệt/sửa tài liệu của dự án |
| `Sprint` (`sprints`) | cuid | `name`, `startDate`, `endDate` (kiểu `DATE`); `Task.sprintId?` (F21.3) — xoá sprint → task về "chưa xếp" (`SET NULL`); task mới vào sprint hiện tại |
| `Member` (`members`) | `id` chuỗi (`agent-atlas`, `hieu`) | `kind` = `human`/`agent`; `status` enum `MemberStatus` (nhãn ở `lib/memberFormat.ts`); `current` chuỗi tự do; `skills String[]`; `config Json?` **cũ, không còn dùng** (thay bằng `AgentConfig`, F13.5 — giữ cột để không phải migration xoá dữ liệu); `email String? @unique` — email Google đăng nhập, chỉ người (seed: `<id>@example.com`, `DEV_LOGIN_EMAIL` thay cho `hieu`); `isTechLead Boolean` (F15.4, ADR-021) — quyền quản trị, seed chỉ `hieu` |
| `AgentConfig` (`agent_configs`) | `memberId` | Cấu hình có cấu trúc của agent (F13.5): `model`, `mcpServers String[]`, `docsWritePermission` enum `DocsWritePermission` (`read_only` / `append_review` / `append_edit_spec`), `maxConcurrentTasks` (mặc định 2), `canProposeFeatures`, `canAssignTo String[]` (member id agent), `extra Json?` (dòng hiển thị khác: token tuần này, embedding). Dòng hiển thị ở panel dựng lại bằng `lib/agentConfig.ts`; seed chuyển từ mảng hiển thị cũ bằng `parseLegacyConfig` |
| `AgentToken` (`agent_tokens`) | `id` cuid | Token MCP của agent (F15.5): `name`, `tokenHash` (SHA-256, unique — **không lưu token gốc**), `lastFour` (nhận diện trong danh sách), `createdAt`, `lastUsedAt?`, `revokedAt?` (thu hồi = đặt thời điểm, giữ dòng để xem lịch sử). Xác thực: `lib/auth/agentToken.ts` `verifyAgentToken` |
| `TaskComment` (`task_comments`) | `id` cuid | Bình luận trên task (F16.4): `taskId` (cascade), `authorId` → `Member`, `body`, `createdAt`. Agent ghi qua MCP `tasks_comment`; hiện ở mục "Bình luận" của task drawer |
| `TaskDependency` (`task_dependencies`) | `taskId + dependsOnId` | Phụ thuộc giữa task (F21.8): `taskId` chờ `dependsOnId` xong; cùng dự án, không vòng (`lib/taskDeps.ts`); cascade khi xoá task |
| `TaskCriterion` (`task_criteria`) | `id` cuid | Acceptance criteria của task (F21.6): `taskId` (cascade), `text`, `position` (thứ tự), `doneAt?` + `doneById?` → `Member` (`SET NULL`) người / agent tick. Người sửa trong drawer (`lib/actions/criteria.ts`), agent tick qua MCP `criteria_check` |
| `TaskTransition` (`task_transitions`) | `id` cuid | Lịch sử chuyển stage / trạng thái task (F22.1): `taskId` (cascade), `actorId` → `Member`, `fromStage?`/`toStage?`, `fromStatus?`/`toStatus?` (chỉ phần đổi; `from*` null = vừa tạo), `via` enum `TransitionVia` (`web`/`mcp`), `note?` (F22.2: lý do trả lại sau review), `at`. Ghi qua `lib/domain/taskTransitions.ts` |
| `ActivityEvent` (`activity_events`) | `id` cuid | Sự kiện activity rail (F17.1): `projectId`, `actorId` → `Member`, `type` enum `ActivityType`, `tone` enum `ActivityTone`, `taskId?`/`docId?`/`featureId?` (chuỗi, không FK), `text`, `tool?` (tool MCP dạng `tasks.claim`; null = web), `at`. Index `(projectId, at desc)` |
| `MemberSkillRow` | cuid | `label`, `level` (Cao/Trung bình/Cơ bản/Không dùng), `percent`, `sortOrder` |
| `MemberActivity` | cuid | `icon`, `text`, `at` (timestamp thật) |
| `ProjectMember` | (`projectId`,`memberId`) | |
| `Feature` (`features`) | `id` chuỗi (`FEAT-118`) | `stage` enum; `pct` nhập tay (không tính từ task); số docs tính bằng `_count`; `ownerId` null = đã lên kế hoạch nhưng chưa giao; `plannedStart`/`plannedEnd` (`DATE`) → view Timeline, quy đổi sang tuần T1–T8 bằng `lib/timeline.ts`; `status` enum `FeatureStatus` (F16.6: `proposed` agent đề xuất chờ duyệt / `active` / `rejected`), `proposedById?`, `proposal?`, `proposedAt?`, `rejectedReason?` — list chính, timeline, tìm kiếm chỉ dùng `active`; `pct` **cũ, không còn đọc** — % tiến độ tính từ task (F21.2, `lib/featureProgress.ts`) |
| `Feature` — nội dung (F21.9) | | `goal?`, `scope?`, `notes?` (markdown) — trang `/[project]/work/features/[id]` |
| `Task` (`tasks`) | `id` chuỗi (`T-401`) | `status` enum `TaskStatus`; `estimatePoints Int?`, `dueDate DATE?`, `runningSince DateTime?`; `description?` (markdown) / `size?` (S/M/L) / `code?` (mã kế hoạch) / `needsDecision` (F21.7); `archivedAt?` (F21.4 — task lưu trữ bị loại khỏi list / đếm / timeline / inbox / MCP, mở lại bằng `getArchivedTask`); liên kết code `prUrl`, `branch`, `commitSha` (chuỗi null được, F22.4 — kiểm tra ở `lib/taskLinks.ts`) — format sang "5đ" / "22/08" / "chạy 14 phút" bằng `lib/taskFormat.ts` |
| `Doc` (`docs`) | `id` chuỗi slug (`prd-listing`) | `projectId` bắt buộc, `featureId` tuỳ chọn; `sections Json` = `[{heading, paras[]}]`; `readBy String[]`; `indexedAt`, `chunkCount` |
| `DocRevision` | cuid | `what` (mô tả); `status` enum `RevisionStatus` (`pending` chờ duyệt / `approved` / `rejected`); `proposedSummary String?`, `proposedSections Json?` (cùng shape `Doc.sections`; null = giữ nguyên phần đó); `rejectedReason`; `baseVersion` = `Doc.version` lúc tạo (F12.2 chặn ghi đè); `approvedById`, `approvedAt`. Tạo qua `lib/domain/docs.ts` → `createRevision` (F12.1) |
| `McpServer` | `id` chuỗi (slug tên — F13.6) | `status` enum `online`/`limited`, `tools String[]`; `lastCommandAt` null = chưa nhận lệnh (server vừa đăng ký). `meridian-core`, `meridian-docs` là server nội bộ, không sửa/xoá |
| `McpSession` | `id` chuỗi (`sess-8f2a`) / cuid | `startedAt`, `endedAt` (null = đang chạy; thời lượng tính từ 2 mốc này), `toolCalls`, `tokensUsed Int` (hiển thị "182K" qua `lib/mcpFormat.ts`), `result` enum; `lastCallAt?` (F16.2) — lệnh MCP cuối, phiên thật quá 30 phút không có lệnh thì đóng |
| `McpLogEntry` | cuid | `at`, `tool`, `target`, `result` enum; index `at desc`; `tokenId?` (F16.7) → `AgentToken` đã dùng — rate limit 60 lệnh/phút/token |
| `AuthUser` (`auth_users`) | id do Better Auth sinh | schema lõi Better Auth 1.7 (`name`, `email` unique, `emailVerified`, `image`) + `memberId` unique → `Member` (cascade), gán lúc tạo tài khoản. Không sửa tay field lõi — adapter đọc đúng tên field mặc định |
| `AuthSession` (`auth_sessions`) | id Better Auth | `token` unique, `expiresAt`, `ipAddress`, `userAgent`; cookie cache 5 phút nên không đọc bảng này mỗi request |
| `AuthAccount` (`auth_accounts`) | id Better Auth | `providerId` = `google`, `accountId` = Google sub; token OAuth |
| `AuthVerification` (`auth_verifications`) | id Better Auth | token tạm (state OAuth…) |

## Quy ước
- **Extension Postgres**: `unaccent` (migration `unaccent_search`, F14.2) cho tìm kiếm không dấu ở `lib/data/search.ts` (`$queryRaw`). Không khai báo trong `schema.prisma` → `migrate diff` không đụng tới; DB mới (test, Neon) có qua `migrate deploy`.
- **Khoá chính là id chuỗi đọc được** (`rv-web`, `FEAT-118`, `T-401`, `prd-listing`, `agent-atlas`) cho các thực thể nghiệp vụ — UI và URL dùng thẳng các id này. Bảng phụ (skill row, activity, revision, log) dùng `cuid()`. Lý do: `decisions.md` ADR-006.
- **Enum có giá trị tiếng Việt**: tên identifier ASCII + `@map` giữ giá trị trong DB. Map ngược sang chuỗi hiển thị ở `lib/data/mcpLabels.ts` (`SESSION_RESULT_LABEL`, `COMMAND_RESULT_LABEL`), `lib/taskFormat.ts` (`TASK_STATUS_LABEL`) và `prisma/seed.ts` (`SESSION_RESULT_MAP`, `COMMAND_RESULT_MAP`). Unit test đối chiếu với enum sinh ra — thêm giá trị enum mà quên nhãn sẽ fail.

  | Prisma | DB / hiển thị |
  |---|---|
  | `SessionResult.DangChay` | `Đang chạy` |
  | `ChoReview` | `Chờ review` |
  | `BiChan` | `Bị chặn` |
  | `TaskStatus.DangLam` / `Cho` / `ChoReview` / `DangChay` | `Đang làm` / `Chờ` / `Chờ review` / `Đang chạy` |
  | `MemberStatus.DangChay` / `DangLam` / `DangReview` / `Cho` | `Đang chạy` / `Đang làm` / `Đang review` / `Chờ` |
  | `Xong`, `OK` | giữ nguyên |
- **Thời gian**: lưu `DateTime`, format sang "x phút trước" bằng `lib/relativeTime.ts` tại `lib/data/*`. Không lưu chuỗi tương đối vào DB (các field còn vi phạm liệt kê dưới).
- Tên bảng snake_case qua `@@map`.

## Điểm còn tạm (nợ kỹ thuật dữ liệu)
| Field | Hiện tại | Đích | Task |
|---|---|---|---|
| `Member.config` | cột JSON cũ, không còn đọc/ghi | xoá cột (migration làm mất dữ liệu → hỏi người dùng) sau khi production đã có `AgentConfig` | — |
| `Member.current` | chuỗi tự do ("T-405 Sinh test cho API bộ lọc") | suy ra từ task đang chạy/đang làm của thành viên | F17 (cùng lúc với bảng sự kiện thật) |

## Dữ liệu seed
`npx prisma db seed` chạy `prisma/seed.ts`: xoá sạch mọi bảng (thứ tự con → cha) rồi nạp lại từ `prisma/seed-data/*.ts` — bản chụp dữ liệu mock gốc của design, **cố tình tách khỏi `lib/data/*`** để seed không phụ thuộc vào chính DB nó tạo ra. Thêm dữ liệu mẫu → sửa `prisma/seed-data/`, không chèn tay qua Prisma Studio.

Số lượng sau seed (dùng làm mốc cho test integration):

| Bảng | Số dòng |
|---|---|
| projects | 3 |
| sprints | 3 (mỗi project 1 sprint hiện tại) |
| members | 7 (4 agent, 3 người) |
| project_members | 18 |
| features | 12 (9 có owner + 3 đã lên kế hoạch chưa giao: FEAT-126, FEAT-212, FEAT-309) |
| tasks | 22 (3 task block: T-418, T-402, T-522) |
| docs | 22 |
| doc_revisions | 27 (2 đang chờ duyệt, cả 2 ở `rv-web`) |
| mcp_servers | 3 (2 online) |
| mcp_sessions | 8 |
| mcp_log_entries | 8 |
