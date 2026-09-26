import { handler } from "@/lib/api";
import { destroySession } from "@/lib/session";

export const POST = handler(async () => {
  await destroySession();
  return Response.json({ ok: true });
});
