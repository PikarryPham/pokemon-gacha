import { handler } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getGameView } from "@/lib/game";
import { requireUser } from "@/lib/session";

export const GET = handler(async () => {
  const user = await requireUser();
  return Response.json(await getGameView(await getDb(), user.id));
});
