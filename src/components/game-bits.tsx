// Các mảnh UI dùng chung cho màn quay, tổng kết và lịch sử.
import { formatYen } from "@/lib/format";
import { groupBatch, type BatchView, type ItemView } from "@/lib/game-types";
import { BATCH_MAX_JPY, BATCH_MIN_JPY, MAX_BATCHES } from "@/lib/rules";

export function ItemIcon({ item, size = 48 }: { item: Pick<ItemView, "icon" | "color">; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-2xl shadow-inner"
      style={{ width: size, height: size, background: item.color, fontSize: size * 0.55 }}
      aria-hidden
    >
      {item.icon}
    </span>
  );
}

export function BudgetBar({ total }: { total: number }) {
  const pct = Math.min(total / BATCH_MAX_JPY, 1) * 100;
  const minPct = (BATCH_MIN_JPY / BATCH_MAX_JPY) * 100;
  const reached = total >= BATCH_MIN_JPY;
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink/50">Tổng batch</p>
          <p className={`text-4xl font-black tabular-nums ${reached ? "text-emerald-600" : "text-ink"}`}>{formatYen(total)}</p>
        </div>
        <p className="text-right text-sm text-ink/60">
          {reached ? (
            <>
              ✅ Đã đủ tối thiểu
              <br />
              <span className="text-xs">Còn tối đa {formatYen(BATCH_MAX_JPY - 1 - total)} nếu quay tiếp</span>
            </>
          ) : (
            <>
              Còn thiếu <b className="text-ink">{formatYen(BATCH_MIN_JPY - total)}</b>
              <br />
              <span className="text-xs">để đạt tối thiểu {formatYen(BATCH_MIN_JPY)}</span>
            </>
          )}
        </p>
      </div>
      <div className="relative mt-3 h-5 overflow-hidden rounded-full bg-ink/10">
        <div
          className="absolute inset-y-0 left-0 bg-emerald-100"
          style={{ left: `${minPct}%`, right: 0 }}
          title="Vùng hợp lệ: 3000¥ – dưới 5000¥"
        />
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out ${reached ? "bg-emerald-500" : "bg-poke-yellow"}`}
          style={{ width: `${pct}%` }}
        />
        <div className="absolute inset-y-0 w-0.5 bg-ink/40" style={{ left: `${minPct}%` }} />
      </div>
      <div className="relative mt-1 h-4 text-[11px] font-bold text-ink/50">
        <span className="absolute left-0">¥0</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${minPct}%` }}>
          {formatYen(BATCH_MIN_JPY)} tối thiểu
        </span>
        <span className="absolute right-0">&lt; {formatYen(BATCH_MAX_JPY)}</span>
      </div>
    </div>
  );
}

export function BatchStepper({ batches }: { batches: BatchView[] }) {
  return (
    <ol className="grid grid-cols-3 gap-2">
      {Array.from({ length: MAX_BATCHES }, (_, i) => {
        const b = batches.find((x) => x.idx === i + 1);
        const state = !b ? "locked" : b.status;
        const styles = {
          locked: "bg-ink/5 text-ink/40",
          open: "bg-poke-red text-white shadow-md",
          completed: "bg-emerald-100 text-emerald-800",
          closed_early: "bg-amber-100 text-amber-800",
        }[state];
        const label = { locked: "🔒 Chưa mở", open: "▶ Đang quay", completed: "✅ Đã chốt", closed_early: "⏹ Dừng sớm" }[state];
        return (
          <li key={i} className={`rounded-2xl px-3 py-2 text-center ${styles}`}>
            <p className="text-xs font-extrabold uppercase tracking-wide">Batch {i + 1}</p>
            <p className="text-sm font-bold">{label}</p>
            {b && b.status !== "open" && <p className="text-xs font-bold opacity-80">{formatYen(b.totalJpy)}</p>}
          </li>
        );
      })}
    </ol>
  );
}

export function BatchStatusBadge({ status }: { status: BatchView["status"] }) {
  if (status === "completed")
    return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800">✅ Đủ điều kiện</span>;
  if (status === "closed_early")
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-800">
        ⏹ Dừng sớm · chưa đủ {formatYen(BATCH_MIN_JPY)}
      </span>
    );
  return <span className="rounded-full bg-poke-red/10 px-2.5 py-0.5 text-xs font-extrabold text-poke-red">▶ Đang quay</span>;
}

/** Bảng tổng kết một batch: số lượng, tên, đơn giá, thành tiền, tổng. */
export function BatchTable({ batch, items, showLinks = false }: { batch: BatchView; items: ItemView[]; showLinks?: boolean }) {
  const lines = groupBatch(batch, items);
  if (lines.length === 0) return <p className="py-6 text-center text-sm text-ink/50">Chưa có lần quay nào.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wide text-ink/50">
          <th className="py-2 pr-2 font-extrabold">Item</th>
          <th className="px-1 py-2 text-center font-extrabold">SL</th>
          <th className="px-1 py-2 text-right font-extrabold">Đơn giá</th>
          <th className="py-2 pl-1 text-right font-extrabold">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        {lines.map(({ item, count, subtotal }) => (
          <tr key={item.id} className="border-b border-ink/5 align-middle">
            <td className="py-2 pr-2">
              <div className="flex items-center gap-2">
                <ItemIcon item={item} size={30} />
                {showLinks ? (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-bold leading-tight text-poke-blue hover:underline">
                    {item.name} ↗
                  </a>
                ) : (
                  <span className="font-bold leading-tight">{item.name}</span>
                )}
              </div>
            </td>
            <td className="px-1 py-2 text-center font-black">×{count}</td>
            <td className="px-1 py-2 text-right tabular-nums text-ink/70">{formatYen(item.priceJpy)}</td>
            <td className="py-2 pl-1 text-right font-bold tabular-nums">{formatYen(subtotal)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={3} className="pt-3 text-right font-extrabold">
            Tổng ({batch.spins.length} món)
          </td>
          <td className="pt-3 text-right text-lg font-black tabular-nums text-poke-red">{formatYen(batch.totalJpy)}</td>
        </tr>
      </tfoot>
    </table>
  );
}
