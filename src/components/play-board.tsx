"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { postJson, sleep } from "@/lib/client";
import { formatYen } from "@/lib/format";
import { groupBatch, type GameView, type ItemView, type SpinView } from "@/lib/game-types";
import {
  BATCH_MIN_JPY,
  batchProgress,
  CATEGORIES,
  countUsed,
  eligibleItems,
  fitsBudget,
  MAX_BATCHES,
  remainingQty,
  ticketCount,
} from "@/lib/rules";
import { BatchStepper, BudgetBar, ItemIcon } from "./game-bits";
import { Pokeball } from "./pokeball";
import { Alert, Button, Card, Modal } from "./ui";

type CloseMode = "commit" | "early";

export function PlayBoard({ initialView }: { initialView: GameView }) {
  const router = useRouter();
  const [view, setView] = useState(initialView);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ item: ItemView; spinId: number } | null>(null);
  const [closeMode, setCloseMode] = useState<CloseMode | null>(null);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const batch = view.batches.find((b) => b.status === "open");
  const total = batch?.totalJpy ?? 0;
  const used = countUsed(batch?.spins ?? []);
  const pool = eligibleItems(view.items, total, used);
  const tickets = ticketCount(pool, used);
  const progress = batchProgress(total, batch?.spins.length ?? 0, pool.length);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  /** Trạng thái lệch (vd: chơi ở tab khác) thì tải lại từ server. */
  async function resync() {
    const res = await fetch("/api/game");
    if (!res.ok) return;
    const fresh = (await res.json()) as GameView;
    if (fresh.status !== "playing") {
      router.refresh();
      return;
    }
    setView(fresh);
  }

  /** Ô sáng chạy qua các item đủ điều kiện, chậm dần rồi dừng đúng item server đã chọn. */
  async function roulette(ids: number[], targetId: number) {
    const n = ids.length;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const loops = reduce ? 0 : n === 1 ? 8 : Math.max(2, Math.ceil(24 / n));
    const steps = loops * n + ids.indexOf(targetId);
    for (let s = 0; s <= steps; s++) {
      setHighlight(ids[s % n]);
      const t = steps === 0 ? 1 : s / steps;
      await sleep(40 + 320 * t ** 3);
    }
    await sleep(350);
  }

  async function onSpin() {
    if (spinning || !progress.canSpin) return;
    setError(null);
    setSpinning(true);
    const ids = pool.map((i) => i.id);
    try {
      const res = await postJson<{ view: GameView; spin: SpinView }>("/api/game/spin");
      await roulette(ids.includes(res.spin.itemId) ? ids : [res.spin.itemId], res.spin.itemId);
      setView(res.view);
      const item = res.view.items.find((i) => i.id === res.spin.itemId);
      if (item) setResult({ item, spinId: res.spin.id });
      import("canvas-confetti").then(({ default: confetti }) =>
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.45 }, zIndex: 60 }),
      );
    } catch (err) {
      setError((err as Error).message);
      await resync();
    } finally {
      setSpinning(false);
      setHighlight(null);
    }
  }

  async function onClose(mode: CloseMode) {
    setClosing(true);
    setError(null);
    try {
      const next = await postJson<GameView>("/api/game/close", { acceptBelowMin: mode === "early" });
      setCloseMode(null);
      if (next.status === "choosing") {
        router.push("/summary");
        router.refresh();
        return;
      }
      const doneIdx = batch?.idx ?? 0;
      setView(next);
      setBanner(`${mode === "commit" ? "🎉 Đã chốt" : "⏹ Đã dừng"} batch ${doneIdx}! Bắt đầu batch ${doneIdx + 1}/${MAX_BATCHES}.`);
      router.refresh(); // cập nhật số batch còn lại trên header
    } catch (err) {
      setError((err as Error).message);
      setCloseMode(null);
      await resync();
    } finally {
      setClosing(false);
    }
  }

  if (!batch) return <Alert>Không tìm thấy batch đang mở. Hãy tải lại trang.</Alert>;
  const lines = groupBatch(batch, view.items);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-poke-red">Bước 2 / 2 · Quay random</p>
          <h1 className="text-3xl font-black">
            Batch {batch.idx}
            <span className="text-ink/30">/{MAX_BATCHES}</span>
          </h1>
        </div>
        <div className="sm:w-[420px]">
          <BatchStepper batches={view.batches} />
        </div>
      </div>

      {banner && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Alert tone="success">
            <b>{banner}</b>
          </Alert>
        </motion.div>
      )}
      {error && <Alert>{error}</Alert>}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex-1">
              <BudgetBar total={total} />
            </div>
            <button
              onClick={onSpin}
              disabled={spinning || !progress.canSpin}
              className="group relative mx-auto flex size-36 shrink-0 flex-col items-center justify-center rounded-full bg-gradient-to-b from-poke-red from-50% to-white to-50% shadow-[0_8px_0_#1f2937] ring-[6px] ring-ink transition active:translate-y-1.5 active:shadow-[0_2px_0_#1f2937] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0"
              aria-label="Quay"
            >
              <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 bg-ink" />
              <span
                className={`relative z-10 flex size-16 items-center justify-center rounded-full border-[5px] border-ink bg-white text-sm font-black tracking-wide transition group-hover:scale-105 group-disabled:group-hover:scale-100 ${spinning ? "animate-pulse" : ""}`}
              >
                {spinning ? "..." : "QUAY!"}
              </span>
            </button>
          </Card>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-extrabold">
                Các món có thể trúng{" "}
                <span className="text-sm font-bold text-ink/50">
                  ({pool.length}/{view.items.length} còn quay được)
                </span>
              </h2>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {view.items.map((item) => {
                const left = remainingQty(item, used);
                const soldOut = left === 0;
                const overBudget = !fitsBudget(item.priceJpy, total);
                const ok = !soldOut && !overBudget;
                const lit = highlight === item.id;
                const count = used.get(item.id) ?? 0;
                return (
                  <li
                    key={item.id}
                    className={`relative flex flex-col gap-2 rounded-2xl border-[3px] bg-white p-3 transition duration-100 ${
                      lit ? "z-10 scale-105 border-poke-yellow shadow-xl ring-4 ring-poke-yellow/50" : "border-transparent shadow-sm"
                    } ${ok ? "" : "opacity-40 grayscale"}`}
                  >
                    {count > 0 && (
                      <span className="absolute -right-2 -top-2 rounded-full bg-poke-red px-2 py-0.5 text-xs font-black text-white shadow">
                        ×{count}
                      </span>
                    )}
                    <div className="flex items-center gap-2.5">
                      <ItemIcon item={item} size={46} />
                      <p className="text-lg font-black tabular-nums text-poke-red">{formatYen(item.priceJpy)}</p>
                    </div>
                    <p className="line-clamp-2 min-h-[2.5em] text-sm font-extrabold leading-tight">{item.name}</p>
                    <p className="text-[11px] font-bold text-ink/50">
                      {item.category === CATEGORIES[0] ? "🏬 Pokémon Center" : "☕ Starbucks Collab"}
                    </p>
                    <div className="flex items-center justify-between gap-1 border-t border-ink/5 pt-1.5 text-xs font-extrabold">
                      <span className={soldOut ? "text-poke-red" : "text-ink/70"} title="Số lượng còn lại trong batch này">
                        📦 Còn {left}/{item.quantity}
                      </span>
                      {soldOut ? (
                        <span className="text-poke-red">Hết lượt</span>
                      ) : overBudget ? (
                        <span className="text-poke-red">Vượt ngân sách</span>
                      ) : (
                        <span className="text-poke-blue" title="Cơ hội trúng ở lần quay tới">
                          🎯 {Math.round((left / tickets) * 100)}%
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Giỏ batch hiện tại */}
        <Card className="flex h-fit flex-col gap-4 lg:sticky lg:top-24">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">🧺 Giỏ batch {batch.idx}</h2>
            <span className="text-sm font-bold text-ink/50">{batch.spins.length} lần quay</span>
          </div>
          {lines.length === 0 ? (
            <div className="rounded-2xl bg-ink/5 p-6 text-center text-sm text-ink/50">
              <Pokeball size={40} className="mx-auto mb-2 opacity-60" />
              Chưa có quà nào, bấm <b>QUAY!</b> để bắt đầu
            </div>
          ) : (
            <ul className="flex max-h-72 flex-col gap-2 overflow-auto pr-1">
              {lines.map(({ item, count, subtotal }) => (
                <li key={item.id} className="flex items-center gap-2.5 rounded-xl bg-ink/[0.03] p-2">
                  <ItemIcon item={item} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{item.name}</p>
                    <p className="text-xs text-ink/50">
                      {formatYen(item.priceJpy)} × {count}
                    </p>
                  </div>
                  <p className="font-black tabular-nums">{formatYen(subtotal)}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between border-t border-ink/10 pt-3">
            <span className="font-extrabold">Tổng</span>
            <span className={`text-2xl font-black tabular-nums ${progress.reachedMin ? "text-emerald-600" : ""}`}>{formatYen(total)}</span>
          </div>

          {progress.mustStopEarly && (
            <Alert tone="warn">Không còn món nào quay được (hết số lượng hoặc vượt ngân sách) mà batch vẫn chưa đủ {formatYen(BATCH_MIN_JPY)}. Hãy dừng batch này để sang batch kế tiếp.</Alert>
          )}
          {progress.reachedMin && !progress.canSpin && <Alert tone="info">Không còn món nào quay được (hết số lượng hoặc vượt ngân sách). Hãy chốt batch.</Alert>}

          {progress.reachedMin ? (
            <Button variant="success" className="py-3 text-lg" onClick={() => setCloseMode("commit")} disabled={spinning}>
              ✅ Chốt batch {batch.idx}
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setCloseMode("early")} disabled={spinning || !progress.canStopEarly}>
              ⏹ Dừng batch sớm (chưa đủ {formatYen(BATCH_MIN_JPY)})
            </Button>
          )}
          <p className="text-center text-xs text-ink/50">
            {batch.idx < MAX_BATCHES ? `Chốt xong sẽ sang batch ${batch.idx + 1}.` : "Đây là batch cuối, chốt xong sẽ sang bước chọn batch."}
          </p>
        </Card>
      </div>

      <Modal open={!!result} onClose={() => setResult(null)}>
        {result && (
          <ResultReveal
            key={result.spinId}
            item={result.item}
            total={total}
            reachedMin={progress.reachedMin}
            canCommit={progress.canCommit}
            onClose={() => setResult(null)}
            onCommit={() => {
              setResult(null);
              setCloseMode("commit");
            }}
          />
        )}
      </Modal>

      <Modal
        open={closeMode === "commit"}
        onClose={() => !closing && setCloseMode(null)}
        title={`Chốt batch ${batch.idx}?`}
      >
        <p className="text-ink/70">
          Batch {batch.idx} có <b>{batch.spins.length} món</b>, tổng <b className="text-emerald-600">{formatYen(total)}</b>. Sau khi chốt sẽ không quay thêm vào batch này được nữa.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCloseMode(null)} disabled={closing}>
            Quay tiếp
          </Button>
          <Button variant="success" onClick={() => onClose("commit")} loading={closing}>
            Chốt batch
          </Button>
        </div>
      </Modal>

      <Modal open={closeMode === "early"} onClose={() => !closing && setCloseMode(null)} title="Dừng batch khi chưa đủ 3,000¥?">
        <p className="text-ink/70">
          Batch {batch.idx} mới được <b>{formatYen(total)}</b>, còn thiếu <b className="text-poke-red">{formatYen(BATCH_MIN_JPY - total)}</b> để đạt tối thiểu.
        </p>
        <p className="mt-2 text-ink/70">Bạn đồng ý giữ các món quà này dù chưa đủ 3,000¥ và chuyển sang batch kế tiếp?</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCloseMode(null)} disabled={closing}>
            Không, quay tiếp
          </Button>
          <Button onClick={() => onClose("early")} loading={closing}>
            Đồng ý dừng
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/** Pokéball lắc rồi mở ra lộ món quà. Dùng `key` theo lần quay để mỗi lần hiện lại từ đầu. */
function ResultReveal({
  item,
  total,
  reachedMin,
  canCommit,
  onClose,
  onCommit,
}: {
  item: ItemView;
  total: number;
  reachedMin: boolean;
  canCommit: boolean;
  onClose: () => void;
  onCommit: () => void;
}) {
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOpened(true), 650);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-sm font-extrabold uppercase tracking-widest text-poke-red">Bạn quay trúng!</p>
      <div className="relative my-4 flex h-40 w-40 items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center">
          <Pokeball size={120} open={opened} className={opened ? "" : "animate-wobble"} />
        </div>
        {opened && (
          <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 14 }}>
            <ItemIcon item={item} size={110} />
          </motion.div>
        )}
      </div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: opened ? 1 : 0, y: opened ? 0 : 8 }}>
        <h3 className="text-2xl font-black leading-tight">{item.name}</h3>
        <p className="mt-1 text-3xl font-black text-poke-red">{formatYen(item.priceJpy)}</p>
        <p className="mt-1 text-xs font-bold text-ink/50">{item.category}</p>
        <p className="mt-3 rounded-full bg-ink/5 px-4 py-1.5 text-sm">
          Tổng batch: <b className={reachedMin ? "text-emerald-600" : ""}>{formatYen(total)}</b>
          {reachedMin ? " · đã đủ để chốt ✅" : ` · còn thiếu ${formatYen(BATCH_MIN_JPY - total)}`}
        </p>
      </motion.div>
      <div className="mt-5 flex w-full gap-2">
        {canCommit && (
          <Button variant="success" className="flex-1 py-3" onClick={onCommit} disabled={!opened}>
            ✅ Chốt batch
          </Button>
        )}
        <Button className="flex-1 py-3" onClick={onClose} disabled={!opened}>
          {canCommit ? "Quay tiếp" : "Tiếp tục"}
        </Button>
      </div>
    </div>
  );
}
