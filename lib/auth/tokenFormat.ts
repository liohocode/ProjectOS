import { createHash, randomBytes } from "node:crypto";

// Định dạng token agent (F15.5) — hàm thuần, không DB.
// Token = "mrd_" + 32 byte ngẫu nhiên (base64url, 43 ký tự). Entropy 256 bit → băm SHA-256 thẳng là đủ
// (không cần bcrypt/salt như mật khẩu người đặt: không thể dò từ điển), và tra theo hash bằng index unique.

export const AGENT_TOKEN_PREFIX = "mrd_";
const TOKEN_PATTERN = /^mrd_[A-Za-z0-9_-]{43}$/;

export function generateAgentToken(): string {
  return AGENT_TOKEN_PREFIX + randomBytes(32).toString("base64url");
}

export function hashAgentToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export const isAgentTokenFormat = (raw: string): boolean => TOKEN_PATTERN.test(raw);
