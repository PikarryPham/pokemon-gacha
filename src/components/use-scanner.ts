"use client";

import { useEffect, useRef, useState } from "react";
import type { Worker as OcrWorker } from "tesseract.js";
import { EMPTY_ITEM_FORM, type ItemFormState } from "@/lib/item-form";
import { parseScannedText } from "@/lib/scan-parse";

export const MAX_SCAN_FILES = 10;
export const MAX_SCAN_BYTES = 10 * 1024 * 1024;

export type ScanStatus = "queued" | "loading" | "reading" | "done" | "error";

export interface ScanRow {
  id: string;
  fileName: string;
  previewUrl: string;
  status: ScanStatus;
  progress: number;
  rawText: string;
  form: ItemFormState;
  error?: string;
}

const newId = () => Math.random().toString(36).slice(2, 10);

/**
 * Quét ảnh bằng Tesseract.js ngay trên trình duyệt: miễn phí, không cần key, ảnh không rời khỏi máy.
 * Thư viện và dữ liệu chữ Nhật/Anh chỉ tải khi quét lần đầu (trình duyệt tự cache cho lần sau).
 */
export function useScanner() {
  const [rows, setRows] = useState<ScanRow[]>([]);
  const workerRef = useRef<Promise<OcrWorker> | null>(null);
  const activeRowRef = useRef<string | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const urlsRef = useRef(new Set<string>());

  const patch = (id: string, change: Partial<ScanRow>) =>
    setRows((list) => list.map((r) => (r.id === id ? { ...r, ...change } : r)));

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      workerRef.current?.then((w) => w.terminate()).catch(() => {});
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, []);

  function getWorker(): Promise<OcrWorker> {
    workerRef.current ??= import("tesseract.js").then(({ createWorker }) =>
      createWorker(["jpn", "eng"], 1, {
        logger: (m) => {
          const id = activeRowRef.current;
          if (!id) return;
          if (m.status === "recognizing text") patch(id, { status: "reading", progress: m.progress });
          else patch(id, { status: "loading", progress: m.progress });
        },
      }),
    );
    // Lỗi (vd: mất mạng khi tải dữ liệu) thì cho phép thử lại ở lần quét sau.
    workerRef.current.catch(() => (workerRef.current = null));
    return workerRef.current;
  }

  async function scanOne(row: ScanRow, file: File) {
    activeRowRef.current = row.id;
    patch(row.id, { status: "loading", progress: 0 });
    try {
      const worker = await getWorker();
      const { data } = await worker.recognize(file);
      const guess = parseScannedText(data.text);
      patch(row.id, {
        status: "done",
        progress: 1,
        rawText: data.text.trim(),
        form: {
          ...EMPTY_ITEM_FORM,
          name: guess.name,
          price: guess.priceJpy ? String(guess.priceJpy) : "",
          category: guess.category,
          url: guess.url,
        },
      });
    } catch (err) {
      console.error(err);
      patch(row.id, { status: "error", error: "Không đọc được ảnh này. Kiểm tra kết nối mạng rồi thử lại, hoặc nhập tay." });
    } finally {
      activeRowRef.current = null;
    }
  }

  /** Thêm ảnh vào hàng đợi quét. Trả về thông báo lỗi nếu lựa chọn không hợp lệ (không quét ảnh nào). */
  function addFiles(files: File[]): string | null {
    if (files.length === 0) return null;
    if (files.length > MAX_SCAN_FILES) return `Mỗi lần chỉ chọn tối đa ${MAX_SCAN_FILES} ảnh (bạn chọn ${files.length}).`;
    const bad = files.find((f) => !f.type.startsWith("image/"));
    if (bad) return `"${bad.name}" không phải file ảnh.`;
    const big = files.find((f) => f.size > MAX_SCAN_BYTES);
    if (big) return `"${big.name}" quá lớn (tối đa 10MB mỗi ảnh).`;

    const newRows: ScanRow[] = files.map((f) => {
      const previewUrl = URL.createObjectURL(f);
      urlsRef.current.add(previewUrl);
      return { id: newId(), fileName: f.name, previewUrl, status: "queued", progress: 0, rawText: "", form: EMPTY_ITEM_FORM };
    });
    setRows((list) => [...list, ...newRows]);
    // Quét lần lượt từng ảnh với một worker (đỡ tốn RAM trên điện thoại).
    newRows.forEach((row, i) => {
      queueRef.current = queueRef.current.then(() => scanOne(row, files[i]));
    });
    return null;
  }

  function updateForm(id: string, form: ItemFormState) {
    patch(id, { form });
  }

  function remove(ids: string[]) {
    setRows((list) => {
      for (const r of list) {
        if (ids.includes(r.id)) {
          URL.revokeObjectURL(r.previewUrl);
          urlsRef.current.delete(r.previewUrl);
        }
      }
      return list.filter((r) => !ids.includes(r.id));
    });
  }

  return { rows, addFiles, updateForm, remove };
}
