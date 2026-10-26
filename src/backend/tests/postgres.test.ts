import "./service-centers.postgres.test.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { mkdir, mkdtemp, writeFile, unlink, rmdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { PoolClient } from "pg";
import { runtimeConfig } from "../src/runtime-config.ts";
import { createPool, checkDatabase, withTransaction } from "../src/db.ts";
import { migrate, readMigrations, assertMigrationsCurrent } from "../src/migrate.ts";
import { seed, tableCounts } from "../src/seed.ts";
import { checkReferences, validateReference } from "../src/reference-config.ts";
import { prepareFoundation } from "../src/foundation.ts";
import { publicError } from "../src/errors.ts";
import { referenceInput, testIdentity } from "./helpers.ts";

test("PostgreSQL thật: migration, seed, integrity và foundation trong schema cách ly", async t => {
  const runtime = runtimeConfig();
  const admin = createPool(runtime);
  const schema = "phase2_test_" + process.pid + "_" + randomBytes(6).toString("hex");
  const info = await checkDatabase(admin);
  assert.equal(info.database_name, "mekong-mobile-l2");
  assert.equal(info.can_create_schema, true, "Integration test cần CREATE trên database để tạo schema cách ly; không tự GRANT.");
  let created = false;
  let privateDir: string | undefined;
  const pool = createPool(runtime, schema);
  try {
    // Identifier do test sinh và kiểm regex; không dùng database/schema của người khác.
    assert.match(schema, /^phase2_test_[a-z0-9_]+$/);
    await admin.query('CREATE SCHEMA "' + schema + '"');
    created = true;
    const migrations = await readMigrations();
    const config = validateReference(await referenceInput());
    await t.test("migration từ schema trống và hai runner đồng thời", async () => {
      const results = await Promise.all([migrate(pool), migrate(pool)]);
      assert.deepEqual(results.flat().sort(), [1, 2, 3]);
      const tables = await pool.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname=current_schema() ORDER BY tablename");
      assert.deepEqual(tables.rows.map(x => x.tablename), ["customer", "device", "issue_category", "schema_migration", "service_center", "ticket", "ticket_communication", "ticket_status_log"]);
    });
    await t.test("migration lần hai không áp dụng lại; version/checksum khớp", async () => {
      assert.deepEqual(await migrate(pool), []);
      await assertMigrationsCurrent(pool);
      const applied = await pool.query("SELECT version,name,checksum FROM schema_migration ORDER BY version");
      assert.deepEqual(applied.rows, migrations.map(({ version, name, checksum }) => ({ version, name, checksum })));
    });
    await t.test("checksum lệch bị từ chối, không sửa registry hoặc schema", async () => {
      const altered = migrations.map(m => ({ ...m, checksum: "0".repeat(64) }));
      await assert.rejects(migrate(pool, altered), e => publicError(e).code === "CONFIGURATION_ERROR");
      assert.deepEqual(await migrate(pool), []);
    });
    await t.test("migration lỗi rollback cùng version, không giữ dữ liệu dở", async () => {
      const sql = "INSERT INTO customer(full_name,phone,center_id) VALUES('Rollback migration','0981111111',1); SELECT 1/0;";
      const extra = { version: 4, name: "004_failure_probe.sql", sql, checksum: createHash("sha256").update(sql).digest("hex") };
      await assert.rejects(migrate(pool, [...migrations, extra]));
      assert.equal((await pool.query("SELECT 1 FROM customer WHERE phone=$1", ["0981111111"])).rowCount, 0);
      assert.equal((await pool.query("SELECT 1 FROM schema_migration WHERE version=4")).rowCount, 0);
    });
    await t.test("seed hai lần:30 customer/30 device/6 nhóm/200 ticket/200 log/30 trao đổi", async () => {
      const first = await seed(pool, config), second = await seed(pool, config);
      assert.equal(first.tickets_created, 200); assert.equal(second.tickets_created, 0);
      assert.deepEqual(first.counts, { customer: 30, device: 30, issue_category: 6, ticket: 200, ticket_status_log: 200, ticket_communication: 30 });
      assert.deepEqual(second.counts, first.counts);
      const states = await pool.query("SELECT DISTINCT warranty_status,approval_status FROM ticket");
      assert.equal(states.rowCount, 4);
    });
    await t.test("seed không ghi đè chỉnh sửa customer/device/approval/deleted_at và snapshot", async () => {
      await pool.query("UPDATE customer SET full_name='Tên đã sửa trong test',address=NULL,deleted_at=now() WHERE phone=$1", ["0990000001"]);
      await pool.query("UPDATE device SET purchase_date='2026-09-15',deleted_at=now() WHERE serial_no=$1", ["L2-DEMO-V1-001"]);
      await pool.query("UPDATE ticket SET approval_status='DA_PHE_DUYET',approved_by=21,approved_at=now(),approval_note='Xác minh vận hành' WHERE ticket_code=$1", ["BH-900003/2026"]);
      const snapshot = async () => (await pool.query("SELECT row_to_json(t) AS value FROM ticket t ORDER BY ticket_id")).rows;
      const before = await snapshot();
      await seed(pool, config);
      assert.deepEqual(await snapshot(), before);
      const customer = (await pool.query("SELECT full_name,address,deleted_at FROM customer WHERE phone=$1", ["0990000001"])).rows[0];
      assert.equal(customer.full_name, "Tên đã sửa trong test"); assert.equal(customer.address, null); assert.ok(customer.deleted_at);
      const device = (await pool.query("SELECT purchase_date::text,deleted_at FROM device WHERE serial_no=$1", ["L2-DEMO-V1-001"])).rows[0];
      assert.equal(device.purchase_date, "2026-09-15"); assert.ok(device.deleted_at);
    });
    await t.test("UNIQUE phone và serial kể cả tombstone; FK và CHECK bảo vệ dữ liệu", async () => {
      for (const [sql, args, expected] of [
        ["INSERT INTO customer(full_name,phone,center_id) VALUES('Trùng',$1,1)", ["0990000001"], "23505"],
        ["INSERT INTO device(customer_id,product_id,serial_no,warranty_months) SELECT customer_id,101,$1,12 FROM customer LIMIT 1", ["L2-DEMO-V1-001"], "23505"],
        ["INSERT INTO device(customer_id,product_id,serial_no,warranty_months) VALUES(9007199254740991,101,'FK-PROBE',12)", [], "23503"],
        ["INSERT INTO device(customer_id,product_id,serial_no,warranty_months) SELECT customer_id,101,'MONTH-PROBE',121 FROM customer LIMIT 1", [], "23514"],
        ["INSERT INTO device(customer_id,product_id,serial_no,warranty_months) SELECT customer_id,101,'DEFAULT-PROBE',NULL FROM customer LIMIT 1", [], "23502"],
      ] as const) {
        await assert.rejects(pool.query(sql, [...args]), e => typeof e === "object" && e !== null && "code" in e && e.code === expected);
      }
      const metadata = (await pool.query("SELECT column_default FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='device' AND column_name='warranty_months'")).rows[0];
      assert.equal(metadata.column_default, null);
      const fk = await pool.query("SELECT 1 FROM pg_constraint WHERE connamespace=current_schema()::regnamespace AND contype='f'");
      assert.equal(fk.rowCount, 7);
    });
    await t.test("PostgreSQL Unicode CHECK: emoji2000 hợp lệ,2001 và chuỗi toàn trắng bị loại", async () => {
      const ticketId = (await pool.query("SELECT ticket_id FROM ticket LIMIT 1")).rows[0].ticket_id as string;
      const marker = new Error("rollback valid Unicode probe");
      await assert.rejects(withTransaction(pool, async client => {
        await client.query("INSERT INTO ticket_communication(ticket_id,content,created_by) VALUES($1,$2,11)", [ticketId, "\uFEFF" + "😀".repeat(2000) + "\u00a0"]);
        throw marker;
      }), e => e === marker);
      for (const content of ["😀".repeat(2001), "\t\n\u00a0\uFEFF", ""]) {
        await assert.rejects(pool.query("INSERT INTO ticket_communication(ticket_id,content,created_by) VALUES($1,$2,11)", [ticketId, content]),
          e => typeof e === "object" && e !== null && "code" in e && e.code === "23514");
      }
    });
    await t.test("CHECK cho thiếu ngày mua đã duyệt; cấm hết hạn chờ duyệt và metadata sai", async () => {
      const unknown = (await pool.query("SELECT ticket_id FROM ticket WHERE warranty_status='CHUA_XAC_MINH' AND approval_status='DA_PHE_DUYET' LIMIT 1")).rows[0];
      assert.ok(unknown);
      for (const statement of [
        "UPDATE ticket SET approval_status='CHO_PHE_DUYET' WHERE warranty_status='HET_BAO_HANH'",
        "UPDATE ticket SET approved_by=21 WHERE approval_status='KHONG_CAN'",
        "UPDATE ticket SET warranty_status='HET_BAO_HANH' WHERE warranty_status='CON_BAO_HANH'",
      ]) await assert.rejects(pool.query(statement), e => typeof e === "object" && e !== null && "code" in e && e.code === "23514");
    });
    await t.test("transaction commit, cùng connection và rollback nguyên tử ticket+log", async () => {
      await withTransaction(pool, async client => {
        const a = (await client.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
        const b = (await client.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
        assert.equal(a, b);
        await client.query("INSERT INTO customer(full_name,phone,center_id) VALUES('Commit probe',$1,1)", ["0982222222"]);
      });
      assert.equal((await pool.query("SELECT 1 FROM customer WHERE phone=$1", ["0982222222"])).rowCount, 1);
      const before = await tableCounts(pool);
      await assert.rejects(withTransaction(pool, async client => {
        const result = await cloneTicket(client, "ROLLBACK-PROBE");
        await client.query("INSERT INTO ticket_status_log(ticket_id,to_status,changed_by) VALUES($1,'MOI',11)", [result]);
        await client.query("INSERT INTO ticket_status_log(ticket_id,to_status,changed_by) VALUES($1,'MOI',11)", [result]);
      }));
      assert.deepEqual(await tableCounts(pool), before);
      assert.equal((await pool.query("SELECT 1 FROM ticket WHERE ticket_code='ROLLBACK-PROBE'")).rowCount, 0);
    });
    await t.test("runtime sequence không đụng seed và seed không ghi đè phiếu vận hành xen giữa", async () => {
      const counter = (await pool.query("SELECT nextval('ticket_code_seq')::text AS counter")).rows[0].counter as string;
      assert.equal(counter, "1000000");
      const code = "BH-" + counter + "/2026";
      await withTransaction(pool, async client => {
        const id = await cloneTicket(client, code);
        await client.query("INSERT INTO ticket_status_log(ticket_id,to_status,changed_by) VALUES($1,'MOI',11)", [id]);
      });
      const before = (await pool.query("SELECT row_to_json(t) AS value FROM ticket t WHERE ticket_code=$1", [code])).rows;
      await seed(pool, config);
      assert.deepEqual((await pool.query("SELECT row_to_json(t) AS value FROM ticket t WHERE ticket_code=$1", [code])).rows, before);
      assert.equal((await tableCounts(pool)).ticket, 201);
    });
    await t.test("config compatibility bao gồm ID và actor inactive của lịch sử/tombstone", async () => {
      await checkReferences(pool, config);
      const missing = validateReference({ ...config, products: config.products.filter(p => p.product_id !== 101) });
      await assert.rejects(checkReferences(pool, missing), e => publicError(e).code === "CONFIGURATION_ERROR");
      const inactiveHistory = config.accounts.find(a => a.employee_id === 31)!; assert.equal(inactiveHistory.is_active, false);
    });
    await t.test("seed xung đột rollback toàn bộ giao dịch, không sửa lịch sử", async () => {
      const before = await tableCounts(pool);
      await pool.query("UPDATE device SET product_id=103 WHERE serial_no=$1", ["L2-DEMO-V1-001"]);
      await assert.rejects(seed(pool, config), e => publicError(e).code === "CONFIGURATION_ERROR");
      assert.deepEqual(await tableCounts(pool), before);
      await pool.query("UPDATE device SET product_id=101 WHERE serial_no=$1", ["L2-DEMO-V1-001"]);
    });
    await t.test("foundation từ chối config hỏng/thiếu lịch sử trước listen, cấu hình đúng thành công", async () => {
      const identity = await testIdentity();
      await mkdir(resolve(".private"), { recursive: true });
      privateDir = await mkdtemp(resolve(".private", "phase2-test-"));
      const referenceFile = resolve(privateDir, "reference.json"), credentialFile = resolve(privateDir, "credentials.json");
      await writeFile(credentialFile, JSON.stringify(identity.credentials), { mode: 0o600 });
      const { centers: _centers, ...fileConfig } = config;
      await writeFile(referenceFile, JSON.stringify({ ...fileConfig, config_version: 0 }));
      await assert.rejects(prepareFoundation(pool, { ...runtime, referenceFile, credentialFile }), e => publicError(e).code === "CONFIGURATION_ERROR");
      await writeFile(referenceFile, JSON.stringify({ ...fileConfig, products: config.products.filter(p => p.product_id !== 101) }));
      await assert.rejects(prepareFoundation(pool, { ...runtime, referenceFile, credentialFile }), e => publicError(e).code === "CONFIGURATION_ERROR");
      await writeFile(referenceFile, JSON.stringify(fileConfig));
      const foundation = await prepareFoundation(pool, { ...runtime, referenceFile, credentialFile });
      foundation.auth.close();
    });
  } finally {
    await pool.end();
    // Chỉ dọn schema do chính lần test này CREATE thành công; tuyệt đối không DROP database/public.
    if (created && /^phase2_test_[a-z0-9_]+$/.test(schema)) await admin.query('DROP SCHEMA "' + schema + '" CASCADE');
    await admin.end();
    if (privateDir) {
      await unlink(resolve(privateDir, "reference.json"));
      await unlink(resolve(privateDir, "credentials.json"));
      await rmdir(privateDir);
    }
  }
});
async function cloneTicket(client: PoolClient, code: string): Promise<string> {
  const result = await client.query<{ ticket_id: string }>(
    "INSERT INTO ticket(ticket_code,device_id,center_id,received_by,category_id,issue_desc,priority,received_at,due_date,warranty_status,assessed_on,purchase_date_snapshot,warranty_months_snapshot,warranty_expires_on,approval_status) " +
    "SELECT $1,device_id,center_id,received_by,category_id,issue_desc,priority,received_at,due_date,warranty_status,assessed_on,purchase_date_snapshot,warranty_months_snapshot,warranty_expires_on,'KHONG_CAN' " +
    "FROM ticket WHERE warranty_status='CON_BAO_HANH' ORDER BY ticket_id LIMIT 1 RETURNING ticket_id::text", [code]);
  return result.rows[0]!.ticket_id;
}
