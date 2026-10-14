import type { CommandResult, SessionResult } from "@/lib/types";

// Prisma enum (tên identifier ASCII, @map giữ giá trị DB tiếng Việt) → chuỗi
// hiển thị dùng trong lib/types. Chiều ngược lại nằm ở prisma/seed.ts.
export const SESSION_RESULT_LABEL: Record<string, SessionResult> = {
  Xong: "Xong",
  DangChay: "Đang chạy",
  ChoReview: "Chờ review",
  BiChan: "Bị chặn",
};

export const COMMAND_RESULT_LABEL: Record<string, CommandResult> = {
  OK: "OK",
  ChoReview: "Chờ review",
  BiChan: "Bị chặn",
};
