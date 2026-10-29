import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";
import { checkDatabase, inTransaction } from "./db.ts";
import { configurationError } from "./errors.ts";

export type Migration = Readonly<{ version: number; name: string; checksum: string; sql: string }>;
const migrationDir = fileURLToPath(new URL("../migrations/", import.meta.url));
export async function readMigrations(): Promise<readonly Migration[]> {
  const names = (await readdir(migrationDir)).filter(n => n.endsWith(".sql")).sort();
  const migrations: Migration[] = [];
  for (const name of names) {
    if (!/^\d{3}_[a-z0-9_]+\.sql$/.test(name)) configurationError("Tên migration không hợp lệ.");
    const sql = (await readFile(new URL("../migrations/" + name, import.meta.url), "utf8")).replaceAll("\r\n", "\n");
    migrations.push({ version: Number(name.slice(0, 3)), name, checksum: createHash("sha256").update(sql).digest("hex"), sql });
  }
  if (!migrations.length || migrations.some((m, i) => m.version !== i + 1)) configurationError("Thứ tự migration phải liên tục từ 001.");
  return migrations;
}
function validateApplied(applied: readonly { version: number; name: string; checksum: string }[], migrations: readonly Migration[]) {
  for (let i = 0; i < applied.length; i++) {
    const actual = applied[i], expected = migrations[i];
    if (!actual || !expected || actual.version !== expected.version || actual.name !== expected.name || actual.checksum !== expected.checksum)
      configurationError("Migration version/name/checksum không khớp; không sửa lịch sử đã áp dụng.");
  }
}
export async function migrate(pool: Pool, migrationInput?: readonly Migration[]): Promise<number[]> {
  const migrations = migrationInput ?? await readMigrations();
  await checkDatabase(pool);
  const client = await pool.connect();
  let locked = false, destroy = false;
  try {
    await client.query("SELECT pg_advisory_lock(hashtext(current_database()), hashtext(current_schema() || ':l2-migrate'))");
    locked = true;
    await inTransaction(client, async () => {
      await client.query("CREATE TABLE IF NOT EXISTS schema_migration (version INTEGER PRIMARY KEY, name TEXT NOT NULL, checksum VARCHAR(64) NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'), applied_at TIMESTAMPTZ NOT NULL DEFAULT now())");
    }, () => { destroy = true; });
    const applied = (await client.query<{ version: number; name: string; checksum: string }>("SELECT version,name,checksum FROM schema_migration ORDER BY version")).rows;
    validateApplied(applied, migrations);
    const newlyApplied: number[] = [];
    for (const m of migrations.slice(applied.length)) {
      await inTransaction(client, async () => {
        await client.query(m.sql);
        await client.query("INSERT INTO schema_migration(version,name,checksum) VALUES($1,$2,$3)", [m.version, m.name, m.checksum]);
      }, () => { destroy = true; });
      newlyApplied.push(m.version);
    }
    return newlyApplied;
  } finally {
    if (locked) {
      try { await client.query("SELECT pg_advisory_unlock(hashtext(current_database()), hashtext(current_schema() || ':l2-migrate'))"); }
      catch { destroy = true; }
    }
    client.release(destroy);
  }
}
export async function assertMigrationsCurrent(pool: Pool): Promise<void> {
  const exists = await pool.query<{ present: boolean }>("SELECT to_regclass('schema_migration') IS NOT NULL AS present");
  if (!exists.rows[0]?.present) configurationError("Chưa có migration. Chạy db:migrate trước khi khởi động.");
  const applied = (await pool.query<{ version: number; name: string; checksum: string }>("SELECT version,name,checksum FROM schema_migration ORDER BY version")).rows;
  const migrations = await readMigrations();
  validateApplied(applied, migrations);
  // TD-23: CRUD/DTO hiện hành không đọc email. Trong thời gian chuẩn bị CSV,
  // chỉ migration cộng thêm 004 được phép pending; importer tự yêu cầu schema mới.
  const pending = migrations.slice(applied.length);
  if (pending.length && !(applied.length === 3 && pending.length === 1 && pending[0]!.name === "004_customer_email.sql"))
    configurationError("Còn migration chưa áp dụng.");
}
