import { cache } from "react";
import { redirect } from "next/navigation";
import { getMemberById } from "@/lib/data/team";
import type { Member } from "@/lib/types";
import { getSessionMemberId } from "./session";

// Điểm duy nhất xác định "ai đang thao tác" (ADR-011 → F15.3): đọc từ session Better Auth.
// proxy.ts chỉ kiểm tra cookie có tồn tại (nhanh, không đọc DB) — kiểm tra thật nằm ở đây,
// nên page/layout/server action gọi hàm này đều được bảo vệ kể cả khi proxy bị vượt qua.

export const getCurrentUserId = cache(async (): Promise<string> => {
  const memberId = await getSessionMemberId();
  if (!memberId) redirect("/login");
  return memberId;
});

export const getCurrentUser = cache(async (): Promise<Member> => {
  const id = await getCurrentUserId();
  const member = await getMemberById(id);
  // Member bị xoá sau khi đăng nhập (AuthUser cascade theo) → coi như chưa đăng nhập.
  if (!member) redirect("/login");
  return member;
});
