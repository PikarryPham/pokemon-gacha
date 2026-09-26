import { handler } from "@/lib/api";
import { getDb } from "@/lib/db";
import { spin } from "@/lib/game";
import { requireUser } from "@/lib/session";

export const POST = handler(async (req: Request) => {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ error: "Yêu cầu phải là JSON" }, { status: 415 });
  }
  const user = await requireUser();
  return Response.json(await spin(await getDb(), user.id));
});
