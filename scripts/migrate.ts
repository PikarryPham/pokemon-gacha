// Áp các migration trong ./drizzle vào DB (Postgres nếu có DATABASE_URL, ngược lại PGlite ở ./.data/pglite).
import { openDefaultDb } from "../src/lib/db";

async function main() {
  const target = process.env.DATABASE_URL
    ? "Postgres (DATABASE_URL)"
    : `PGlite (${process.env.PGLITE_DIR ?? "./.data/pglite"})`;
  const handle = await openDefaultDb();
  try {
    await handle.migrate();
    console.log(`✓ Migrations applied to ${target}`);
  } finally {
    await handle.close();
  }
}

main().catch((err) => {
  console.error("✗ Migration failed:", err);
  process.exit(1);
});
