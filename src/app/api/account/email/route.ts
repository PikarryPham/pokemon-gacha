import { handler, readJson } from "@/lib/api";
import { getDb } from "@/lib/db";
import { updateEmailSchema } from "@/lib/schemas";
import { requireUser } from "@/lib/session";
import { updateEmail } from "@/lib/users";

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const { email } = updateEmailSchema.parse(await readJson(req));
  const updated = await updateEmail(await getDb(), user.id, email);
  return Response.json({ email: updated.email });
});
