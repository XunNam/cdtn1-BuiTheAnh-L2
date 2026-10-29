import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, unlink, rmdir } from "node:fs/promises";
import { resolve } from "node:path";
import { runtimeConfig } from "../src/runtime-config.ts";
import { createPool } from "../src/db.ts";
import { migrate, readMigrations } from "../src/migrate.ts";
import { loadReference } from "../src/reference-config.ts";
import { seed } from "../src/seed.ts";
import { createDatabaseAuth } from "../src/auth.ts";
import { createApp } from "../src/app.ts";
import { createCatalogService } from "../src/services/catalog.service.ts";
import { createTicketService } from "../src/services/tickets.service.ts";
import { createWarrantyService } from "../src/services/warranty.service.ts";
import { serviceCenterRepository } from "../src/repositories/service-centers.repository.ts";
import { referenceInput, testIdentity, serve } from "./helpers.ts";

test("Trung tâm PostgreSQL: upgrade, FK, nguồn dữ liệu và trạng thái hoạt động", async t => {
  const runtime = runtimeConfig(), admin = createPool(runtime);
  const schema = "phase2_test_centers_" + randomBytes(8).toString("hex"), pool = createPool(runtime, schema);
  let created = false, privateDir: string | undefined;
  const code = (value: string) => (e: unknown) => typeof e === "object" && e !== null && "code" in e && e.code === value;
  try {
    await admin.query('CREATE SCHEMA "' + schema + '"'); created = true;
    const migrations = await readMigrations();
    await migrate(pool, migrations.slice(0, 2));
    await pool.query("INSERT INTO customer(full_name,phone,center_id) VALUES('Legacy','0887709001',999)");
    await t.test("SC-I01 FK upgrade lỗi rollback toàn bộ, không sửa customer hoặc registry", async () => {
      await assert.rejects(migrate(pool), code("23503"));
      assert.equal((await pool.query("SELECT to_regclass('service_center') AS name")).rows[0].name, null);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM schema_migration")).rows[0].n, 2);
      assert.equal((await pool.query("SELECT center_id::int FROM customer WHERE phone='0887709001'")).rows[0].center_id, 999);
    });
    await pool.query("UPDATE customer SET center_id=2 WHERE phone='0887709001'");
    const before = (await pool.query("SELECT to_jsonb(c) AS value FROM customer c")).rows;
    await t.test("SC-I02 chuyển v2→v3 giữ customer/ID, thêm đúng hai trung tâm và FK validated", async () => {
      assert.deepEqual(await migrate(pool, migrations.slice(0, 3)), [3]); assert.deepEqual(await migrate(pool, migrations.slice(0, 3)), []);
      assert.deepEqual((await pool.query("SELECT to_jsonb(c) AS value FROM customer c")).rows, before);
      assert.deepEqual((await serviceCenterRepository.list(pool)).map(x => [x.center_id, x.center_name, x.is_active]), [["1", "Trung tâm demo A", true], ["2", "Trung tâm demo B", true]]);
      const fk = (await pool.query("SELECT convalidated FROM pg_constraint WHERE connamespace=current_schema()::regnamespace AND confrelid='service_center'::regclass")).rows;
      assert.equal(fk.length, 2); assert.ok(fk.every(x => x.convalidated));
    });
    await mkdir(resolve(".private"), { recursive: true }); privateDir = await mkdtemp(resolve(".private/center-test-"));
    const file = resolve(privateDir, "reference.json"), { centers: _centers, ...fileConfig } = await referenceInput();
    await writeFile(file, JSON.stringify(fileConfig));
    const reference = await loadReference(file, pool), identity = await testIdentity();
    await seed(pool, reference);
    await t.test("SC-I03 FK và CHECK: không nhận center lạ/xóa center có lịch sử/tên rỗng", async () => {
      await assert.rejects(pool.query("INSERT INTO customer(full_name,phone,center_id) VALUES('Wrong','0887709002',999)"), code("23503"));
      await assert.rejects(pool.query("UPDATE ticket SET center_id=999 WHERE ticket_id=(SELECT min(ticket_id) FROM ticket)"), code("23503"));
      await assert.rejects(pool.query("DELETE FROM service_center WHERE center_id=1"), code("23001"));
      await assert.rejects(pool.query("INSERT INTO service_center VALUES(0,'Wrong',true)"), code("23514"));
      await assert.rejects(pool.query("UPDATE service_center SET center_name='' WHERE center_id=1"), code("23514"));
    });
    await t.test("SC-I04 đổi tên SQL được đọc từ DB, migration/seed lặp không ghi đè", async () => {
      await pool.query("UPDATE service_center SET center_name='Trung tâm đổi từ SQL' WHERE center_id=1");
      assert.equal((await loadReference(file, pool)).centers[0]!.center_name, "Trung tâm đổi từ SQL");
      assert.deepEqual(await migrate(pool, migrations.slice(0, 3)), []); await seed(pool, reference);
      assert.equal((await serviceCenterRepository.list(pool))[0]!.center_name, "Trung tâm đổi từ SQL");
      await writeFile(file, JSON.stringify({ ...fileConfig, centers: reference.centers }));
      await assert.rejects(loadReference(file, pool), code("CONFIGURATION_ERROR"));
      await writeFile(file, JSON.stringify(fileConfig));
    });
    await t.test("SC-I05 DB ngừng trung tâm: login401, request cũ401, hoạt động lại cần login mới", async () => {
      const auth = createDatabaseAuth(pool, reference, identity.credentials, { ttlSeconds: 3600, maxSessions: 100 });
      const live = await serve(createApp(auth, undefined, { catalog: createCatalogService(pool, reference), warranty: createWarrantyService(pool), tickets: createTicketService(pool) }));
      const signed = await auth.login("nv_demo_a", identity.password);
      const request = () => fetch(live.url + "/api/products", { headers: { authorization: "Bearer " + signed.access_token } });
      try {
        assert.equal((await request()).status, 200);
        await pool.query("UPDATE service_center SET is_active=false WHERE center_id=1");
        assert.equal((await request()).status, 401);
        const login = await fetch(live.url + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "nv_demo_a", password: identity.password }) });
        assert.equal(login.status, 401);
        await assert.rejects(loadReference(file, pool), code("CONFIGURATION_ERROR"));
        await pool.query("UPDATE service_center SET is_active=true WHERE center_id=1");
        assert.equal((await request()).status, 401);
        assert.equal((await auth.login("nv_demo_a", identity.password)).principal.active_center_id, 1);
      } finally { await pool.query("UPDATE service_center SET is_active=true WHERE center_id=1"); auth.close(); await live.close(); }
    });
    await t.test("SC-I06 E08 recheck trung tâm DB trước ghi, không tạo ticket/log khi ngừng", async () => {
      const device = (await pool.query("SELECT device_id,customer_id FROM device WHERE serial_no='L2-DEMO-V1-001'")).rows[0];
      const principal = { employee_id: 11, role: "NHAN_VIEN_TIEP_NHAN" as const, active_center_id: 1, allowed_center_ids: [1] };
      const fingerprint = async () => {
        const rows = (await pool.query("SELECT to_jsonb(t)::text AS value FROM ticket t UNION ALL SELECT to_jsonb(l)::text FROM ticket_status_log l ORDER BY value")).rows;
        return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
      };
      const hash = await fingerprint();
      try {
        await pool.query("UPDATE service_center SET is_active=false WHERE center_id=1");
        await assert.rejects(createTicketService(pool).create(principal, { customer_id: Number(device.customer_id), device_id: Number(device.device_id), center_id: 1, issue_desc: "Không tạo", category_id: 3, priority: "CAO" }), code("ROLE_FORBIDDEN"));
        assert.equal(await fingerprint(), hash);
      } finally { await pool.query("UPDATE service_center SET is_active=true WHERE center_id=1"); }
    });
    await t.test("SC-I07 membership config phải trỏ đến trung tâm có trong DB", async () => {
      const accounts = fileConfig.accounts.map((a: { employee_id: number }) => a.employee_id === 11 ? { ...a, active_center_id: 999, allowed_center_ids: [999] } : a);
      await writeFile(file, JSON.stringify({ ...fileConfig, accounts }));
      await assert.rejects(loadReference(file, pool), code("CONFIGURATION_ERROR"));
      await writeFile(file, JSON.stringify(fileConfig));
    });
  } finally {
    await pool.end();
    if (created && /^phase2_test_centers_[a-f0-9]+$/.test(schema)) await admin.query('DROP SCHEMA "' + schema + '" CASCADE');
    await admin.end();
    if (privateDir) { await unlink(resolve(privateDir, "reference.json")); await rmdir(privateDir); }
  }
});
