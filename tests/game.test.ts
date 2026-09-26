import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openPglite, type DbHandle } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { chooseBatch, closeBatch, getGameView, spin, startGame } from "@/lib/game";
import { authenticate, registerUser } from "@/lib/users";

let h: DbHandle;
let n = 0;

beforeAll(async () => {
  h = await openPglite();
  await h.migrate();
});
afterAll(() => h.close());

const item = (name: string, priceJpy: number, quantity = 1) => ({
  name,
  priceJpy,
  category: "Pokemon Center" as const,
  url: `https://example.com/${encodeURIComponent(name)}`,
  quantity,
});

async function newUser() {
  n += 1;
  return registerUser(h.db, { username: `user${n}`, email: null, password: "secret1" });
}

/** Chọn phiếu thứ i (pool giữ thứ tự nhập, mỗi đơn vị số lượng còn lại là một phiếu). */
const pickByIndex = (i: number) => ({ pick: (len: number) => Math.min(i, len - 1) });

async function expectAppError(p: Promise<unknown>, status: number) {
  await expect(p).rejects.toBeInstanceOf(AppError);
  await p.catch((e: AppError) => expect(e.status).toBe(status));
}

describe("users", () => {
  it("đăng nhập bằng username (không phân biệt hoa thường) hoặc email", async () => {
    await registerUser(h.db, { username: "Ash_K", email: "ash@poke.jp", password: "pikachu" });
    expect((await authenticate(h.db, "ash_k", "pikachu")).username).toBe("Ash_K");
    expect((await authenticate(h.db, "ASH@poke.jp", "pikachu")).username).toBe("Ash_K");
    await expectAppError(authenticate(h.db, "ash_k", "wrong"), 401);
    await expectAppError(registerUser(h.db, { username: "ash_k", email: null, password: "x12345" }), 409);
  });
});

describe("game flow", () => {
  it("chơi trọn 3 batch rồi chọn batch", async () => {
    const u = await newUser();
    expect((await getGameView(h.db, u.id)).status).toBe("setup");

    // Phiếu lúc đầu mỗi batch: A, A, B, C (A có số lượng 2).
    const v0 = await startGame(h.db, u.id, [item("A", 1500, 2), item("B", 1000), item("C", 4000)]);
    expect(v0.status).toBe("playing");
    expect(v0.remainingBatches).toBe(3);
    expect(new Set(v0.items.map((i) => i.icon)).size).toBe(3);
    await expectAppError(startGame(h.db, u.id, [item("X", 100)]), 409);

    // Batch 1: A + A = 3000 → chốt được. Cùng một item trúng nhiều lần là hợp lệ.
    await expectAppError(closeBatch(h.db, u.id, false), 409); // chưa quay lần nào
    await spin(h.db, u.id, pickByIndex(0));
    const r = await spin(h.db, u.id, pickByIndex(0));
    expect(r.view.batches[0].totalJpy).toBe(3000);
    expect(r.view.batches[0].spins.map((s) => s.itemId)).toEqual([v0.items[0].id, v0.items[0].id]);
    const v1 = await closeBatch(h.db, u.id, false);
    expect(v1.batches[0].status).toBe("completed");
    expect(v1.remainingBatches).toBe(2);
    expect(v1.batches[1]).toMatchObject({ idx: 2, status: "open", totalJpy: 0 });

    // Batch 2: B = 1000 → chưa đủ, phải xác nhận dừng sớm.
    const r2 = await spin(h.db, u.id, pickByIndex(2));
    expect(r2.spin.itemId).toBe(v0.items[1].id);
    await expectAppError(closeBatch(h.db, u.id, false), 409);
    const v2 = await closeBatch(h.db, u.id, true);
    expect(v2.batches[1].status).toBe("closed_early");

    // Batch 3: C = 4000; sau đó chỉ còn B (1000 → 5000, vượt) không vừa, A cũng không → hết item.
    const r3 = await spin(h.db, u.id, pickByIndex(3));
    expect(r3.view.batches[2].totalJpy).toBe(4000);
    await expectAppError(spin(h.db, u.id), 409);
    const v3 = await closeBatch(h.db, u.id, false);
    expect(v3.status).toBe("choosing");
    expect(v3.remainingBatches).toBe(0);

    await expectAppError(spin(h.db, u.id), 409);
    const done = await chooseBatch(h.db, u.id, v3.batches[0].id);
    expect(done).toMatchObject({ status: "finished", chosenBatchId: v3.batches[0].id });
    await expectAppError(chooseBatch(h.db, u.id, v3.batches[1].id), 409);
  });

  it("không bao giờ để tổng batch chạm 5000", async () => {
    const u = await newUser();
    await startGame(h.db, u.id, [item("A", 1700, 99), item("B", 300, 99)]);
    let view = await getGameView(h.db, u.id);
    for (let i = 0; i < 50; i++) {
      try {
        view = (await spin(h.db, u.id)).view;
      } catch (e) {
        expect((e as AppError).status).toBe(409);
        break;
      }
    }
    const total = view.batches[0].totalJpy;
    expect(total).toBeLessThan(5000);
    expect(total).toBeGreaterThanOrEqual(4700); // không còn item nào vừa thì mới dừng
  });

  it("quay đồng thời vẫn tuần tự, không trùng seq", async () => {
    const u = await newUser();
    await startGame(h.db, u.id, [item("A", 100, 5)]);
    await Promise.all(Array.from({ length: 5 }, () => spin(h.db, u.id)));
    const view = await getGameView(h.db, u.id);
    expect(view.batches[0].spins.map((s) => s.seq)).toEqual([1, 2, 3, 4, 5]);
    expect(view.batches[0].totalJpy).toBe(500);
  });

  it("số lượng giới hạn số lần trúng trong batch và reset ở batch mới", async () => {
    const u = await newUser();
    const v = await startGame(h.db, u.id, [item("A", 100, 2), item("B", 200, 1)]);
    const [A, B] = v.items;
    const got: number[] = [];
    for (let i = 0; i < 3; i++) got.push((await spin(h.db, u.id)).spin.itemId);
    expect(got.sort()).toEqual([A.id, A.id, B.id].sort()); // đúng 2 lần A, 1 lần B
    await expectAppError(spin(h.db, u.id), 409); // hết số lượng
    await closeBatch(h.db, u.id, true);
    const again = await spin(h.db, u.id); // batch 2: số lượng đầy lại
    expect([A.id, B.id]).toContain(again.spin.itemId);
    expect(again.view.batches[1].spins).toHaveLength(1);
  });

  it("từ chối danh sách không hợp lệ", async () => {
    const u = await newUser();
    await expect(startGame(h.db, u.id, [])).rejects.toThrow();
    await expect(startGame(h.db, u.id, Array.from({ length: 21 }, (_, i) => item(`I${i}`, 100)))).rejects.toThrow();
    await expect(startGame(h.db, u.id, [item("Too pricey", 5000)])).rejects.toThrow();
    await expect(startGame(h.db, u.id, [item("Dup", 100), item("Dup", 900, 3)])).rejects.toThrow(/trùng/);
    expect((await getGameView(h.db, u.id)).status).toBe("setup");
  });
});
