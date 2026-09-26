// Chuyển dữ liệu nhập trên form (toàn chuỗi) thành item đã kiểm tra. Dùng chung cho form thêm tay và bảng quét ảnh.
import { CATEGORIES, type Category } from "./rules";
import { DUPLICATE_HINT, itemKey, itemSchema, type ItemInput } from "./schemas";

export type ItemFormState = { name: string; price: string; category: Category; url: string; quantity: string };
export type ItemFieldErrors = Partial<Record<"name" | "priceJpy" | "category" | "url" | "quantity", string>>;

export const EMPTY_ITEM_FORM: ItemFormState = { name: "", price: "", category: CATEGORIES[0], url: "", quantity: "1" };

export type ItemFormResult = { ok: true; item: ItemInput } | { ok: false; errors: ItemFieldErrors };

/** Kiểm tra form; `others` là các item đã có để chặn trùng (tên + link + category). */
export function validateItemForm(form: ItemFormState, others: ItemInput[] = []): ItemFormResult {
  const result = itemSchema.safeParse({
    name: form.name,
    priceJpy: form.price.trim() === "" ? NaN : Number(form.price),
    category: form.category,
    url: form.url,
    quantity: form.quantity.trim() === "" ? 1 : Number(form.quantity),
  });
  if (!result.success) {
    const errors: ItemFieldErrors = {};
    for (const issue of result.error.issues) {
      const k = issue.path[0] as keyof ItemFieldErrors;
      errors[k] ??= issue.message;
    }
    return { ok: false, errors };
  }
  const key = itemKey(result.data);
  const clash = others.find((it) => itemKey(it) === key);
  if (clash) {
    return { ok: false, errors: { name: `Item này đã có trong danh sách (${DUPLICATE_HINT} với "${clash.name}")` } };
  }
  return { ok: true, item: result.data };
}
