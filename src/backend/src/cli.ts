import { runtimeConfig } from "./runtime-config.ts";
import { createPool, checkDatabase } from "./db.ts";
import { loadReference } from "./reference-config.ts";
import { setupCredentials } from "./credentials.ts";
import { migrate } from "./migrate.ts";
import { seed } from "./seed.ts";
import { AppError, errorCode } from "./errors.ts";

async function main() {
  const config = runtimeConfig();
  const command = process.argv[2];
  const pool = createPool(config);
  try {
    if (command === "credentials") {
      await setupCredentials(config.credentialFile, await loadReference(config.referenceFile, pool));
      console.log("Credential đã tạo trong vùng private. Xem demo-passwords.local.json tại đó; không chia sẻ hoặc ghi vào báo cáo.");
    }
    else if (command === "check") console.log(JSON.stringify(await checkDatabase(pool)));
    else if (command === "migrate") console.log(JSON.stringify({ applied_versions: await migrate(pool) }));
    else if (command === "seed") console.log(JSON.stringify(await seed(pool, await loadReference(config.referenceFile, pool))));
    else throw new AppError("CONFIGURATION_ERROR", "Dùng check, migrate, seed hoặc credentials.");
  } finally { await pool.end(); }
}
main().catch((error: unknown) => {
  // Không log raw Error/connection options/SQL detail.
  console.error(error instanceof AppError ? error.code + ": " + error.message : "BACKEND_COMMAND_FAILED (" + (errorCode(error) ?? "UNKNOWN") + ")");
  process.exitCode = 1;
});
