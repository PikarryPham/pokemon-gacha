import { ZodError } from "zod";

/** Lỗi nghiệp vụ, message hiển thị thẳng cho người dùng. */
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Postgres unique violation (23505); drizzle có thể bọc lỗi gốc trong `cause`. */
export function isUniqueViolation(err: unknown): boolean {
  for (let e: unknown = err; e && typeof e === "object"; e = (e as { cause?: unknown }).cause) {
    if ((e as { code?: unknown }).code === "23505") return true;
  }
  return false;
}

export function zodMessage(err: ZodError): string {
  return err.issues[0]?.message ?? "Dữ liệu không hợp lệ";
}
