import { randomInt } from "node:crypto";
import { and, asc, eq, inArray, max } from "drizzle-orm";
import type { DB } from "./db";
import { batches, games, items, spins } from "./db/schema";
import { AppError, isUniqueViolation } from "./errors";
import type { GameView, SpinView } from "./game-types";
import { assignIcons } from "./icons";
import { BATCH_MIN_JPY, countUsed, eligibleItems, itemAtTicket, MAX_BATCHES, ticketCount } from "./rules";
import { itemListSchema } from "./schemas";

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

export async function getGameView(db: DB, userId: number): Promise<GameView> {
  const [game] = await db.select().from(games).where(eq(games.userId, userId));
  if (!game) {
    return { status: "setup", items: [], batches: [], chosenBatchId: null, remainingBatches: MAX_BATCHES };
  }

  const itemRows = await db.select().from(items).where(eq(items.gameId, game.id)).orderBy(asc(items.position));
  const batchRows = await db.select().from(batches).where(eq(batches.gameId, game.id)).orderBy(asc(batches.idx));
  const spinRows = batchRows.length
    ? await db
        .select()
        .from(spins)
        .where(inArray(spins.batchId, batchRows.map((b) => b.id)))
        .orderBy(asc(spins.seq))
    : [];

  return {
    status: game.status,
    items: itemRows.map(({ id, name, priceJpy, category, url, quantity, icon, color }) => ({
      id, name, priceJpy, category, url, quantity, icon, color,
    })),
    batches: batchRows.map((b) => ({
      id: b.id,
      idx: b.idx,
      status: b.status,
      totalJpy: b.totalJpy,
      spins: spinRows
        .filter((s) => s.batchId === b.id)
        .map(({ id, itemId, priceJpy, seq }) => ({ id, itemId, priceJpy, seq })),
    })),
    chosenBatchId: game.chosenBatchId,
    remainingBatches: MAX_BATCHES - batchRows.filter((b) => b.status !== "open").length,
  };
}

/** Lưu danh sách item lần đầu và mở batch 1. Sau bước này danh sách bị khóa. */
const ALREADY_STARTED = "Bạn đã bắt đầu lượt chơi rồi, không thể nhập lại danh sách";

export async function startGame(db: DB, userId: number, input: unknown): Promise<GameView> {
  const [existing] = await db.select({ id: games.id }).from(games).where(eq(games.userId, userId));
  if (existing) throw new AppError(409, ALREADY_STARTED);
  const list = itemListSchema.parse(input);
  const looks = assignIcons(list.length);
  try {
    await db.transaction(async (tx) => {
      const [game] = await tx.insert(games).values({ userId, status: "playing" }).returning();
      await tx.insert(items).values(list.map((it, i) => ({ ...it, gameId: game.id, position: i, ...looks[i] })));
      await tx.insert(batches).values({ gameId: game.id, idx: 1, status: "open" });
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError(409, ALREADY_STARTED);
    throw err;
  }
  return getGameView(db, userId);
}

/** Khóa dòng game của user để các thao tác đồng thời (bấm đúp, nhiều tab) chạy tuần tự. */
async function lockPlayingGame(tx: Tx, userId: number) {
  const [game] = await tx.select().from(games).where(eq(games.userId, userId)).for("update");
  if (!game) throw new AppError(409, "Bạn chưa nhập danh sách item");
  if (game.status !== "playing") throw new AppError(409, "Bạn đã chơi hết 3 batch");
  const [batch] = await tx
    .select()
    .from(batches)
    .where(and(eq(batches.gameId, game.id), eq(batches.status, "open")));
  if (!batch) throw new Error(`Game ${game.id} is playing but has no open batch`);
  return { game, batch };
}

export interface SpinOptions {
  /** Trả về số nguyên trong [0, n) (chỉ số phiếu). Mặc định dùng crypto để kết quả không đoán trước được. */
  pick?: (n: number) => number;
}

/**
 * Server quyết định kết quả và lưu ngay, nên F5 không đổi được kết quả và thoát ra vẫn chơi tiếp được.
 * Mỗi đơn vị số lượng còn lại trong batch là một phiếu, bốc ngẫu nhiên một phiếu.
 */
export async function spin(db: DB, userId: number, opts: SpinOptions = {}): Promise<{ view: GameView; spin: SpinView }> {
  const pick = opts.pick ?? ((n: number) => randomInt(n));
  const result = await db.transaction(async (tx) => {
    const { game, batch } = await lockPlayingGame(tx, userId);
    const itemRows = await tx.select().from(items).where(eq(items.gameId, game.id));
    const batchSpins = await tx.select({ itemId: spins.itemId }).from(spins).where(eq(spins.batchId, batch.id));
    const used = countUsed(batchSpins);
    const pool = eligibleItems(itemRows, batch.totalJpy, used);
    if (pool.length === 0) {
      throw new AppError(409, "Không còn item nào quay được trong batch này (hết số lượng hoặc vượt ngân sách). Hãy chốt hoặc dừng batch.");
    }
    const chosen = itemAtTicket(pool, used, pick(ticketCount(pool, used)));
    const [row] = await tx
      .insert(spins)
      .values({ batchId: batch.id, itemId: chosen.id, priceJpy: chosen.priceJpy, seq: batchSpins.length + 1 })
      .returning();
    await tx
      .update(batches)
      .set({ totalJpy: batch.totalJpy + chosen.priceJpy })
      .where(eq(batches.id, batch.id));
    return { id: row.id, itemId: row.itemId, priceJpy: row.priceJpy, seq: row.seq };
  });
  return { view: await getGameView(db, userId), spin: result };
}

/**
 * Kết thúc batch hiện tại. Đủ >= 3000¥ thì "completed"; chưa đủ thì chỉ đóng được khi
 * người dùng xác nhận (`acceptBelowMin`) và batch thành "closed_early".
 */
export async function closeBatch(db: DB, userId: number, acceptBelowMin: boolean): Promise<GameView> {
  await db.transaction(async (tx) => {
    const { game, batch } = await lockPlayingGame(tx, userId);
    const [{ last }] = await tx.select({ last: max(spins.seq) }).from(spins).where(eq(spins.batchId, batch.id));
    if (!last) throw new AppError(409, "Hãy quay ít nhất 1 lần trước khi kết thúc batch");

    const reached = batch.totalJpy >= BATCH_MIN_JPY;
    if (!reached && !acceptBelowMin) {
      throw new AppError(409, `Batch chưa đủ ${BATCH_MIN_JPY}¥. Hãy xác nhận dừng sớm nếu muốn sang batch kế tiếp.`);
    }
    await tx
      .update(batches)
      .set({ status: reached ? "completed" : "closed_early", closedAt: new Date() })
      .where(eq(batches.id, batch.id));

    if (batch.idx < MAX_BATCHES) {
      await tx.insert(batches).values({ gameId: game.id, idx: batch.idx + 1, status: "open" });
    } else {
      await tx.update(games).set({ status: "choosing" }).where(eq(games.id, game.id));
    }
  });
  return getGameView(db, userId);
}

/** Chọn 1 trong 3 batch và kết thúc lượt chơi vĩnh viễn. */
export async function chooseBatch(db: DB, userId: number, batchId: number): Promise<GameView> {
  await db.transaction(async (tx) => {
    const [game] = await tx.select().from(games).where(eq(games.userId, userId)).for("update");
    if (game?.status === "finished") throw new AppError(409, "Bạn đã chọn batch và kết thúc lượt chơi");
    if (game?.status !== "choosing") throw new AppError(409, "Chưa đến bước chọn batch");
    const [batch] = await tx
      .select()
      .from(batches)
      .where(and(eq(batches.id, batchId), eq(batches.gameId, game.id)));
    if (!batch) throw new AppError(404, "Không tìm thấy batch");
    await tx
      .update(games)
      .set({ status: "finished", chosenBatchId: batch.id, finishedAt: new Date() })
      .where(eq(games.id, game.id));
  });
  return getGameView(db, userId);
}
