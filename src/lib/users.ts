import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { DB } from "./db";
import { users } from "./db/schema";
import { AppError, isUniqueViolation } from "./errors";

const BCRYPT_ROUNDS = 10;
// Hash giả để so sánh khi không tìm thấy user, tránh lộ qua thời gian phản hồi.
const DUMMY_HASH = bcrypt.hashSync("dummy-password", BCRYPT_ROUNDS);

export interface PublicUser {
  id: number;
  username: string;
  email: string | null;
  createdAt: Date;
}

function toPublic(u: typeof users.$inferSelect): PublicUser {
  return { id: u.id, username: u.username, email: u.email, createdAt: u.createdAt };
}

export async function registerUser(
  db: DB,
  input: { username: string; email: string | null; password: string },
): Promise<PublicUser> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  try {
    const [row] = await db
      .insert(users)
      .values({
        username: input.username,
        usernameKey: input.username.toLowerCase(),
        email: input.email,
        passwordHash,
      })
      .returning();
    return toPublic(row);
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError(409, "Tên tài khoản hoặc email đã được sử dụng");
    throw err;
  }
}

/** Đăng nhập bằng username hoặc email (chứa "@"). */
export async function authenticate(db: DB, identifier: string, password: string): Promise<PublicUser> {
  const key = identifier.trim().toLowerCase();
  const [row] = await db
    .select()
    .from(users)
    .where(key.includes("@") ? eq(users.email, key) : eq(users.usernameKey, key));
  const ok = await bcrypt.compare(password, row?.passwordHash ?? DUMMY_HASH);
  if (!row || !ok) throw new AppError(401, "Sai tên tài khoản/email hoặc mật khẩu");
  return toPublic(row);
}

export async function findUser(db: DB, id: number): Promise<PublicUser | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row ? toPublic(row) : null;
}

export async function changePassword(db: DB, id: number, currentPassword: string, newPassword: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  if (!row) throw new AppError(401, "Phiên đăng nhập không hợp lệ");
  if (!(await bcrypt.compare(currentPassword, row.passwordHash))) {
    throw new AppError(400, "Mật khẩu hiện tại không đúng");
  }
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await db.update(users).set({ passwordHash }).where(eq(users.id, id));
}

export async function updateEmail(db: DB, id: number, email: string | null): Promise<PublicUser> {
  try {
    const [row] = await db.update(users).set({ email }).where(eq(users.id, id)).returning();
    return toPublic(row);
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError(409, "Email đã được tài khoản khác sử dụng");
    throw err;
  }
}
