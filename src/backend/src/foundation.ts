import type { Pool } from "pg";
import type { RuntimeConfig } from "./runtime-config.ts";
import { checkDatabase } from "./db.ts";
import { loadReference, checkReferences } from "./reference-config.ts";
import { loadCredentials } from "./credentials.ts";
import { createAuth } from "./auth.ts";
import { assertMigrationsCurrent } from "./migrate.ts";

export async function prepareFoundation(pool: Pool, runtime: RuntimeConfig) {
  const reference = await loadReference(runtime.referenceFile);
  const credentials = await loadCredentials(runtime.credentialFile, reference);
  await checkDatabase(pool, false);
  await assertMigrationsCurrent(pool);
  await checkReferences(pool, reference);
  const auth = createAuth(reference, credentials, runtime.auth);
  return { reference, auth };
}
