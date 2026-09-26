// Luật chơi dùng chung cho client và server. Mọi con số "ma thuật" nằm ở đây.

export const CATEGORIES = ["Pokemon Center", "Pokemon Starbucks Collab"] as const;
export type Category = (typeof CATEGORIES)[number];

export const MIN_ITEMS = 1;
export const MAX_ITEMS = 20;

/** Tổng batch phải >= mức này mới được "chốt" bình thường. */
export const BATCH_MIN_JPY = 3000;
/** Tổng batch phải NHỎ HƠN mức này (không bao giờ chạm tới). */
export const BATCH_MAX_JPY = 5000;
export const MAX_BATCHES = 3;

/** Item đắt hơn mức này không bao giờ quay trúng được, nên chặn từ lúc nhập. */
export const MAX_ITEM_PRICE = BATCH_MAX_JPY - 1;
export const MAX_QUANTITY = 99;

/** Item còn quay được nếu cộng vào vẫn nhỏ hơn giới hạn batch. Item không giới hạn số lần trúng. */
export function fitsBudget(priceJpy: number, batchTotal: number): boolean {
  return batchTotal + priceJpy < BATCH_MAX_JPY;
}

/** Số lần trúng của từng item trong một batch. */
export type UsedCounts = ReadonlyMap<number, number>;

export function countUsed(spins: { itemId: number }[]): Map<number, number> {
  const used = new Map<number, number>();
  for (const s of spins) used.set(s.itemId, (used.get(s.itemId) ?? 0) + 1);
  return used;
}

type StockItem = { id: number; priceJpy: number; quantity: number };

/** Số lượng còn lại trong batch hiện tại. Số lượng reset về đầy đủ ở mỗi batch mới. */
export function remainingQty(item: StockItem, used: UsedCounts): number {
  return Math.max(0, item.quantity - (used.get(item.id) ?? 0));
}

/** Item còn quay được: còn số lượng trong batch VÀ cộng vào vẫn nhỏ hơn giới hạn batch. */
export function isEligible(item: StockItem, batchTotal: number, used: UsedCounts): boolean {
  return remainingQty(item, used) > 0 && fitsBudget(item.priceJpy, batchTotal);
}

export function eligibleItems<T extends StockItem>(items: T[], batchTotal: number, used: UsedCounts): T[] {
  return items.filter((i) => isEligible(i, batchTotal, used));
}

/** Tổng số "phiếu" trong pool: mỗi đơn vị còn lại là một phiếu. */
export function ticketCount(pool: StockItem[], used: UsedCounts): number {
  return pool.reduce((sum, i) => sum + remainingQty(i, used), 0);
}

/**
 * Chọn item theo phiếu thứ `ticket` (0 ≤ ticket < ticketCount): item còn nhiều số lượng
 * thì có nhiều phiếu hơn, nên cơ hội trúng tỉ lệ với số lượng còn lại.
 */
export function itemAtTicket<T extends StockItem>(pool: T[], used: UsedCounts, ticket: number): T {
  let t = ticket;
  for (const item of pool) {
    t -= remainingQty(item, used);
    if (t < 0) return item;
  }
  throw new RangeError(`ticket ${ticket} out of range`);
}

export interface BatchProgress {
  reachedMin: boolean;
  canSpin: boolean;
  /** Đủ >= 3000¥, được chốt bình thường. */
  canCommit: boolean;
  /** Chưa đủ 3000¥ nhưng đã quay ít nhất 1 lần, được dừng sớm (cần xác nhận). */
  canStopEarly: boolean;
  /** Chưa đủ 3000¥ mà không còn item nào quay được (hết số lượng hoặc vượt ngân sách): chỉ còn cách dừng sớm. */
  mustStopEarly: boolean;
}

export function batchProgress(total: number, spinCount: number, eligibleCount: number): BatchProgress {
  const reachedMin = total >= BATCH_MIN_JPY;
  const canSpin = eligibleCount > 0;
  return {
    reachedMin,
    canSpin,
    canCommit: reachedMin && spinCount > 0,
    canStopEarly: !reachedMin && spinCount > 0,
    mustStopEarly: !reachedMin && spinCount > 0 && !canSpin,
  };
}
