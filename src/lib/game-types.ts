// Kiểu dữ liệu trạng thái game gửi xuống client (không import gì phía server).
import type { Category } from "./rules";

export type GameStatus = "setup" | "playing" | "choosing" | "finished";
export type BatchStatus = "open" | "completed" | "closed_early";

export interface ItemView {
  id: number;
  name: string;
  priceJpy: number;
  category: Category;
  url: string;
  quantity: number;
  icon: string;
  color: string;
}

export interface SpinView {
  id: number;
  itemId: number;
  priceJpy: number;
  seq: number;
}

export interface BatchView {
  id: number;
  idx: number;
  status: BatchStatus;
  totalJpy: number;
  spins: SpinView[];
}

export interface GameView {
  status: GameStatus;
  items: ItemView[];
  batches: BatchView[];
  chosenBatchId: number | null;
  /** Số batch chưa chốt (tính cả batch đang chơi). */
  remainingBatches: number;
}

/** Trang tương ứng với từng trạng thái. */
export const STATUS_PATH: Record<GameStatus, string> = {
  setup: "/setup",
  playing: "/play",
  choosing: "/summary",
  finished: "/history",
};

export interface BatchLine {
  item: ItemView;
  count: number;
  subtotal: number;
}

/** Gom các lần quay theo item (giữ thứ tự lần trúng đầu tiên) cho bảng tổng kết. */
export function groupBatch(batch: BatchView, items: ItemView[]): BatchLine[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const lines = new Map<number, BatchLine>();
  for (const s of batch.spins) {
    const item = byId.get(s.itemId);
    if (!item) continue;
    const line = lines.get(s.itemId) ?? { item, count: 0, subtotal: 0 };
    line.count += 1;
    line.subtotal += s.priceJpy;
    lines.set(s.itemId, line);
  }
  return [...lines.values()];
}
