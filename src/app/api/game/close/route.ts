import { z } from "zod";
import { handler, readJson } from "@/lib/api";
import { getDb } from "@/lib/db";
import { closeBatch } from "@/lib/game";
import { requireUser } from "@/lib/session";

const bodySchema = z.object({ acceptBelowMin: z.boolean().default(false) });

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const { acceptBelowMin } = bodySchema.parse(await readJson(req));
  return Response.json(await closeBatch(await getDb(), user.id, acceptBelowMin));
});
