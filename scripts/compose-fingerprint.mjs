// Read-only audit inside the isolated Compose backend: no row data or credentials are printed.
import pg from "pg";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const sha = value => createHash("sha256").update(value).digest("hex");
const pool = new pg.Pool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD });
try {
  const tables = {};
  for (const table of ["customer", "device", "issue_category", "ticket", "ticket_status_log", "ticket_communication", "schema_migration"]) {
    const rows = (await pool.query("SELECT to_jsonb(t)::text AS v FROM public." + table + " t")).rows.map(x => x.v).sort();
    tables[table] = { count: rows.length, sha256: sha(rows.join("\n")) };
  }
  const credentials = {};
  for (const file of ["credentials.json", "demo-passwords.local.json"]) credentials[file] = sha(await readFile(".private/" + file));
  console.log(JSON.stringify({ tables, credentials, sequence: (await pool.query("SELECT last_value::text,is_called FROM ticket_code_seq")).rows[0], postgres: (await pool.query("SHOW server_version")).rows[0].server_version, node: process.version }));
} finally { await pool.end(); }
