import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Mã hoá API key lưu trong DB (F29.2, ADR-025): AES-256-GCM, IV 12 byte ngẫu nhiên mỗi bản ghi + auth tag 16 byte.
// Khoá chủ 32 byte từ biến môi trường MERIDIAN_ENCRYPTION_KEY (base64) — production nạp từ Secret Manager.
// Chỉ dùng ở server; không bao giờ log bản rõ.

export const ENCRYPTION_KEY_ENV = "MERIDIAN_ENCRYPTION_KEY";
/** Tăng khi xoay khoá chủ — bản ghi cũ giữ version cũ để mã hoá lại dần. */
export const CURRENT_KEY_VERSION = 1;

export interface SealedSecret {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

/** Khoá chủ hợp lệ (32 byte sau khi giải base64) hoặc null nếu thiếu / sai. Thuần — nhận giá trị env. */
export function parseMasterKey(raw: string | undefined): Buffer | null {
  if (!raw) return null;
  const key = Buffer.from(raw.trim(), "base64");
  return key.length === 32 ? key : null;
}

export function masterKeyFromEnv(): Buffer | null {
  return parseMasterKey(process.env[ENCRYPTION_KEY_ENV]);
}

export function seal(plain: string, key: Buffer): SealedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), authTag: cipher.getAuthTag().toString("base64"), keyVersion: CURRENT_KEY_VERSION };
}

/** Giải mã; sai khoá / dữ liệu bị sửa → ném lỗi (GCM kiểm auth tag). */
export function open(sealed: Pick<SealedSecret, "ciphertext" | "iv" | "authTag">, key: Buffer): string {
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(sealed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(sealed.authTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(sealed.ciphertext, "base64")), decipher.final()]).toString("utf8");
}

/** 4 ký tự cuối để nhận diện key (không đủ để đoán key). */
export const keyHint = (plain: string) => plain.trim().slice(-4);
