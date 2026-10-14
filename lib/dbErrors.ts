// Nhận diện lỗi mất kết nối database và chuẩn hoá thành một lỗi có message rõ ràng,
// để error boundary (components/ui/ErrorState.tsx) hướng dẫn được người dùng.
// Prisma 7 + driver adapter để mã lỗi ở thuộc tính `code` (vd "ECONNREFUSED"), message
// chỉ là "Invalid `prisma.x.findMany()` invocation…" và `code` không đi qua ranh giới server → client.

const CONNECTION_CODES = new Set(["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET", "P1001", "P1002", "P1017"]);

export const DB_UNAVAILABLE_MESSAGE = "DB_UNAVAILABLE: không kết nối được database";

export function isDatabaseConnectionError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 4; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && CONNECTION_CODES.has(code)) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

export class DatabaseUnavailableError extends Error {
  constructor(cause: unknown) {
    super(DB_UNAVAILABLE_MESSAGE, { cause });
    this.name = "DatabaseUnavailableError";
  }
}
