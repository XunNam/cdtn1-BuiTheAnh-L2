import { access } from "node:fs/promises";
import { createPool, checkDatabase } from "./db.ts";
import { runtimeConfig } from "./runtime-config.ts";
import { loadReference } from "./reference-config.ts";
import { loadCredentials, setupCredentials } from "./credentials.ts";
import { migrate } from "./migrate.ts";
import { seed } from "./seed.ts";
import { startServer } from "./server.ts";
import { AppError } from "./errors.ts";

async function main() {
  if (process.env.L2_DEPLOYMENT !== "compose") throw new AppError("CONFIGURATION_ERROR", "Initializer chỉ dành cho Compose riêng.");
  const config = runtimeConfig(), pool = createPool(config);
  try {
    await checkDatabase(pool); const lock = await pool.connect();
    try {
      // Một khóa startup bao quanh cả credential/migrate/seed, kể cả nhiều initializer.
      await lock.query("SELECT pg_advisory_lock(hashtext(current_database()),hashtext('l2-compose-start'))");
      try {
        const reference = await loadReference(config.referenceFile);
        let exists = true;
        try { await access(config.credentialFile); } catch (error) {
          if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
          exists = false;
        }
        if (exists) await loadCredentials(config.credentialFile, reference);
        else await setupCredentials(config.credentialFile, reference);
        await migrate(pool); await seed(pool, reference);
      } finally { await lock.query("SELECT pg_advisory_unlock(hashtext(current_database()),hashtext('l2-compose-start'))"); }
    } finally { lock.release(); }
  } finally { await pool.end(); }
  const running = await startServer(config);
  console.log("L2_COMPOSE_READY");
  const stop = () => { running.close().catch(() => { console.error("BACKEND_SHUTDOWN_FAILED"); process.exitCode = 1; }); };
  process.once("SIGTERM", stop); process.once("SIGINT", stop);
}
main().catch((error: unknown) => { console.error(error instanceof AppError ? error.code : "L2_COMPOSE_START_FAILED"); process.exitCode = 1; });
