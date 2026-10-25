import { createPool, checkDatabase } from "./db.ts";
import { runtimeConfig } from "./runtime-config.ts";
import { assertMigrationsCurrent } from "./migrate.ts";
const config = runtimeConfig(), pool = createPool(config);
try {
  await checkDatabase(pool, false); await assertMigrationsCurrent(pool);
  const r = await fetch("http://127.0.0.1:" + config.port + "/api/products", { signal: AbortSignal.timeout(3000) });
  if (r.status !== 401) process.exitCode = 1;
} catch { process.exitCode = 1; } finally { await pool.end(); }
