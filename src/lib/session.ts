import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { getDb } from "./db";
import { AppError } from "./errors";
import { findUser, type PublicUser } from "./users";

const COOKIE = "pg_session";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET chưa được cấu hình");
    return new TextEncoder().encode("dev-only-secret-do-not-use-in-production");
  }
  return new TextEncoder().encode(value);
}

export async function createSession(userId: number) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

async function getSessionUserId(): Promise<number | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    return Number.isInteger(id) ? id : null;
  } catch {
    return null;
  }
}

/** User đang đăng nhập (đã kiểm tra còn tồn tại trong DB), hoặc null. */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const id = await getSessionUserId();
  if (id === null) return null;
  return findUser(await getDb(), id);
}

export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError(401, "Bạn cần đăng nhập lại");
  return user;
}
