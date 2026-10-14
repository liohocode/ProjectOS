# FXX — <Tên feature>

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Chưa bắt đầu | <n> | <FYY, …> | <FR-…, NFR-…> |

## Mục tiêu
<1–3 câu: feature này giải quyết gì cho người dùng / cho codebase.>

## Phạm vi
- **Trong phạm vi**: …
- **Ngoài phạm vi**: … (ghi rõ feature nào làm phần đó)

## Tham chiếu
- `docs/design/design-reference.md` → mục "…"
- `docs/product/requirements.md` → FR-…
- Code liên quan: `…`

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| FXX.1 | … | S | — | Chưa làm |

Cỡ: **S** ≤ 2 giờ · **M** ~ nửa ngày · **L** ≥ 1 ngày (nên tách nhỏ trước khi làm).
Trạng thái: `Chưa làm` · `Đang làm — <agent>, <YYYY-MM-DD>` · `Xong — <commit>` · `Chặn — <lý do>`.

### FXX.1 — <tiêu đề>
**Làm gì**: <mô tả đủ để agent khác làm mà không cần hỏi lại>
**File**: `<file sẽ tạo/sửa>`
**Hoàn thành khi**:
- [ ] <tiêu chí kiểm chứng được>
- [ ] `npm run build` + `npm run lint` sạch (và `npm test` khi F08 xong)

## Quyết định / ghi chú
<Ghi lại quyết định phát sinh khi làm, lệch so với spec, việc mới phát hiện (thêm thành task mới thay vì làm lấn phạm vi).>
