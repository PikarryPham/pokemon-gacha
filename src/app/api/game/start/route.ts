import { handler, readJson } from "@/lib/api";
import { getDb } from "@/lib/db";
import { startGame } from "@/lib/game";
import { requireUser } from "@/lib/session";

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const body = (await readJson(req)) as { items?: unknown };
  return Response.json(await startGame(await getDb(), user.id, body.items));
});
