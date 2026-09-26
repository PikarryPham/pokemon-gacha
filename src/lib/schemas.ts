import { z } from "zod";
import { CATEGORIES, MAX_ITEMS, MAX_ITEM_PRICE, MAX_QUANTITY, MIN_ITEMS } from "./rules";

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export const itemSchema = z.object({
  name: z
    .string({ error: "Tên item không được để trống" })
    .trim()
    .min(1, "Tên item không được để trống")
    .max(100, "Tên item tối đa 100 ký tự"),
  priceJpy: z
    .number({ error: "Đơn giá phải là số" })
    .int("Đơn giá phải là số nguyên")
    .min(1, "Đơn giá phải lớn hơn 0")
    .max(MAX_ITEM_PRICE, `Đơn giá tối đa ${MAX_ITEM_PRICE}¥ (tổng một batch phải nhỏ hơn 5000¥)`),
  category: z.enum(CATEGORIES, {
    error: `Category phải là "${CATEGORIES[0]}" hoặc "${CATEGORIES[1]}"`,
  }),
  url: z
    .string({ error: "Link không được để trống" })
    .trim()
    .min(1, "Link không được để trống")
    .max(2000, "Link quá dài")
    .refine(isHttpUrl, "Link phải là URL hợp lệ, bắt đầu bằng http:// hoặc https://"),
  quantity: z
    .number({ error: "Số lượng phải là số" })
    .int("Số lượng phải là số nguyên")
    .min(1, "Số lượng tối thiểu là 1")
    .max(MAX_QUANTITY, `Số lượng tối đa là ${MAX_QUANTITY}`),
});
export type ItemInput = z.infer<typeof itemSchema>;

/**
 * Khóa so trùng: hai item trùng nhau khi cùng tên + link + category.
 * Tên và link bỏ khoảng trắng thừa, không phân biệt hoa thường.
 */
export function itemKey(item: Pick<ItemInput, "name" | "url" | "category">): string {
  const name = item.name.trim().replace(/\s+/g, " ").toLowerCase();
  return [name, item.url.trim().toLowerCase(), item.category].join("\u0000");
}

/** Với mỗi item trùng một item đứng trước nó, trả về cặp [vị trí, vị trí item gốc] (tính từ 0). */
export function findDuplicates(items: Pick<ItemInput, "name" | "url" | "category">[]): [number, number][] {
  const first = new Map<string, number>();
  const dups: [number, number][] = [];
  items.forEach((it, i) => {
    const key = itemKey(it);
    const j = first.get(key);
    if (j === undefined) first.set(key, i);
    else dups.push([i, j]);
  });
  return dups;
}

export const DUPLICATE_HINT = "trùng tên, link và category";

export const itemListSchema = z
  .array(itemSchema)
  .min(MIN_ITEMS, `Cần ít nhất ${MIN_ITEMS} item`)
  .max(MAX_ITEMS, `Tối đa ${MAX_ITEMS} item`)
  .superRefine((items, ctx) => {
    for (const [i, j] of findDuplicates(items)) {
      ctx.addIssue({
        code: "custom",
        path: [i],
        message: `Item #${i + 1} "${items[i].name}" bị trùng với item #${j + 1} (${DUPLICATE_HINT})`,
      });
    }
  });

export const usernameSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9_.-]{3,20}$/, "Tên tài khoản 3–20 ký tự, chỉ gồm chữ không dấu, số và _ . -");

export const passwordSchema = z
  .string()
  .min(6, "Mật khẩu tối thiểu 6 ký tự")
  .max(72, "Mật khẩu tối đa 72 ký tự");

export const optionalEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .transform((v) => (v === "" ? null : v))
  .pipe(z.email("Email không hợp lệ").nullable());

export const registerSchema = z.object({
  username: usernameSchema,
  email: optionalEmailSchema.optional().transform((v) => v ?? null),
  password: passwordSchema,
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Hãy nhập tên tài khoản hoặc email"),
  password: z.string().min(1, "Hãy nhập mật khẩu"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Hãy nhập mật khẩu hiện tại"),
  newPassword: passwordSchema,
});

export const updateEmailSchema = z.object({
  email: optionalEmailSchema,
});
