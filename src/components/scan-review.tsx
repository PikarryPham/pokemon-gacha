"use client";

import { validateItemForm, type ItemFormState } from "@/lib/item-form";
import { CATEGORIES, MAX_ITEMS, MAX_ITEM_PRICE, MAX_QUANTITY } from "@/lib/rules";
import type { ItemInput } from "@/lib/schemas";
import { Button, Card, Field, inputClass } from "./ui";
import type { ScanRow } from "./use-scanner";

const STATUS_TEXT: Record<ScanRow["status"], string> = {
  queued: "Đang chờ…",
  loading: "Đang tải bộ nhận dạng chữ (chỉ chậm ở lần đầu)…",
  reading: "Đang đọc chữ trong ảnh…",
  done: "",
  error: "",
};

/** Bảng xem lại kết quả quét ảnh: người dùng sửa/điền thêm rồi mới thêm vào danh sách. */
export function ScanReview({
  rows,
  existing,
  onAdd,
  onUpdate,
  onRemove,
}: {
  rows: ScanRow[];
  existing: ItemInput[];
  onAdd: (items: ItemInput[]) => void;
  onUpdate: (id: string, form: ItemFormState) => void;
  onRemove: (ids: string[]) => void;
}) {
  if (rows.length === 0) return null;
  const capacity = MAX_ITEMS - existing.length;
  const done = rows.filter((r) => r.status === "done");
  const busy = rows.some((r) => r.status === "queued" || r.status === "loading" || r.status === "reading");

  // "Thêm tất cả": lấy lần lượt các dòng hợp lệ, không trùng nhau, trong giới hạn còn trống.
  const addable: { id: string; item: ItemInput }[] = [];
  for (const r of done) {
    if (addable.length >= capacity) break;
    const res = validateItemForm(r.form, [...existing, ...addable.map((a) => a.item)]);
    if (res.ok) addable.push({ id: r.id, item: res.item });
  }

  function addOne(row: ScanRow) {
    const res = validateItemForm(row.form, existing);
    if (!res.ok || capacity <= 0) return;
    onAdd([res.item]);
    onRemove([row.id]);
  }

  return (
    <Card className="border-2 border-poke-blue/30">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-extrabold">📷 Kết quả quét ảnh ({rows.length})</h2>
        {busy && <span className="size-4 animate-spin rounded-full border-2 border-poke-blue border-t-transparent" />}
        <div className="ml-auto flex gap-2">
          <Button
            variant="success"
            className="px-4 py-2 text-sm"
            disabled={addable.length === 0}
            onClick={() => {
              onAdd(addable.map((a) => a.item));
              onRemove(addable.map((a) => a.id));
            }}
          >
            ➕ Thêm tất cả món hợp lệ ({addable.length})
          </Button>
          <Button variant="ghost" className="px-3 py-2 text-sm" disabled={busy} onClick={() => onRemove(rows.map((r) => r.id))}>
            Đóng
          </Button>
        </div>
      </div>
      <p className="mb-4 text-sm text-ink/60">
        Máy đọc chữ có thể sai. Hãy <b>kiểm tra và sửa lại</b> từng món, nhất là tên, giá và link, rồi bấm Thêm. Ảnh chỉ được xử lý trên máy của bạn, không tải lên server.
      </p>
      {capacity <= 0 && (
        <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-poke-red">Danh sách đã đủ {MAX_ITEMS} món, không thêm được nữa.</p>
      )}

      <ul className="flex flex-col gap-3">
        {rows.map((row) => {
          const res = row.status === "done" ? validateItemForm(row.form, existing) : null;
          const errors = res && !res.ok ? res.errors : {};
          const set = (k: keyof ItemFormState) => (e: { target: { value: string } }) =>
            onUpdate(row.id, { ...row.form, [k]: e.target.value });
          return (
            <li key={row.id} className="grid gap-3 rounded-2xl border border-ink/10 bg-white p-3 sm:grid-cols-[120px_1fr]">
              <div className="flex flex-col gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element -- ảnh xem trước là blob URL cục bộ */}
                <img src={row.previewUrl} alt={row.fileName} className="max-h-40 w-full rounded-xl border border-ink/10 object-contain" />
                <p className="truncate text-[11px] text-ink/50" title={row.fileName}>
                  {row.fileName}
                </p>
              </div>

              {row.status === "done" ? (
                <div className="flex flex-col gap-2.5">
                  <Field label="Tên item *" error={errors.name}>
                    <input value={row.form.name} onChange={set("name")} className={inputClass} maxLength={100} />
                  </Field>
                  <div className="grid grid-cols-[1fr_90px] gap-2 sm:grid-cols-[140px_90px_1fr]">
                    <Field label="Đơn giá (¥) *" error={errors.priceJpy}>
                      <input value={row.form.price} onChange={set("price")} className={inputClass} type="number" inputMode="numeric" min={1} max={MAX_ITEM_PRICE} />
                    </Field>
                    <Field label="Số lượng *" error={errors.quantity}>
                      <input value={row.form.quantity} onChange={set("quantity")} className={inputClass} type="number" inputMode="numeric" min={1} max={MAX_QUANTITY} />
                    </Field>
                    <div className="col-span-2 sm:col-span-1">
                      <Field label="Category *" error={errors.category}>
                        <select value={row.form.category} onChange={set("category")} className={inputClass}>
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </div>
                  <Field label="Link website bán *" error={errors.url} hint={row.form.url ? undefined : "Ảnh không có link: dán link trang bán vào đây"}>
                    <input value={row.form.url} onChange={set("url")} className={inputClass} type="url" placeholder="https://…" />
                  </Field>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button className="px-4 py-2 text-sm" disabled={!res?.ok || capacity <= 0} onClick={() => addOne(row)}>
                      ➕ Thêm vào danh sách
                    </Button>
                    <Button variant="ghost" className="px-3 py-2 text-sm" onClick={() => onRemove([row.id])}>
                      Bỏ
                    </Button>
                    {row.rawText && (
                      <details className="w-full text-xs text-ink/60">
                        <summary className="cursor-pointer font-bold">Chữ đọc được từ ảnh (để copy nếu cần)</summary>
                        <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-ink/5 p-2 font-sans">{row.rawText}</pre>
                      </details>
                    )}
                  </div>
                </div>
              ) : row.status === "error" ? (
                <div className="flex flex-col items-start gap-2">
                  <p className="text-sm font-bold text-poke-red">{row.error}</p>
                  <Button variant="ghost" className="px-3 py-1.5 text-sm" onClick={() => onRemove([row.id])}>
                    Bỏ
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col justify-center gap-2">
                  <p className="text-sm font-bold text-ink/70">{STATUS_TEXT[row.status]}</p>
                  <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                    <div className="h-full rounded-full bg-poke-blue transition-[width]" style={{ width: `${Math.round(row.progress * 100)}%` }} />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
