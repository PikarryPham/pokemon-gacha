import { handler, readJson } from "@/lib/api";
import { getDb } from "@/lib/db";
import { changePasswordSchema } from "@/lib/schemas";
import { requireUser } from "@/lib/session";
import { changePassword } from "@/lib/users";

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const { currentPassword, newPassword } = changePasswordSchema.parse(await readJson(req));
  await changePassword(await getDb(), user.id, currentPassword, newPassword);
  return Response.json({ ok: true });
});
