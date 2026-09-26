"use server";

import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { getDb } from "@/lib/db";
import { AppError, zodMessage } from "@/lib/errors";
import { loginSchema, registerSchema } from "@/lib/schemas";
import { createSession } from "@/lib/session";
import { authenticate, registerUser } from "@/lib/users";

// Server Actions: form vẫn gửi đúng (POST) kể cả khi JS chưa tải xong, mật khẩu không bao giờ lên URL.

export interface AuthState {
  error?: string;
  /** Giá trị đã nhập (trừ mật khẩu) để điền lại form khi có lỗi. */
  values?: Record<string, string>;
}

function messageOf(err: unknown): string {
  if (err instanceof AppError) return err.message;
  if (err instanceof ZodError) return zodMessage(err);
  console.error(err);
  return "Có lỗi xảy ra, vui lòng thử lại";
}

const field = (f: FormData, k: string) => String(f.get(k) ?? "");

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const identifier = field(formData, "identifier");
  try {
    const input = loginSchema.parse({ identifier, password: field(formData, "password") });
    const user = await authenticate(await getDb(), input.identifier, input.password);
    await createSession(user.id);
  } catch (err) {
    return { error: messageOf(err), values: { identifier } };
  }
  redirect("/");
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const values = { username: field(formData, "username"), email: field(formData, "email") };
  if (field(formData, "password") !== field(formData, "confirm")) {
    return { error: "Mật khẩu nhập lại không khớp", values };
  }
  let username: string;
  try {
    const input = registerSchema.parse({ ...values, password: field(formData, "password") });
    username = (await registerUser(await getDb(), input)).username;
  } catch (err) {
    return { error: messageOf(err), values };
  }
  // Đăng ký xong chuyển sang màn đăng nhập, điền sẵn username.
  redirect(`/login?registered=${encodeURIComponent(username)}`);
}
