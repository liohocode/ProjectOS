# Mô hình dữ liệu

Nguồn sự thật: `prisma/schema.prisma`. File này giải thích quan hệ, quy ước và các điểm còn tạm. Sửa schema → cập nhật file này trong cùng commit.

## Sơ đồ quan hệ
```
Project 1─n Feature 1─n Task
Project 1─n Sprint; Project 0..1─1 Sprint (currentSprint — sprint hiện tại)
Project 1─n Doc            (Doc.featureId null = "Kho tri thức chung" của project)
Feature 1─n Doc
Doc     1─n DocRevision    (author, approvedBy → Member)
Member  n─n Project        (qua ProjectMember — "phân bổ" người/agent vào dự án)
Member  1─n MemberSkillRow, MemberActivity
Member  1─n Feature (owner), Task (assignee), Doc (author)
Member  1─n McpSession, McpLogEntry      (agent; log có thể là người, vd duyệt revision)
Project 1─n McpSession; Task 0─n McpSession
McpServer  (độc lập)
```

## Bảng
| Model (bảng) | Khoá | Ghi chú |
|---|---|---|
| `Project` (`projects`) | `id` chuỗi (`rv-web`) | `currentSprintId` → sprint hiện tại; nhãn hiển thị "Sprint 14 · 12–26/08" dựng lại bằng `lib/sprint.ts` |
| `Sprint` (`sprints`) | cuid | `name`, `startDate`, `endDate` (kiểu `DATE`) |
| `Member` (`members`) | `id` chuỗi (`agent-atlas`, `hieu`) | `kind` = `human`/`agent`; `skills String[]`; `config Json?` = `[["Model","claude-sonnet-4.5"], ...]`, chỉ agent có |
| `MemberSkillRow` | cuid | `label`, `level` (Cao/Trung bình/Cơ bản/Không dùng), `percent`, `sortOrder` |
| `MemberActivity` | cuid | `icon`, `text`, `at` (timestamp thật) |
| `ProjectMember` | (`projectId`,`memberId`) | |
| `Feature` (`features`) | `id` chuỗi (`FEAT-118`) | `stage` enum; `pct` nhập tay (không tính từ task); số docs tính bằng `_count` |
| `Task` (`tasks`) | `id` chuỗi (`T-401`) | `est`, `due`, `running`, `status` còn là chuỗi — F09.2 |
| `Doc` (`docs`) | `id` chuỗi slug (`prd-listing`) | `projectId` bắt buộc, `featureId` tuỳ chọn; `sections Json` = `[{heading, paras[]}]`; `readBy String[]`; `indexedAt`, `chunkCount` |
| `DocRevision` | cuid | `what` (mô tả), `pending Boolean`, `approvedById`, `approvedAt`. **Chưa có nội dung đề xuất** — F12.1 |
| `McpServer` | `id` chuỗi | `status` enum `online`/`limited`, `tools String[]` |
| `McpSession` | `id` chuỗi (`sess-8f2a`) / cuid | `durationMin`, `toolCalls`, `tokens` (chuỗi "182K" — F09.4), `result` enum |
| `McpLogEntry` | cuid | `at`, `tool`, `target`, `result` enum; index `at desc` |

## Quy ước
- **Khoá chính là id chuỗi đọc được** (`rv-web`, `FEAT-118`, `T-401`, `prd-listing`, `agent-atlas`) cho các thực thể nghiệp vụ — UI và URL dùng thẳng các id này. Bảng phụ (skill row, activity, revision, log) dùng `cuid()`. Lý do: `decisions.md` ADR-006.
- **Enum có giá trị tiếng Việt**: tên identifier ASCII + `@map` giữ giá trị trong DB. Map ngược sang chuỗi hiển thị ở `lib/data/mcp.ts` (`SESSION_RESULT_LABEL`, `COMMAND_RESULT_LABEL`) và `prisma/seed.ts` (`SESSION_RESULT_MAP`, `COMMAND_RESULT_MAP`).

  | Prisma | DB / hiển thị |
  |---|---|
  | `SessionResult.DangChay` | `Đang chạy` |
  | `ChoReview` | `Chờ review` |
  | `BiChan` | `Bị chặn` |
  | `Xong`, `OK` | giữ nguyên |
- **Thời gian**: lưu `DateTime`, format sang "x phút trước" bằng `lib/relativeTime.ts` tại `lib/data/*`. Không lưu chuỗi tương đối vào DB (các field còn vi phạm liệt kê dưới).
- Tên bảng snake_case qua `@@map`.

## Điểm còn tạm (nợ kỹ thuật dữ liệu)
| Field | Hiện tại | Đích | Task |
|---|---|---|---|
| `Task.est` | `"5đ"`, `"—"` | `estimatePoints Int?` | F09.2 |
| `Task.due` | `"22/08"` | `dueDate DateTime?` | F09.2 |
| `Task.running` | `"chạy 14 phút"` | `runningSince DateTime?` | F09.2 |
| `Task.status` | chuỗi tự do | enum `TaskStatus` | F09.2 |
| Timeline | `lib/data/timeline.ts` mock | `Feature.plannedStart/plannedEnd` | F09.3 |
| `McpSession.tokens` | `"182K"` | `tokensUsed Int` | F09.4 |
| `Member.status`, `Member.current` | chuỗi tự do | enum + suy ra từ task đang làm | F09.4 |
| `DocRevision` | chỉ có mô tả | `proposedSections Json`, `status` enum (pending/approved/rejected) | F12.1 |

## Dữ liệu seed
`npx prisma db seed` chạy `prisma/seed.ts`: xoá sạch mọi bảng (thứ tự con → cha) rồi nạp lại từ `prisma/seed-data/*.ts` — bản chụp dữ liệu mock gốc của design, **cố tình tách khỏi `lib/data/*`** để seed không phụ thuộc vào chính DB nó tạo ra. Thêm dữ liệu mẫu → sửa `prisma/seed-data/`, không chèn tay qua Prisma Studio.

Số lượng sau seed (dùng làm mốc cho test integration):

| Bảng | Số dòng |
|---|---|
| projects | 3 |
| sprints | 3 (mỗi project 1 sprint hiện tại) |
| members | 7 (4 agent, 3 người) |
| project_members | 18 |
| features | 9 |
| tasks | 22 (3 task block: T-418, T-402, T-522) |
| docs | 22 |
| doc_revisions | 27 (2 đang chờ duyệt, cả 2 ở `rv-web`) |
| mcp_servers | 3 (2 online) |
| mcp_sessions | 8 |
| mcp_log_entries | 8 |
