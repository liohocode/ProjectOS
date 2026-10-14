# F18 — Kho tri thức & index tài liệu

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Hoãn — người dùng chọn "để sau" (2026-10-14) | 4 | F12, F16.5 | FR-DC-02, FR-DC-09, FR-AG-09 |

## Mục tiêu
Làm thật "kho tri thức": tài liệu được chia chunk + embedding để agent tìm theo ngữ nghĩa qua `docs_search`; nút "Index lại", số chunk, "Index cuối", "Agent đã đọc" phản ánh dữ liệu thật thay vì giá trị seed.

## Phạm vi
- **Trong**: pgvector, model chunk, pipeline index, nút "Index lại", index lại tự động, `docs_search` ngữ nghĩa, "Agent đã đọc" từ log.
- **Ngoài**: index nguồn ngoài (repo code, Confluence…).

## Tham chiếu
- `docs/design/design-reference.md` → "Strip kho tri thức" (embedding `text-embedding-3-large`)
- Code: `components/docs/KnowledgeStrip.tsx`, `lib/data/docs.ts` (`getKnowledgeStripStats`), `Doc.indexedAt`, `Doc.chunkCount`, `Doc.readBy`

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F18.1 | **Quyết định** nhà cung cấp embedding + API key (cần người dùng chốt) | S | — | Chưa làm |
| F18.2 | pgvector + model `DocChunk` | M | F18.1 | Chưa làm |
| F18.3 | Pipeline index: chunk + embedding + cập nhật `Doc` | M | F18.2 | Chưa làm |
| F18.4 | Nút "Index lại" + index lại tự động khi tài liệu đổi | S | F18.3, F12.2 | Chưa làm |
| F18.5 | `docs_search` ngữ nghĩa (vector + từ khoá dự phòng) | M | F18.3, F16.5 | Chưa làm |
| F18.6 | "Agent đã đọc" tính từ nhật ký `docs.read` | S | F16.5 | Chưa làm |

### F18.1 — Quyết định embedding
**Làm gì**: trình bày cho người dùng các lựa chọn (spec gốc ghi `text-embedding-3-large` của OpenAI — 3072 chiều; hoặc model khác/rẻ hơn/chạy local), chi phí ước tính theo số tài liệu, nơi lưu API key. Ghi ADR. Số chiều vector quyết định schema ở F18.2.
**Hoàn thành khi**:
- [ ] Có ADR + biến môi trường mới trong `.env.example`

### F18.2 — pgvector
**Làm gì**: đổi image trong `docker-compose.yml` sang `pgvector/pgvector:pg16` (giữ volume, kiểm tra dữ liệu còn nguyên); migration `CREATE EXTENSION IF NOT EXISTS vector`; model `DocChunk(id, docId, idx, content, tokenCount, embedding Unsupported("vector(<n>)"))` + index HNSW/IVFFlat bằng SQL trong migration. Prisma không hỗ trợ kiểu vector trực tiếp → đọc/ghi embedding bằng `$queryRaw`/`$executeRaw` (đọc skill `prisma-client-api` → raw queries).
**Hoàn thành khi**:
- [ ] Migration chạy sạch trên DB dev và DB test; CI (F08.6) đổi image Postgres tương ứng

### F18.3 — Pipeline index
**Làm gì**: `lib/indexing/indexDoc.ts`: tách doc theo section → chunk (~500 token, chồng lấn nhỏ), gọi embedding theo lô, xoá chunk cũ + ghi chunk mới trong transaction, cập nhật `Doc.indexedAt`, `Doc.chunkCount`. `indexProject(projectId)` chạy tuần tự từng doc. Ghi `ActivityEvent` (F17) "Index lại N tài liệu" với actor = Index agent (Scout).
**Hoàn thành khi**:
- [ ] Index `rv-web` → strip kho tri thức hiện số chunk / index cuối thật

### F18.4 — "Index lại" + tự động
**Làm gì**: nút "Index lại" ở `KnowledgeStrip` → server action chạy `indexProject` (hiện trạng thái đang chạy; nếu lâu, chạy nền và báo qua F17). Sau khi duyệt revision (F12.2) hoặc sửa/tạo tài liệu (F12.5, F12.6) → index lại riêng tài liệu đó.
**Hoàn thành khi**:
- [ ] Duyệt revision → vài giây sau "Index cuối" của tài liệu cập nhật

### F18.5 — Tìm kiếm ngữ nghĩa
**Làm gì**: `searchDocs(projectId, query, k)`: embed câu hỏi → cosine similarity trên `DocChunk` của dự án, gộp theo doc, trả đoạn khớp nhất; nếu chưa index hoặc lỗi API → rơi về tìm từ khoá. Dùng cho `docs_search` (F16.5); cân nhắc dùng cho ô tìm kiếm header (F14.2).
**Hoàn thành khi**:
- [ ] Hỏi "ngưỡng p95 của bộ lọc" ra PRD Listing v3 dù không trùng từ khoá chính xác

### F18.6 — Agent đã đọc
**Làm gì**: "Agent đã đọc" = các agent đã gọi `docs.read` trên tài liệu (từ `McpLogEntry`). Bỏ cột `Doc.readBy` (migration + seed chuyển dữ liệu mẫu thành log `docs.read` cũ).
**Hoàn thành khi**:
- [ ] Agent đọc tài liệu qua MCP → tên xuất hiện trong ô "Agent đã đọc"

## Quyết định / ghi chú
- 2026-10-14: người dùng chọn **hoãn** phần embedding. Trong lúc hoãn, `docs_search` (F16.5) dùng tìm theo từ khoá; nút "Index lại" giữ nguyên là giao diện. F18.6 không cần embedding — có thể làm riêng khi F16.5 xong.
- Production dùng Neon (ADR-015), Neon hỗ trợ `pgvector` → khi làm lại F18 không phải đổi database.
- Ưu tiên phương án miễn phí/rẻ khi chọn embedding (theo định hướng "chủ yếu là free" của người dùng).
