import { describe, expect, it } from "vitest";
import { CSV_TEMPLATE, parseItemsFile } from "@/lib/csv";
import { assignIcons } from "@/lib/icons";
import { batchProgress, countUsed, eligibleItems, itemAtTicket, remainingQty, ticketCount } from "@/lib/rules";
import { findDuplicates, itemListSchema } from "@/lib/schemas";

describe("rules", () => {
  const A = { id: 1, priceJpy: 500, quantity: 3 };
  const B = { id: 2, priceJpy: 2000, quantity: 1 };
  const none = new Map<number, number>();

  it("item chỉ quay được khi còn số lượng VÀ tổng mới vẫn < 5000", () => {
    expect(eligibleItems([A, B], 2999, none)).toEqual([A, B]);
    expect(eligibleItems([A, B], 3000, none)).toEqual([A]); // 3000 + 2000 = 5000 → không được
    const used = countUsed([{ itemId: 1 }, { itemId: 1 }, { itemId: 1 }]);
    expect(remainingQty(A, used)).toBe(0);
    expect(eligibleItems([A, B], 0, used)).toEqual([B]);
  });

  it("mỗi đơn vị số lượng còn lại là một phiếu", () => {
    expect(ticketCount([A, B], none)).toBe(4);
    expect([0, 1, 2, 3].map((t) => itemAtTicket([A, B], none, t).id)).toEqual([1, 1, 1, 2]);
    const used = countUsed([{ itemId: 1 }, { itemId: 1 }]);
    expect(ticketCount([A, B], used)).toBe(2);
    expect([0, 1].map((t) => itemAtTicket([A, B], used, t).id)).toEqual([1, 2]);
    expect(() => itemAtTicket([A, B], used, 2)).toThrow();
  });

  it("batchProgress phân biệt chốt / dừng sớm / bắt buộc dừng sớm", () => {
    expect(batchProgress(0, 0, 3)).toMatchObject({ canSpin: true, canCommit: false, canStopEarly: false });
    expect(batchProgress(2000, 1, 3)).toMatchObject({ canCommit: false, canStopEarly: true, mustStopEarly: false });
    expect(batchProgress(2600, 1, 0)).toMatchObject({ canSpin: false, mustStopEarly: true });
    expect(batchProgress(3000, 2, 1)).toMatchObject({ reachedMin: true, canCommit: true, canStopEarly: false });
  });
});

describe("assignIcons", () => {
  it("36 item đầu có emoji khác nhau; 100 item có 100 cặp (emoji, màu) khác nhau", () => {
    const looks = assignIcons(100);
    expect(new Set(looks.slice(0, 36).map((l) => l.icon)).size).toBe(36);
    expect(new Set(looks.map((l) => l.icon + l.color)).size).toBe(100);
  });
});

describe("chống trùng item", () => {
  const base = { name: "Pikachu Plush", priceJpy: 1000, category: "Pokemon Center" as const, url: "https://a.jp/p", quantity: 1 };

  it("trùng khi cùng tên + link + category (bỏ qua hoa thường và khoảng trắng thừa)", () => {
    const list = [base, { ...base, name: "  pikachu   PLUSH ", priceJpy: 2000 }, { ...base, category: "Pokemon Starbucks Collab" as const }];
    expect(findDuplicates(list)).toEqual([[1, 0]]);
    expect(findDuplicates([base, { ...base, url: "https://a.jp/other" }])).toEqual([]);
  });

  it("server từ chối danh sách có item trùng", () => {
    const r = itemListSchema.safeParse([base, { ...base }]);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toContain("trùng với item #1");
  });
});

describe("parseItemsFile", () => {
  it("đọc được file mẫu (có tên chứa dấu phẩy, quantity trống = 1)", () => {
    const r = parseItemsFile(CSV_TEMPLATE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.items).toHaveLength(3);
    expect(r.items[1]).toMatchObject({ name: "Eevee Tumbler, Sakura", priceJpy: 3200, quantity: 2 });
    expect(r.items[2].quantity).toBe(1);
  });

  it("chấp nhận BOM, CRLF và dòng trống", () => {
    const text = "﻿name,price,category,url,quantity\r\n\r\nア,100,Pokemon Center,https://a.jp,3\r\n";
    const r = parseItemsFile(text);
    expect(r).toEqual({
      ok: true,
      items: [{ name: "ア", priceJpy: 100, category: "Pokemon Center", url: "https://a.jp", quantity: 3 }],
    });
  });

  it("sai tiêu đề thì từ chối", () => {
    const r = parseItemsFile("ten,gia\nA,100");
    expect(r.ok).toBe(false);
  });

  it("chỉ một dòng sai là từ chối cả file, kèm số dòng", () => {
    const text = [
      "name,price,category,url,quantity",
      "A,100,Pokemon Center,https://a.jp,1",
      "B,¥200,Pokemon Center,https://a.jp,1",
      "C,300,Pokemon Cafe,https://a.jp,1",
      "D,400,Pokemon Center,javascript:alert(1),1",
      "E,5000,Pokemon Center,https://a.jp,1",
      "F,100,Pokemon Center,https://a.jp",
    ].join("\n");
    const r = parseItemsFile(text);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.map((e) => e.split(":")[0])).toEqual(["Dòng 3", "Dòng 4", "Dòng 5", "Dòng 6", "Dòng 7"]);
  });

  it("từ chối cả file khi có dòng trùng nhau hoặc trùng item đã có", () => {
    const text = [
      "name,price,category,url,quantity",
      "A,100,Pokemon Center,https://a.jp,1",
      "B,200,Pokemon Center,https://b.jp,1",
      "a,300,Pokemon Center,https://A.jp,2",
    ].join("\n");
    const r = parseItemsFile(text);
    expect(r).toEqual({ ok: false, errors: [expect.stringMatching(/^Dòng 4: trùng với dòng 2/)] });

    const existing = [{ name: "B", priceJpy: 999, category: "Pokemon Center" as const, url: "https://b.jp", quantity: 1 }];
    const r2 = parseItemsFile(text.split("\n").slice(0, 3).join("\n"), existing);
    expect(r2).toEqual({ ok: false, errors: [expect.stringMatching(/^Dòng 3: trùng với item "B" đã có/)] });
  });

  it("file rỗng hoặc quá 100 item bị từ chối", () => {
    const header = "name,price,category,url,quantity";
    expect(parseItemsFile(`${header}\n`).ok).toBe(false);
    const rows = Array.from({ length: 101 }, (_, i) => `I${i},100,Pokemon Center,https://a.jp,1`);
    expect(parseItemsFile([header, ...rows].join("\n")).ok).toBe(false);
    expect(parseItemsFile([header, ...rows.slice(0, 100)].join("\n")).ok).toBe(true);
  });
});
