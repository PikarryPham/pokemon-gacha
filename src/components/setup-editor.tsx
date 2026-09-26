"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { postJson } from "@/lib/client";
import { CSV_HEADER, CSV_TEMPLATE, MAX_IMPORT_BYTES, parseItemsFile } from "@/lib/csv";
import { formatYen } from "@/lib/format";
import { BATCH_MAX_JPY, BATCH_MIN_JPY, CATEGORIES, MAX_ITEMS, MAX_ITEM_PRICE, MAX_QUANTITY } from "@/lib/rules";
import { EMPTY_ITEM_FORM as EMPTY_FORM, validateItemForm, type ItemFieldErrors as FieldErrors, type ItemFormState as FormState } from "@/lib/item-form";
import { DUPLICATE_HINT, findDuplicates, type ItemInput } from "@/lib/schemas";
import { ScanReview } from "./scan-review";
import { Alert, Button, Card, Field, inputClass, Modal } from "./ui";
import { MAX_SCAN_FILES, useScanner } from "./use-scanner";

type DraftItem = ItemInput & { key: string };
const newKey = () => Math.random().toString(36).slice(2, 10);

function readDraft(key: string): DraftItem[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Chỉ render phía client (xem setup-editor-client.tsx) vì đọc nháp từ localStorage. */
export function SetupEditor({ userId }: { userId: number }) {
  const router = useRouter();
  const draftKey = `poke-gacha:draft:${userId}`;
  const [items, setItems] = useState<DraftItem[]>(() => readDraft(draftKey));
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmStart, setConfirmStart] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const scanner = useScanner();
  const nameRef = useRef<HTMLInputElement>(null);

  // Danh sách chưa lưu DB (yêu cầu), nhưng giữ nháp trong trình duyệt để lỡ đóng tab không mất.
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(items));
    } catch {}
  }, [items, draftKey]);

  const full = items.length >= MAX_ITEMS;
  // Nháp cũ (trước khi có luật chống trùng) có thể còn item trùng: đánh dấu và chặn nút bắt đầu.
  const duplicateOf = new Map(findDuplicates(items).map(([i, j]) => [items[i].key, j + 1]));
  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice((n) => (n === msg ? null : n)), 2500);
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingKey(null);
    setErrors({});
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const result = validateItemForm(
      form,
      items.filter((it) => it.key !== editingKey),
    );
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    const item = result.item;
    if (editingKey) {
      setItems((list) => list.map((it) => (it.key === editingKey ? { ...item, key: it.key } : it)));
      flash("Đã lưu thay đổi");
    } else {
      if (full) return;
      setItems((list) => [...list, { ...item, key: newKey() }]);
      flash(`Đã thêm "${item.name}"`);
    }
    resetForm();
    nameRef.current?.focus();
  }

  /** Thêm các item đã kiểm tra từ bảng quét ảnh. */
  function addScanned(list: ItemInput[]) {
    setItems((prev) => [...prev, ...list.map((it) => ({ ...it, key: newKey() }))]);
    flash(list.length === 1 ? `Đã thêm "${list[0].name}"` : `Đã thêm ${list.length} item từ ảnh`);
  }

  function startEdit(it: DraftItem) {
    setEditingKey(it.key);
    setErrors({});
    setForm({ name: it.name, price: String(it.priceJpy), category: it.category, url: it.url, quantity: String(it.quantity) });
    nameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    nameRef.current?.focus();
  }

  function remove(key: string) {
    setItems((list) => list.filter((it) => it.key !== key));
    if (editingKey === key) resetForm();
  }

  async function onImport(file: File) {
    setImportErrors([]);
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setImportErrors(["Chỉ chấp nhận file .csv hoặc .txt"]);
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      setImportErrors(["File quá lớn (tối đa 100KB)"]);
      return;
    }
    const result = parseItemsFile(await file.text(), items);
    if (!result.ok) {
      setImportErrors(result.errors);
      return;
    }
    if (items.length + result.items.length > MAX_ITEMS) {
      setImportErrors([
        `File có ${result.items.length} item, danh sách hiện có ${items.length}. Tổng vượt quá ${MAX_ITEMS} item nên file bị từ chối.`,
      ]);
      return;
    }
    setItems((list) => [...list, ...result.items.map((it) => ({ ...it, key: newKey() }))]);
    flash(`Đã import ${result.items.length} item từ ${file.name}`);
  }

  function downloadTemplate() {
    const blob = new Blob(["﻿" + CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "poke-gacha-mau.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function start() {
    setStarting(true);
    setStartError(null);
    try {
      await postJson("/api/game/start", {
        items: items.map(({ name, priceJpy, category, url, quantity }) => ({ name, priceJpy, category, url, quantity })),
      });
      try {
        localStorage.removeItem(draftKey);
      } catch {}
      router.replace("/play");
      router.refresh();
    } catch (err) {
      setStartError((err as Error).message);
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-28">
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-poke-red">Bước 1 / 2</p>
        <h1 className="text-3xl font-black">Nhập danh sách quà muốn quay</h1>
        <p className="mt-1 text-ink/60">
          Thêm từ 1 đến {MAX_ITEMS} item. Danh sách chỉ lưu tạm trên trình duyệt cho đến khi bạn bấm <b>Bắt đầu quay</b>, sau đó sẽ bị khóa.
        </p>
        <ul className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
          <li className="rounded-full bg-white px-3 py-1 shadow-sm">📦 Số lượng = số lần tối đa item được trúng trong mỗi batch (đầy lại ở batch mới)</li>
          <li className="rounded-full bg-white px-3 py-1 shadow-sm">🎯 Còn nhiều số lượng thì dễ trúng hơn</li>
          <li className="rounded-full bg-white px-3 py-1 shadow-sm">🚫 Không được trùng item (cùng tên, link và category)</li>
        </ul>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        {/* Form thêm/sửa */}
        <Card className="h-fit lg:sticky lg:top-24">
          <h2 className="mb-4 text-lg font-extrabold">{editingKey ? "✏️ Sửa item" : "➕ Thêm item"}</h2>
          <form onSubmit={onSubmit} className="flex flex-col gap-3.5" noValidate>
            <Field label="Tên item *" error={errors.name}>
              <input ref={nameRef} value={form.name} onChange={set("name")} className={inputClass} placeholder="Pikachu Plush" maxLength={100} />
            </Field>
            <div className="grid grid-cols-[1fr_110px] gap-3">
              <Field label="Đơn giá (¥) *" error={errors.priceJpy}>
                <input
                  value={form.price}
                  onChange={set("price")}
                  className={inputClass}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_ITEM_PRICE}
                  placeholder="2500"
                />
              </Field>
              <Field label="Số lượng *" error={errors.quantity} hint="Tối đa trúng / batch">
                <input value={form.quantity} onChange={set("quantity")} className={inputClass} type="number" inputMode="numeric" min={1} max={MAX_QUANTITY} />
              </Field>
            </div>
            <Field label="Category *" error={errors.category}>
              <select value={form.category} onChange={set("category")} className={inputClass}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Link website bán *" error={errors.url}>
              <input value={form.url} onChange={set("url")} className={inputClass} type="url" placeholder="https://www.pokemoncenter-online.com/..." />
            </Field>
            <div className="mt-1 flex gap-2">
              <Button type="submit" className="flex-1" disabled={!editingKey && full}>
                {editingKey ? "💾 Lưu thay đổi" : full ? `Đã đủ ${MAX_ITEMS} item` : "➕ Thêm vào danh sách"}
              </Button>
              {editingKey && (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Hủy
                </Button>
              )}
            </div>
          </form>

          <div className="mt-5 border-t border-ink/10 pt-4">
            <h3 className="mb-2 text-sm font-extrabold">📄 Import hàng loạt từ file</h3>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="text-sm" onClick={() => fileRef.current?.click()} disabled={full}>
                Chọn file .csv / .txt
              </Button>
              <Button type="button" variant="ghost" className="text-sm" onClick={downloadTemplate}>
                ⬇ Tải file mẫu
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImport(f);
                e.target.value = "";
              }}
            />
            <details className="mt-3 text-xs text-ink/60">
              <summary className="cursor-pointer font-bold">Cú pháp file</summary>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>
                  Dòng đầu phải đúng là: <code className="rounded bg-ink/5 px-1">{CSV_HEADER.join(",")}</code>
                </li>
                <li>Mỗi dòng 1 item, phân cách bằng dấu phẩy. Tên có dấu phẩy thì bọc trong ngoặc kép.</li>
                <li>price: số nguyên 1–{MAX_ITEM_PRICE}, không kèm ¥ hay dấu phẩy.</li>
                <li>category: &quot;{CATEGORIES[0]}&quot; hoặc &quot;{CATEGORIES[1]}&quot;.</li>
                <li>url: bắt đầu bằng http:// hoặc https://. quantity: để trống = 1.</li>
                <li>Không được có 2 dòng trùng nhau, hay trùng item đã có trong danh sách ({DUPLICATE_HINT}).</li>
                <li>
                  <b>Sai 1 dòng là từ chối cả file.</b> File dùng mã UTF-8.
                </li>
              </ul>
            </details>
            {importErrors.length > 0 && (
              <div className="mt-3">
                <Alert>
                  <p className="mb-1 font-bold">File bị từ chối:</p>
                  <ul className="max-h-40 list-disc space-y-0.5 overflow-auto pl-4">
                    {importErrors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </Alert>
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-ink/10 pt-4">
            <h3 className="mb-1 text-sm font-extrabold">📷 Quét từ ảnh chụp màn hình</h3>
            <p className="mb-2 text-xs text-ink/60">
              Chụp trang sản phẩm (mỗi ảnh 1 món), chọn 1 hoặc nhiều ảnh (tối đa {MAX_SCAN_FILES} ảnh/lần). Web tự đọc tên, giá, link để bạn kiểm tra lại.
            </p>
            <Button type="button" variant="secondary" className="text-sm" onClick={() => scanRef.current?.click()} disabled={full}>
              Chọn ảnh để quét
            </Button>
            <input
              ref={scanRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                setScanError(scanner.addFiles(Array.from(e.target.files ?? [])));
                e.target.value = "";
              }}
            />
            {scanError && (
              <div className="mt-3">
                <Alert>{scanError}</Alert>
              </div>
            )}
          </div>
        </Card>

        {/* Danh sách */}
        <div className="flex flex-col gap-3">
          <ScanReview
            rows={scanner.rows}
            existing={items}
            onAdd={addScanned}
            onUpdate={scanner.updateForm}
            onRemove={scanner.remove}
          />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">
              Danh sách{" "}
              <span className={`ml-1 rounded-full px-2.5 py-0.5 text-sm ${full ? "bg-poke-red text-white" : "bg-ink/10"}`}>
                {items.length}/{MAX_ITEMS}
              </span>
            </h2>
            {items.length > 0 && (
              <Button
                variant="ghost"
                className="px-3 py-1 text-sm"
                onClick={() => {
                  if (confirm("Xóa toàn bộ danh sách?")) {
                    setItems([]);
                    resetForm();
                  }
                }}
              >
                🗑 Xóa tất cả
              </Button>
            )}
          </div>

          {items.length === 0 && (
            <div className="rounded-3xl border-2 border-dashed border-ink/15 bg-white/60 p-10 text-center text-ink/50">
              <div className="mb-2 text-4xl">🎁</div>
              Chưa có item nào. Thêm bằng form bên cạnh, import từ file hoặc quét từ ảnh.
            </div>
          )}

          <ul className="grid gap-3 sm:grid-cols-2">
            {items.map((it, i) => (
              <li
                key={it.key}
                className={`group flex flex-col gap-2 rounded-2xl border-2 bg-white p-4 transition ${editingKey === it.key ? "border-poke-blue shadow-lg" : duplicateOf.has(it.key) ? "border-poke-red" : "border-transparent shadow-sm"}`}
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink/5 text-sm font-black text-ink/50">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-extrabold leading-snug">{it.name}</p>
                    <p className="text-lg font-black text-poke-red">{formatYen(it.priceJpy)}</p>
                  </div>
                </div>
                {duplicateOf.has(it.key) && (
                  <p className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-poke-red">
                    ⚠ Trùng với item #{duplicateOf.get(it.key)} ({DUPLICATE_HINT}). Hãy sửa hoặc xóa.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-bold ${it.category === CATEGORIES[0] ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {it.category}
                  </span>
                  <span className="rounded-full bg-ink/5 px-2 py-0.5 font-bold" title="Số lần tối đa item này được trúng trong mỗi batch">
                    SL: {it.quantity}
                  </span>
                  <a href={it.url} target="_blank" rel="noopener noreferrer" className="truncate font-bold text-poke-blue hover:underline">
                    🔗 Link
                  </a>
                </div>
                <div className="flex gap-2 border-t border-ink/5 pt-2">
                  <Button variant="secondary" className="flex-1 px-2 py-1 text-sm" onClick={() => startEdit(it)}>
                    ✏️ Sửa
                  </Button>
                  <Button variant="danger" className="flex-1 px-2 py-1 text-sm" onClick={() => remove(it.key)}>
                    🗑 Xóa
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {notice && (
        <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white shadow-lg">
          ✓ {notice}
        </div>
      )}

      {/* Thanh hành động cố định phía dưới */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          {duplicateOf.size > 0 ? (
            <p className="flex-1 text-sm font-bold text-poke-red">⚠ Có {duplicateOf.size} item bị trùng. Sửa hoặc xóa trước khi bắt đầu.</p>
          ) : (
          <p className="hidden flex-1 text-sm text-ink/60 sm:block">
            Mỗi batch: tổng từ <b>{formatYen(BATCH_MIN_JPY)}</b> đến dưới <b>{formatYen(BATCH_MAX_JPY)}</b>. Có 3 batch, cuối cùng bạn chọn 1.
          </p>
          )}
          <Button className="ml-auto px-8 py-3 text-lg" disabled={items.length === 0 || duplicateOf.size > 0} onClick={() => setConfirmStart(true)}>
            Bắt đầu quay →
          </Button>
        </div>
      </div>

      <Modal open={confirmStart} onClose={() => !starting && setConfirmStart(false)} title="Bắt đầu quay?">
        <p className="text-ink/70">
          Bạn có <b>{items.length} item</b>. Sau khi bắt đầu, danh sách sẽ <b>bị khóa</b> và không thể thêm, sửa hay xóa nữa.
        </p>
        {startError && (
          <div className="mt-3">
            <Alert>{startError}</Alert>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmStart(false)} disabled={starting}>
            Xem lại
          </Button>
          <Button onClick={start} loading={starting}>
            Chốt danh sách & quay
          </Button>
        </div>
      </Modal>
    </div>
  );
}
