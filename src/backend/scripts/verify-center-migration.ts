import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPool, checkDatabase } from "../src/db.ts";
import { runtimeConfig } from "../src/runtime-config.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const output = resolve(root, "docs/tests/backend/service-centers");
const mode = process.argv[2], pool = createPool(runtimeConfig());
try {
  assert.ok(mode === "before" || mode === "after");
  const info = await checkDatabase(pool);
  const tables = ["customer", "device", "issue_category", "ticket", "ticket_status_log", "ticket_communication"];
  const data: Record<string, { count: number; sha256: string }> = {};
  for (const table of tables) {
    const values = (await pool.query<{ value: string }>("SELECT to_jsonb(t)::text AS value FROM " + table + " t")).rows.map(row => row.value).sort();
    data[table] = { count: values.length, sha256: createHash("sha256").update(values.join("\n")).digest("hex") };
  }
  const migrations = (await pool.query("SELECT version,name,checksum FROM schema_migration ORDER BY version")).rows;
  const sequences = (await pool.query("SELECT sequencename,last_value FROM pg_sequences WHERE schemaname=current_schema() ORDER BY sequencename")).rows;
  const centers = (await pool.query("SELECT center_id::text FROM customer UNION SELECT center_id::text FROM ticket ORDER BY 1")).rows;
  const proof = { database: info.database_name, data, migrations, sequences, referencedCenterIds: centers };
  await mkdir(output, { recursive: true });
  if (mode === "before") {
    assert.equal((await pool.query("SELECT to_regclass('service_center') AS name")).rows[0].name, null);
    await writeFile(resolve(output, "db-before.json"), JSON.stringify(proof, null, 2) + "\n", { flag: "wx" });
  } else {
    const before = JSON.parse(await readFile(resolve(output, "db-before.json"), "utf8"));
    assert.deepEqual(data, before.data); assert.deepEqual(sequences, before.sequences);
    assert.deepEqual(migrations.slice(0, 2), before.migrations); assert.deepEqual(migrations.map(row => row.version), [1, 2, 3]);
    const rows = (await pool.query("SELECT center_id::text,center_name,is_active FROM service_center ORDER BY center_id")).rows;
    assert.deepEqual(rows, [{ center_id: "1", center_name: "Trung tâm demo A", is_active: true }, { center_id: "2", center_name: "Trung tâm demo B", is_active: true }]);
    const foreignKeys = (await pool.query("SELECT conname,convalidated FROM pg_constraint WHERE connamespace=current_schema()::regnamespace AND confrelid='service_center'::regclass ORDER BY conname")).rows;
    assert.equal(foreignKeys.length, 2); assert.ok(foreignKeys.every(row => row.convalidated));
    await writeFile(resolve(output, "db-after.json"), JSON.stringify({ ...proof, centers: rows, foreignKeys, originalDataAndSequencesPreserved: true }, null, 2) + "\n");
  }
  console.log(mode === "before" ? "CENTER_BASELINE_SAVED" : "CENTER_MIGRATION_DATA_PRESERVED");
} catch { console.error("CENTER_MIGRATION_VERIFICATION_FAILED"); process.exitCode = 1; }
finally { await pool.end(); }
