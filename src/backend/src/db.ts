import pg from "pg";
import type { PoolClient } from "pg";
import type { RuntimeConfig } from "./runtime-config.ts";
import { DATABASE_NAME } from "./runtime-config.ts";
import { configurationError } from "./errors.ts";

export function createPool(config: RuntimeConfig, schema = "public"): pg.Pool {
  if (schema !== "public" && !/^phase2_test_[a-z0-9_]+$/.test(schema)) configurationError("Schema test không hợp lệ.");
  const pool = new pg.Pool({
    ...config.db, max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000,
    options: "-c search_path=" + schema + ",pg_catalog -c timezone=UTC",
    application_name: "mekong-mobile-l2-backend",
  });
  pool.on("error", () => { console.error("DATABASE_IDLE_CONNECTION_ERROR"); });
  return pool;
}
export async function inTransaction<T>(client: Pick<PoolClient, "query">, callback: () => Promise<T>, rollbackFailed: () => void = () => {}): Promise<T> {
  await client.query("BEGIN");
  try {
    const result = await callback();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { rollbackFailed(); }
    throw error;
  }
}
export async function withTransaction<T>(
  pool: Pick<pg.Pool, "connect">, callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let destroy = false;
  try { return await inTransaction(client, () => callback(client), () => { destroy = true; }); }
  finally { client.release(destroy); }
}
export async function checkDatabase(pool: pg.Pool, requireSchemaCreate = true) {
  const { rows } = await pool.query<{
    database_name: string; username: string; server_version: string; encoding: string;
    can_connect: boolean; can_create_schema: boolean; can_use_schema: boolean; can_create_objects: boolean;
  }>("SELECT current_database() AS database_name, current_user AS username, " +
      "current_setting('server_version') AS server_version, current_setting('server_encoding') AS encoding, " +
      "has_database_privilege(current_user, current_database(), 'CONNECT') AS can_connect, " +
      "has_database_privilege(current_user, current_database(), 'CREATE') AS can_create_schema, " +
      "has_schema_privilege(current_user, current_schema(), 'USAGE') AS can_use_schema, " +
      "has_schema_privilege(current_user, current_schema(), 'CREATE') AS can_create_objects");
  const info = rows[0];
  if (!info || info.database_name !== DATABASE_NAME) configurationError("Kết nối không đúng database đã chỉ định.");
  if (info.encoding !== "UTF8") configurationError("Database cần server_encoding UTF8.");
  if (!info.can_connect || !info.can_use_schema || (requireSchemaCreate && !info.can_create_objects))
    configurationError("Thiếu quyền CONNECT database hoặc USAGE/CREATE trên schema được chọn; không tự GRANT.");
  return info;
}
