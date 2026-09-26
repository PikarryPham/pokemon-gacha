import { z } from "zod";
import { handler, readJson } from "@/lib/api";
import { getDb } from "@/lib/db";
import { chooseBatch } from "@/lib/game";
import { requireUser } from "@/lib/session";

const bodySchema = z.object({ batchId: z.number().int().positive() });

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const { batchId } = bodySchema.parse(await readJson(req));
  return Response.json(await chooseBatch(await getDb(), user.id, batchId));
});
