import type { DocRevision, MemberKind, ProposedFeature, ProposedTask } from "@/lib/types";

// Inbox "Cần tôi xử lý" (F25.2) — hàm thuần: phần nào của inbox người dùng thấy, theo quyền (F15.4).
// Ai cũng thấy task bị block; revision / task Review / feature đề xuất chỉ hiện cho người có quyền duyệt tương ứng.

export interface InboxCounts {
  revisions: number;
  reviewTasks: number;
  proposals: number;
  blockedTasks: number;
}

export interface InboxScope {
  revisions: boolean;
  reviewTasks: boolean;
  proposals: boolean;
  blockedTasks: boolean;
}

export function inboxScope(perms: { "doc.review": boolean; "task.review": boolean; "feature.review": boolean }): InboxScope {
  return { revisions: perms["doc.review"], reviewTasks: perms["task.review"], proposals: perms["feature.review"], blockedTasks: true };
}

/** Số việc trong inbox — badge ở sidebar. */
export function inboxTotal(counts: InboxCounts, scope: InboxScope): number {
  return (Object.keys(counts) as (keyof InboxCounts)[]).reduce((sum, key) => sum + (scope[key] ? counts[key] : 0), 0);
}

export interface InboxRevision extends DocRevision {
  docId: string;
  docTitle: string;
}

export interface InboxTask {
  id: string;
  title: string;
  featureId: string;
  featureName: string;
  who: string;
  kind: MemberKind;
  /** Task bị block: lý do ngắn */
  blocked?: string;
  /** Task Review: lần cuối chuyển sang Review (F22.1) — task cũ không có lịch sử thì trống */
  since?: string;
}

export interface Inbox {
  revisions: InboxRevision[];
  reviewTasks: InboxTask[];
  proposals: ProposedFeature[];
  /** Task agent đề xuất (F24.2) — cùng quyền `feature.review`, đếm chung vào `proposals` */
  taskProposals: ProposedTask[];
  blockedTasks: InboxTask[];
}
