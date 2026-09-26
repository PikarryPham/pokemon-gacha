"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client";
import { formatYen } from "@/lib/format";
import type { BatchView, GameView } from "@/lib/game-types";
import { BatchStatusBadge, BatchTable } from "./game-bits";
import { Alert, Button, Card, Modal } from "./ui";

export function SummaryBoard({ view }: { view: GameView }) {
  const router = useRouter();
  const [picked, setPicked] = useState<BatchView | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!picked) return;
    setSaving(true);
    setError(null);
    try {
      await postJson("/api/game/choose", { batchId: picked.id });
      router.replace("/history");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-wider text-poke-red">Hoàn thành 3 batch 🎉</p>
        <h1 className="text-3xl font-black">Chọn 1 batch bạn ưng ý nhất</h1>
        <p className="mt-1 text-ink/60">Sau khi chọn, lượt quay kết thúc và không thể thay đổi.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {view.batches.map((b) => (
          <Card key={b.id} className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-2xl font-black">Batch {b.idx}</h2>
                <p className="text-sm text-ink/50">{b.spins.length} món</p>
              </div>
              <BatchStatusBadge status={b.status} />
            </div>
            <div className="flex-1">
              <BatchTable batch={b} items={view.items} />
            </div>
            <Button className="w-full py-3" onClick={() => setPicked(b)}>
              Chọn batch {b.idx} · {formatYen(b.totalJpy)}
            </Button>
          </Card>
        ))}
      </div>

      <Modal open={!!picked} onClose={() => !saving && setPicked(null)} title={picked ? `Chọn batch ${picked.idx}?` : ""}>
        {picked && (
          <>
            <p className="text-ink/70">
              Batch {picked.idx}: <b>{picked.spins.length} món</b>, tổng <b className="text-poke-red">{formatYen(picked.totalJpy)}</b>.
            </p>
            <p className="mt-2 text-ink/70">
              Đây là lựa chọn <b>cuối cùng</b>. Tài khoản sẽ khóa tính năng quay, bạn chỉ còn xem được lịch sử.
            </p>
            {error && (
              <div className="mt-3">
                <Alert>{error}</Alert>
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPicked(null)} disabled={saving}>
                Xem lại
              </Button>
              <Button onClick={confirm} loading={saving}>
                Xác nhận chọn
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
