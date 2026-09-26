import Papa from "papaparse";
import { MAX_ITEMS } from "./rules";
import { DUPLICATE_HINT, itemKey, itemSchema, type ItemInput } from "./schemas";

export const CSV_HEADER = ["name", "price", "category", "url", "quantity"] as const;
export const MAX_IMPORT_BYTES = 100 * 1024;

export const CSV_TEMPLATE = [
  CSV_HEADER.join(","),
  "Pikachu Plush,2500,Pokemon Center,https://www.pokemoncenter-online.com/,1",
  '"Eevee Tumbler, Sakura",3200,Pokemon Starbucks Collab,https://www.starbucks.co.jp/,2',
  "Snorlax Keychain,900,Pokemon Center,https://www.pokemoncenter-online.com/,",
].join("\n");

export type ImportResult = { ok: true; items: ItemInput[] } | { ok: false; errors: string[] };

const DIGITS = /^\d+$/;

/**
 * Đọc file .csv/.txt theo cú pháp `name,price,category,url,quantity`.
 * Chỉ cần một dòng sai là từ chối cả file, kể cả dòng trùng nhau hoặc trùng với `existing`
 * (danh sách đang có trên màn hình).
 */
export function parseItemsFile(text: string, existing: ItemInput[] = []): ImportResult {
  const clean = text.replace(/^﻿/, "");
  // Không bỏ dòng trống lúc parse để chỉ số hàng khớp với số dòng trong file.
  const parsed = Papa.parse<string[]>(clean, { delimiter: ",", skipEmptyLines: false });
  const rows = parsed.data;
  const errors: string[] = [];

  for (const e of parsed.errors) {
    errors.push(`Dòng ${(e.row ?? 0) + 1}: lỗi cú pháp CSV (${e.message})`);
  }

  const header = (rows[0] ?? []).map((c) => c.trim().toLowerCase());
  if (header.join(",") !== CSV_HEADER.join(",")) {
    return { ok: false, errors: [`Dòng 1: tiêu đề phải đúng là "${CSV_HEADER.join(",")}"`, ...errors] };
  }

  const items: ItemInput[] = [];
  const existingKeys = new Map(existing.map((it) => [itemKey(it), it.name]));
  const seenLines = new Map<string, number>();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const line = i + 1;
    if (row.every((c) => c.trim() === "")) continue;

    if (row.length !== CSV_HEADER.length) {
      errors.push(`Dòng ${line}: cần đúng ${CSV_HEADER.length} cột, đang có ${row.length}`);
      continue;
    }
    const [name, price, category, url, quantity] = row.map((c) => c.trim());

    if (!DIGITS.test(price)) {
      errors.push(`Dòng ${line}: price phải là số nguyên dương, không kèm ký hiệu (vd: 2500)`);
      continue;
    }
    if (quantity !== "" && !DIGITS.test(quantity)) {
      errors.push(`Dòng ${line}: quantity phải là số nguyên dương hoặc để trống`);
      continue;
    }

    const result = itemSchema.safeParse({
      name,
      priceJpy: Number(price),
      category,
      url,
      quantity: quantity === "" ? 1 : Number(quantity),
    });
    if (!result.success) {
      for (const issue of result.error.issues) errors.push(`Dòng ${line}: ${issue.message}`);
      continue;
    }
    const key = itemKey(result.data);
    const firstLine = seenLines.get(key);
    if (firstLine !== undefined) {
      errors.push(`Dòng ${line}: trùng với dòng ${firstLine} (${DUPLICATE_HINT})`);
      continue;
    }
    seenLines.set(key, line);
    if (existingKeys.has(key)) {
      errors.push(`Dòng ${line}: trùng với item "${existingKeys.get(key)}" đã có trong danh sách (${DUPLICATE_HINT})`);
      continue;
    }
    items.push(result.data);
  }

  if (errors.length === 0 && items.length === 0) errors.push("File không có dòng dữ liệu nào");
  if (items.length > MAX_ITEMS) errors.push(`File có ${items.length} item, tối đa ${MAX_ITEMS}`);

  return errors.length ? { ok: false, errors } : { ok: true, items };
}
