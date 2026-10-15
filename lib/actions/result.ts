// Kết quả trả về của server action. Lỗi nghiệp vụ (input sai, không tìm thấy, vi phạm ràng buộc)
// trả { ok: false } để UI hiện thông báo; chỉ lỗi bất ngờ (mất DB, bug) mới throw → error boundary.
export type ActionResult = { ok: true } | { ok: false; error: string };

export const ok = (): ActionResult => ({ ok: true });
export const fail = (error: string): ActionResult => ({ ok: false, error });
