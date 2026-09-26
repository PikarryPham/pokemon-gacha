import { ZodError } from "zod";
import { AppError, zodMessage } from "./errors";

/** Bọc route handler: đổi AppError/ZodError thành JSON `{ error }` với status tương ứng. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof AppError) return Response.json({ error: err.message }, { status: err.status });
      if (err instanceof ZodError) return Response.json({ error: zodMessage(err) }, { status: 400 });
      console.error(err);
      return Response.json({ error: "Có lỗi xảy ra, vui lòng thử lại" }, { status: 500 });
    }
  };
}

/**
 * Đọc body JSON. Bắt buộc Content-Type JSON: form cross-site không gửi được kiểu này
 * nếu không qua CORS preflight, nên đây là lớp chống CSRF đơn giản (cùng cookie SameSite=Lax).
 */
export async function readJson(req: Request): Promise<unknown> {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    throw new AppError(415, "Yêu cầu phải là JSON");
  }
  try {
    return await req.json();
  } catch {
    throw new AppError(400, "JSON không hợp lệ");
  }
}
