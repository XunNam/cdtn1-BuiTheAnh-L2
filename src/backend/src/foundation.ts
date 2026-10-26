import type { Pool } from "pg";
import type { RuntimeConfig } from "./runtime-config.ts";
import { checkDatabase } from "./db.ts";
import { loadReference, checkReferences } from "./reference-config.ts";
import { loadCredentials } from "./credentials.ts";
import { createDatabaseAuth } from "./auth.ts";
import { assertMigrationsCurrent } from "./migrate.ts";

export async function prepareFoundation(pool: Pool, runtime: RuntimeConfig) {
  await checkDatabase(pool, false);
  await assertMigrationsCurrent(pool);
  const reference = await loadReference(runtime.referenceFile, pool);
  const credentials = await loadCredentials(runtime.credentialFile, reference);
  await checkReferences(pool, reference);
  const auth = createDatabaseAuth(pool, reference, credentials, runtime.auth);
  return { reference, auth };
}
