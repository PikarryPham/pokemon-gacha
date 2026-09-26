import Link from "next/link";
import { BatchStatusBadge, BatchTable, ItemIcon } from "@/components/game-bits";
import { Card } from "@/components/ui";
import { formatYen } from "@/lib/format";
import type { BatchView, ItemView } from "@/lib/game-types";
import { loadGame } from "@/lib/page-guard";

export const metadata = { title: "Lịch sử · Poké Gacha Picker" };

export default async function HistoryPage() {
  const { view } = await loadGame();

  if (view.status === "setup") {
    return (
      <Card className="mx-auto max-w-md text-center">
        <div className="mb-2 text-5xl">📜</div>
        <h1 className="text-2xl font-black">Chưa có lịch sử</h1>
        <p className="mt-1 text-ink/60">Bạn chưa bắt đầu lượt quay nào.</p>
        <Link href="/setup" className="mt-4 inline-block rounded-2xl bg-poke-red px-5 py-2.5 font-bold text-white">
          Nhập danh sách quà →
        </Link>
      </Card>
    );
  }

  const chosen = view.batches.find((b) => b.id === view.chosenBatchId);
  const others = view.batches.filter((b) => b.id !== view.chosenBatchId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-black">📜 Lịch sử quay</h1>

      {view.status !== "finished" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-poke-yellow/30 px-4 py-3">
          <p className="font-bold">
            {view.status === "playing" ? "Bạn đang chơi dở, vẫn còn batch chưa quay xong." : "Bạn đã quay xong 3 batch nhưng chưa chọn batch."}
          </p>
          <Link href="/" className="rounded-xl bg-ink px-4 py-2 text-sm font-bold text-white">
            Chơi tiếp →
          </Link>
        </div>
      )}

      {chosen && (
        <Card className="border-2 border-poke-yellow">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="text-4xl">🏆</span>
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wider text-poke-red">Batch bạn đã chọn</p>
              <h2 className="text-2xl font-black">
                Batch {chosen.idx} · {formatYen(chosen.totalJpy)}
              </h2>
            </div>
            <div className="ml-auto">
              <BatchStatusBadge status={chosen.status} />
            </div>
          </div>
          <BatchTable batch={chosen} items={view.items} showLinks />
          <p className="mt-3 text-xs text-ink/50">Bấm tên item để mở trang bán.</p>
        </Card>
      )}

      {others.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-extrabold">{chosen ? "Các batch khác" : "Các batch"}</h2>
          <div className="grid gap-5 lg:grid-cols-3">
            {others.map((b) => (
              <Card key={b.id} className={chosen ? "opacity-80" : ""}>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h3 className="text-xl font-black">Batch {b.idx}</h3>
                  <BatchStatusBadge status={b.status} />
                </div>
                <BatchTable batch={b} items={view.items} showLinks />
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card>
        <details>
          <summary className="cursor-pointer font-extrabold">🔎 Chi tiết từng lần quay</summary>
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            {view.batches.map((b) => (
              <SpinLog key={b.id} batch={b} items={view.items} />
            ))}
          </div>
        </details>
      </Card>

      <Card>
        <details>
          <summary className="cursor-pointer font-extrabold">🎁 Danh sách item đã nhập ({view.items.length})</summary>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {view.items.map((i) => (
              <li key={i.id} className="flex items-center gap-2 text-sm">
                <ItemIcon item={i} size={28} />
                <a href={i.url} target="_blank" rel="noopener noreferrer" className="font-bold hover:underline">
                  {i.name}
                </a>
                <span className="ml-auto tabular-nums text-ink/60">{formatYen(i.priceJpy)}</span>
              </li>
            ))}
          </ul>
        </details>
      </Card>
    </div>
  );
}

function SpinLog({ batch, items }: { batch: BatchView; items: ItemView[] }) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const running = batch.spins.map((_, i) => batch.spins.slice(0, i + 1).reduce((sum, s) => sum + s.priceJpy, 0));
  return (
    <div>
      <p className="mb-2 font-extrabold">Batch {batch.idx}</p>
      {batch.spins.length === 0 ? (
        <p className="text-sm text-ink/50">Chưa quay.</p>
      ) : (
        <ol className="flex flex-col gap-1 text-sm">
          {batch.spins.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2">
              <span className="w-6 text-right text-xs font-bold text-ink/40">#{s.seq}</span>
              <span className="truncate">{byId.get(s.itemId)?.name}</span>
              <span className="ml-auto tabular-nums text-ink/50">{formatYen(running[i])}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
