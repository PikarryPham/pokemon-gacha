import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { CATEGORIES } from "../rules";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  /** Username viết thường, dùng để so khớp khi đăng nhập (không phân biệt hoa thường). */
  usernameKey: text("username_key").notNull().unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

/** Mỗi tài khoản đúng 1 lượt chơi (3 batch). */
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["playing", "choosing", "finished"] }).notNull(),
  chosenBatchId: integer("chosen_batch_id"),
  createdAt: createdAt(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const items = pgTable(
  "items",
  {
    id: serial("id").primaryKey(),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    name: text("name").notNull(),
    priceJpy: integer("price_jpy").notNull(),
    category: text("category", { enum: CATEGORIES }).notNull(),
    url: text("url").notNull(),
    quantity: integer("quantity").notNull().default(1),
    icon: text("icon").notNull(),
    color: text("color").notNull(),
  },
  (t) => [index("items_game_idx").on(t.gameId)],
);

export const batches = pgTable(
  "batches",
  {
    id: serial("id").primaryKey(),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    idx: integer("idx").notNull(),
    status: text("status", { enum: ["open", "completed", "closed_early"] }).notNull(),
    totalJpy: integer("total_jpy").notNull().default(0),
    createdAt: createdAt(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("batches_game_idx_uq").on(t.gameId, t.idx)],
);

export const spins = pgTable(
  "spins",
  {
    id: serial("id").primaryKey(),
    batchId: integer("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    priceJpy: integer("price_jpy").notNull(),
    seq: integer("seq").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("spins_batch_seq_uq").on(t.batchId, t.seq)],
);
