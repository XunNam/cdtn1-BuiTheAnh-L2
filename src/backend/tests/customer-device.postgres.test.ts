import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import type { Pool } from "pg";
import { runtimeConfig } from "../src/runtime-config.ts";
import { createPool, checkDatabase, withTransaction } from "../src/db.ts";
import { migrate } from "../src/migrate.ts";
import { seed } from "../src/seed.ts";
import { createDatabaseAuth } from "../src/auth.ts";
import { createApp } from "../src/app.ts";
import { createCustomerService } from "../src/services/customers.service.ts";
import { createDeviceService } from "../src/services/devices.service.ts";
import { deviceRepository } from "../src/repositories/devices.repository.ts";
import { testIdentity, serve } from "./helpers.ts";

async function fingerprint(pool: Pool, tables: readonly string[]) {
  const result: Record<string, string> = {};
  for (const name of tables) {
    assert.match(name, /^(customer|device|issue_category|ticket|ticket_status_log|ticket_communication|schema_migration|service_center)$/);
    const rows = (await pool.query("SELECT to_jsonb(t) AS value FROM " + name + " t")).rows.map(r => JSON.stringify(r.value)).sort();
    result[name] = createHash("sha256").update(JSON.stringify(rows)).digest("hex");
  }
  return result;
}
test("Phase 3 — HTTP + PostgreSQL thật, dữ liệu và concurrency cách ly", async t => {
  const runtime = runtimeConfig(), admin = createPool(runtime);
  const info = await checkDatabase(admin); assert.equal(info.can_create_schema, true);
  const publicTables = ["customer", "device", "issue_category", "ticket", "ticket_status_log", "ticket_communication", "schema_migration", "service_center"];
  const publicBefore = await fingerprint(admin, publicTables);
  const schema = "phase2_test_p3_" + process.pid + "_" + randomBytes(6).toString("hex");
  const pool = createPool(runtime, schema);
  let created = false, live: Awaited<ReturnType<typeof serve>> | undefined;
  let auth: ReturnType<typeof createDatabaseAuth> | undefined;
  let clock = new Date("2026-10-24T09:00:00+07:00").getTime();
  const now = () => new Date(clock);
  try {
    assert.match(schema, /^phase2_test_p3_[a-z0-9_]+$/);
    await admin.query('CREATE SCHEMA "' + schema + '"'); created = true;
    await migrate(pool);
    const identity = await testIdentity();
    await seed(pool, identity.config);
    auth = createDatabaseAuth(pool, identity.config, identity.credentials, { ttlSeconds: 3600, maxSessions: 100 });
    live = await serve(createApp(auth, { customers: createCustomerService(pool, now), devices: createDeviceService(pool, identity.config, now), now }));
    const tokens: Record<string, string> = {};
    for (const name of ["nv_demo_a", "nv_demo_b", "ql_demo_a", "ql_demo_ab"]) {
      const response: Response = await fetch(live.url + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: name, password: identity.password }) });
      assert.equal(response.status, 200); tokens[name] = (await response.json()).data.access_token;
    }
    async function api(method: string, path: string, body?: unknown, user = "nv_demo_a", extraHeaders: Record<string, string> = {}) {
      const headers: Record<string, string> = { ...extraHeaders };
      if (user) headers.authorization = "Bearer " + tokens[user];
      if (body !== undefined && !headers["content-type"]) headers["content-type"] = "application/json";
      const response = await fetch(live!.url + "/api" + path, { method, headers, body: body === undefined ? undefined : typeof body === "string" && headers["content-type"] === "text/plain" ? body : JSON.stringify(body) });
      const raw = await response.text();
      return { status: response.status, body: raw ? JSON.parse(raw) : null, raw, headers: response.headers };
    }
    const fixture = (await pool.query("SELECT c.customer_id::text,d.device_id::text FROM customer c JOIN device d USING(customer_id) WHERE c.phone=$1", ["0990000001"])).rows[0];
    const c1 = Number(fixture.customer_id), d1 = Number(fixture.device_id);
    let newId = 0; const deviceIds: number[] = [];
    const historyBefore = await fingerprint(pool, ["ticket", "ticket_status_log", "ticket_communication"]);

    await t.test("P3-I01 E01/QT01/02/14/15: bốn phone cùng ID, masking,404 thiếu/ngoài scope", async () => {
      for (const phone of ["0990000001", "+84 990.000.001", "84990000001", "0990 000 001"]) {
        const r = await api("GET", "/customers?phone=" + encodeURIComponent(phone));
        assert.equal(r.status, 200); assert.equal(r.body.data.customer_id, c1); assert.equal(r.body.data.phone, "099****001");
        assert.deepEqual(Object.keys(r.body.data).sort(), ["customer_id", "full_name", "phone", "address", "created_at"].sort());
      }
      for (const phone of ["0990000002", "0889999999", "0990000030"]) {
        const r = await api("GET", "/customers?phone=" + phone);
        assert.equal(r.status, 404); assert.equal(r.body.error.code, "CUSTOMER_NOT_FOUND"); assert.ok(!r.raw.includes(phone));
      }
      for (const suffix of ["", "?phone=x", "?phone=0990000001&phone=0990000002", "?phone=0990000001&role=ADMIN"])
        assert.equal((await api("GET", "/customers" + suffix)).status, 400);
    });
    await t.test("P3-I02 E02:201 persisted, principal center, server timestamp và exact shape", async () => {
      const r = await api("POST", "/customers", { full_name: " Khách Phase 3 ", phone: "+84 881.000.001", address: " Địa chỉ test " });
      assert.equal(r.status, 201); newId = r.body.data.customer_id;
      assert.equal(r.body.data.phone, "088****001"); assert.equal(r.body.data.address, "Địa chỉ test");
      assert.ok(r.body.data.created_at.endsWith("+07:00")); assert.equal(r.headers.get("location"), null);
      const row = (await pool.query("SELECT full_name,phone,center_id::text,created_at FROM customer WHERE customer_id=$1", [newId])).rows[0];
      assert.equal(row.center_id, "1"); assert.equal(row.phone, "0881000001"); assert.equal(row.full_name, "Khách Phase 3");
      assert.equal(row.created_at.getTime(), clock);
      for (const body of [{ full_name: "X", phone: "0881000002", center_id: 2 }, { full_name: "X", phone: "0881000002", created_at: "2020-01-01" }])
        assert.equal((await api("POST", "/customers", body)).status, 400);
    });
    await t.test("P3-I03 E02 collision:409 existing masked trong scope, ngoài scope/tombstone không profile", async () => {
      const same = await api("POST", "/customers", { full_name: "Không ghi đè", phone: "0881000001" });
      assert.equal(same.status, 409); assert.equal(same.body.error.code, "PHONE_ALREADY_EXISTS");
      assert.equal(same.body.error.existing_customer.customer_id, newId); assert.equal(same.body.error.existing_customer.phone, "088****001");
      assert.ok(!same.raw.includes("0881000001")); assert.equal(same.body.error.existing_customer.full_name, "Khách Phase 3");
      for (const [phone, user] of [["0990000002", "nv_demo_a"], ["0990000030", "nv_demo_b"]]) {
        const r = await api("POST", "/customers", { full_name: "Không lộ", phone }, user);
        assert.equal(r.status, 409); assert.deepEqual(Object.keys(r.body.error).sort(), ["code", "message", "fields"].sort());
        assert.ok(!r.raw.includes(phone)); assert.equal(r.body.error.code, "PHONE_ALREADY_EXISTS");
      }
    });
    await t.test("P3-I04 8 endpoint đều401/403 trước input, không cấp quyền từ header", async () => {
      const requests: [string, string, unknown?][] = [
        ["GET", "/customers?phone=0990000001"], ["POST", "/customers", {}], ["GET", "/customers/" + c1 + "/devices"],
        ["POST", "/customers/" + c1 + "/devices", {}], ["PATCH", "/customers/" + c1, {}], ["DELETE", "/customers/" + c1],
        ["PATCH", "/customers/" + c1 + "/devices/" + d1, {}], ["DELETE", "/customers/" + c1 + "/devices/" + d1],
      ];
      for (const [method, path, body] of requests) {
        assert.equal((await api(method, path, body, "")).status, 401);
        assert.equal((await api(method, path, body, "ql_demo_ab")).status, 403);
        assert.equal((await api(method, path, body, "", { authorization: "Bearer invalid", role: "QUAN_LY_TTBH" })).status, 401);
      }
      const outside = await api("GET", "/customers/" + c1 + "/devices", undefined, "nv_demo_b", { role: "NHAN_VIEN_TIEP_NHAN", "x-center-id": "1" });
      assert.equal(outside.status, 404);
    });
    await t.test("P3-I05 E03/E04: product0/120, serial exact, numeric99/100, filter/pagination/empty page", async () => {
      // Chỉ tăng sequence trong schema test mới để bắt lỗi ORDER BY ID dạng text.
      await pool.query("SELECT setval(pg_get_serial_sequence('device','device_id'),98,true)");
      for (const [product_id, serial_no, months] of [[102, "000a", 0], [103, "000b", 120], [101, "000c", 12]] as const) {
        const r = await api("POST", "/customers/" + newId + "/devices", { product_id, serial_no });
        assert.equal(r.status, 201); assert.equal(r.body.data.warranty_months, months); assert.equal(r.body.data.purchase_date, null);
        deviceIds.push(r.body.data.device_id);
        assert.deepEqual(Object.keys(r.body.data).sort(), ["device_id", "customer_id", "product_id", "serial_no", "purchase_date", "warranty_months"].sort());
      }
      assert.deepEqual(deviceIds, [99, 100, 101]);
      const first = await api("GET", "/customers/" + newId + "/devices?page=1&size=2");
      assert.equal(first.status, 200); assert.deepEqual(first.body.data.map((x: { device_id: number }) => x.device_id), [99, 100]);
      assert.deepEqual(first.body.meta, { page: 1, size: 2, total: 3 });
      assert.equal((await api("GET", "/customers/" + newId + "/devices?page=2&size=2")).body.data.length, 1);
      for (const page of ["999", "9007199254740991"]) {
        const r = await api("GET", "/customers/" + newId + "/devices?page=" + page + "&size=100");
        assert.equal(r.status, 200); assert.deepEqual(r.body.data, []); assert.equal(r.body.meta.total, 3);
      }
      assert.equal((await api("GET", "/customers/" + newId + "/devices?serial_no=000a")).body.meta.total, 1);
      assert.equal((await api("GET", "/customers/" + newId + "/devices?serial_no=000A")).body.meta.total, 0);
      for (const suffix of ["?size=101", "?page=0", "?page=1&page=2", "?serial_no=", "?unknown=1"])
        assert.equal((await api("GET", "/customers/" + newId + "/devices" + suffix)).status, 400);
      assert.equal((await api("GET", "/customers/9007199254740992/devices")).status, 400);
      assert.equal((await api("GET", "/customers/" + c1 + "/devices", undefined, "nv_demo_b")).status, 404);
      const empty = await api("POST", "/customers", { full_name: "Chưa có thiết bị", phone: "0881000002" });
      assert.deepEqual((await api("GET", "/customers/" + empty.body.data.customer_id + "/devices")).body.data, []);
    });
    await t.test("P3-I06 E04: inactive/missing product404, future400, NULL hợp lệ, stored months không lấy lại config", async () => {
      const path = "/customers/" + newId + "/devices";
      for (const id of [104, 999]) {
        const r = await api("POST", path, { product_id: id, serial_no: "REJECT-PRODUCT" });
        assert.equal(r.status, 404); assert.equal(r.body.error.code, "PRODUCT_NOT_FOUND");
      }
      for (const body of [{ product_id: 101, serial_no: "X", warranty_months: 120 }, { product_id: 101, serial_no: "X", customer_id: 2 },
        { product_id: 101, serial_no: "X", purchase_date: "2026-10-25" }, { product_id: 101, serial_no: "X", purchase_date: "2026-02-29" },
        { product_id: 101, serial_no: 123 }, { product_id: "101", serial_no: "X" }])
        assert.equal((await api("POST", path, body)).status, 400);
      const nullDate = await api("POST", path, { product_id: 101, serial_no: "NULL-DATE", purchase_date: null });
      assert.equal(nullDate.status, 201); assert.equal(nullDate.body.data.purchase_date, null);
      await pool.query("UPDATE device SET warranty_months=24 WHERE device_id=$1", [deviceIds[2]]);
      const stored = await api("GET", path + "?serial_no=000c"); assert.equal(stored.body.data[0].warranty_months, 24);
      const row = (await pool.query("SELECT product_id::text,customer_id::text,warranty_months FROM device WHERE device_id=$1", [deviceIds[0]])).rows[0];
      assert.deepEqual(row, { product_id: "102", customer_id: String(newId), warranty_months: 0 });
    });
    await t.test("P3-I07 serial collision: cùng owner409, sai owner/ngoài scope không lộ, tombstone không reuse", async () => {
      const duplicate = await api("POST", "/customers/" + newId + "/devices", { product_id: 101, serial_no: "000a" });
      assert.equal(duplicate.status, 409); assert.equal(duplicate.body.error.code, "SERIAL_ALREADY_EXISTS");
      assert.equal(duplicate.body.error.existing_device.customer_id, newId);
      for (const serial of ["L2-DEMO-V1-001", "L2-DEMO-V1-002"]) {
        const r = await api("POST", "/customers/" + newId + "/devices", { product_id: 101, serial_no: serial });
        assert.equal(r.status, 409); assert.equal(r.body.error.code, "DEVICE_OWNER_MISMATCH");
        assert.deepEqual(Object.keys(r.body.error).sort(), ["code", "message", "fields"].sort());
      }
      const c29 = (await pool.query("SELECT customer_id FROM customer WHERE phone=$1", ["0990000029"])).rows[0].customer_id;
      const gone = await api("POST", "/customers/" + c29 + "/devices", { product_id: 101, serial_no: "L2-DEMO-V1-029" });
      assert.equal(gone.status, 409); assert.equal(gone.body.error.code, "SERIAL_ALREADY_EXISTS"); assert.ok(!gone.body.error.existing_device);
      assert.equal((await pool.query("SELECT customer_id::text FROM device WHERE serial_no=$1", ["L2-DEMO-V1-001"])).rows[0].customer_id, String(c1));
    });
    await t.test("P3-I08 PATCH Customer200 whitelist/null/omission/Unicode; created_at và history không đổi", async () => {
      const before = (await pool.query("SELECT phone,center_id,created_at FROM customer WHERE customer_id=$1", [newId])).rows[0];
      let r = await api("PATCH", "/customers/" + newId, { full_name: "😀".repeat(120) }); assert.equal(r.status, 200); assert.equal(r.body.data.address, "Địa chỉ test");
      r = await api("PATCH", "/customers/" + newId, { address: null }); assert.equal(r.status, 200); assert.equal(r.body.data.address, null);
      assert.equal(r.body.data.phone, "088****001");
      assert.equal((await api("PATCH", "/customers/" + newId, { address: " " })).body.data.address, "");
      for (const body of [{}, { full_name: null }, { full_name: "x".repeat(121) }, { address: "x".repeat(256) },
        ...["customer_id", "phone", "center_id", "created_at", "deleted_at"].map(k => ({ [k]: 1 }))])
        assert.equal((await api("PATCH", "/customers/" + newId, body)).status, 400);
      const after = (await pool.query("SELECT phone,center_id,created_at FROM customer WHERE customer_id=$1", [newId])).rows[0]; assert.deepEqual(after, before);
      assert.deepEqual(await fingerprint(pool, ["ticket", "ticket_status_log", "ticket_communication"]), historyBefore);
    });
    await t.test("P3-I09 PATCH Device200 chỉ ngày, parent/owner404; snapshot và inactive product không bị sửa", async () => {
      const path = "/customers/" + c1 + "/devices/" + d1;
      assert.equal((await api("PATCH", path, { purchase_date: "2026-10-01" })).status, 200);
      assert.equal((await api("PATCH", path, { purchase_date: null })).body.data.purchase_date, null);
      for (const body of [{}, { purchase_date: "2026-10-25" }, { purchase_date: "2026-02-29" },
        ...["device_id", "customer_id", "product_id", "serial_no", "warranty_months", "deleted_at"].map(k => ({ purchase_date: null, [k]: 1 }))])
        assert.equal((await api("PATCH", path, body)).status, 400);
      const wrong = await api("PATCH", "/customers/" + newId + "/devices/" + d1, { purchase_date: null });
      assert.equal(wrong.status, 404); assert.equal(wrong.body.error.code, "DEVICE_NOT_FOUND");
      assert.equal((await api("PATCH", path, { purchase_date: null }, "nv_demo_b")).status, 404);
      // Thiết bị lịch sử vẫn dùng months đã lưu khi product hiện tại ngừng.
      await pool.query("UPDATE device SET product_id=104 WHERE device_id=$1", [deviceIds[2]]);
      const inactive = await api("PATCH", "/customers/" + newId + "/devices/" + deviceIds[2], { purchase_date: "2024-02-29" });
      assert.equal(inactive.status, 200); assert.equal(inactive.body.data.warranty_months, 24); assert.equal(inactive.body.data.product_id, 104);
      assert.deepEqual(await fingerprint(pool, ["ticket", "ticket_status_log", "ticket_communication"]), historyBefore);
      assert.equal((await pool.query("SELECT purchase_date_snapshot::text FROM ticket WHERE device_id=$1 LIMIT 1", [d1])).rows[0].purchase_date_snapshot, "2026-09-01");
    });
    await t.test("P3-I10 DELETE Device204/lặp, giữ timestamp/FK/serial/ticket và E03 ẩn tombstone", async () => {
      const path = "/customers/" + c1 + "/devices/" + d1;
      const first = await api("DELETE", path); assert.equal(first.status, 204); assert.equal(first.raw, "");
      const stamp = (await pool.query("SELECT deleted_at FROM device WHERE device_id=$1", [d1])).rows[0].deleted_at;
      clock += 60000;
      assert.equal((await api("DELETE", path)).status, 204);
      assert.equal((await pool.query("SELECT deleted_at FROM device WHERE device_id=$1", [d1])).rows[0].deleted_at.getTime(), stamp.getTime());
      assert.equal((await api("GET", "/customers/" + c1 + "/devices")).body.meta.total, 0);
      assert.equal((await api("PATCH", path, { purchase_date: null })).status, 404);
      const reuse = await api("POST", "/customers/" + c1 + "/devices", { product_id: 101, serial_no: "L2-DEMO-V1-001" });
      assert.equal(reuse.status, 409); assert.ok(!reuse.body.error.existing_device);
      assert.deepEqual(await fingerprint(pool, ["ticket", "ticket_status_log", "ticket_communication"]), historyBefore);
    });
    await t.test("P3-I11 DELETE Customer204/lặp, không cascade; child DELETE khi cha ngừng vẫn204", async () => {
      const old = (await pool.query("SELECT c.customer_id::text,d.device_id::text FROM customer c JOIN device d USING(customer_id) WHERE c.phone=$1", ["0990000003"])).rows[0];
      const parentPath = "/customers/" + old.customer_id, childPath = parentPath + "/devices/" + old.device_id;
      assert.equal((await api("DELETE", parentPath)).status, 204);
      const stamp = (await pool.query("SELECT deleted_at FROM customer WHERE customer_id=$1", [old.customer_id])).rows[0].deleted_at;
      clock += 60000; assert.equal((await api("DELETE", parentPath)).status, 204);
      assert.equal((await pool.query("SELECT deleted_at FROM customer WHERE customer_id=$1", [old.customer_id])).rows[0].deleted_at.getTime(), stamp.getTime());
      assert.equal((await pool.query("SELECT deleted_at FROM device WHERE device_id=$1", [old.device_id])).rows[0].deleted_at, null);
      assert.equal((await api("GET", "/customers?phone=0990000003")).status, 404);
      assert.equal((await api("GET", parentPath + "/devices")).status, 404);
      assert.equal((await api("POST", parentPath + "/devices", { product_id: 101, serial_no: "NO-CREATE-AFTER-DELETE" })).status, 404);
      assert.equal((await api("PATCH", parentPath, { full_name: "X" })).status, 404);
      assert.equal((await api("PATCH", childPath, { purchase_date: null })).status, 404);
      assert.equal((await api("DELETE", childPath)).status, 204); assert.equal((await api("DELETE", childPath)).status, 204);
      const conflict = await api("POST", "/customers", { full_name: "Không khôi phục", phone: "0990000003" });
      assert.equal(conflict.status, 409); assert.ok(!conflict.body.error.existing_customer);
      assert.deepEqual(await fingerprint(pool, ["ticket", "ticket_status_log", "ticket_communication"]), historyBefore);
      const related = await pool.query("SELECT t.ticket_id FROM ticket t JOIN device d USING(device_id) JOIN customer c USING(customer_id) WHERE c.customer_id=$1", [old.customer_id]);
      assert.ok(related.rowCount! > 0);
    });
    await t.test("P3-I12 DELETE body JSON400/nonJSON415; JSON/media/query/path errors an toàn", async () => {
      const path = "/customers/" + newId;
      assert.equal((await api("DELETE", path, {})).status, 400);
      assert.equal((await api("DELETE", path, "x", "nv_demo_a", { "content-type": "text/plain" })).status, 415);
      assert.equal((await api("DELETE", path + "?force=true")).status, 400);
      assert.equal((await api("POST", "/customers", "private marker", "nv_demo_a", { "content-type": "text/plain" })).status, 415);
      const broken = await fetch(live!.url + "/api/customers", { method: "POST", headers: { authorization: "Bearer " + tokens.nv_demo_a, "content-type": "application/json" }, body: '{"phone":' });
      assert.equal(broken.status, 400); assert.equal((await broken.json()).error.code, "INVALID_JSON");
      const invalidPath = await api("PATCH", "/customers/%ZZ", { full_name: "X" }); assert.equal(invalidPath.status, 400);
      assert.equal((await api("DELETE", "/customers/0")).status, 400);
      assert.equal((await api("DELETE", "/customers/9007199254740991")).status, 404);
    });
    await t.test("P3-I13 UNIQUE phone cạnh tranh cùng/cross center: chỉ một201, còn409 không leak", async () => {
      for (const cross of [false, true]) {
        const phone = cross ? "0882000002" : "0882000001";
        const result = await Promise.all([
          api("POST", "/customers", { full_name: "Race A", phone }),
          api("POST", "/customers", { full_name: "Race B", phone: "+84" + phone.slice(1) }, cross ? "nv_demo_b" : "nv_demo_a"),
        ]);
        assert.deepEqual(result.map(r => r.status).sort(), [201, 409]);
        assert.equal((await pool.query("SELECT 1 FROM customer WHERE phone=$1", [phone])).rowCount, 1);
        const conflict = result.find(r => r.status === 409)!; assert.equal(conflict.body.error.code, "PHONE_ALREADY_EXISTS");
        if (cross) assert.ok(!conflict.body.error.existing_customer);
        else assert.equal(conflict.body.error.existing_customer.phone, "088****001");
      }
    });
    await t.test("P3-I14 UNIQUE serial cạnh tranh cùng/cross owner: một201, owner không chuyển", async () => {
      const other = (await pool.query("SELECT customer_id FROM customer WHERE phone=$1", ["0990000002"])).rows[0].customer_id;
      for (const cross of [false, true]) {
        const serial = cross ? "SERIAL-RACE-CROSS" : "SERIAL-RACE-SAME";
        const result = await Promise.all([
          api("POST", "/customers/" + newId + "/devices", { product_id: 101, serial_no: serial }),
          api("POST", "/customers/" + (cross ? other : newId) + "/devices", { product_id: 101, serial_no: serial }, cross ? "nv_demo_b" : "nv_demo_a"),
        ]);
        assert.deepEqual(result.map(r => r.status).sort(), [201, 409]);
        const conflict = result.find(r => r.status === 409)!;
        assert.equal(conflict.body.error.code, cross ? "DEVICE_OWNER_MISMATCH" : "SERIAL_ALREADY_EXISTS");
        if (cross) assert.ok(!conflict.body.error.existing_device);
        const persisted = (await pool.query("SELECT customer_id::text FROM device WHERE serial_no=$1", [serial])).rows;
        assert.equal(persisted.length, 1); assert.equal(persisted[0].customer_id, String(result.find(r => r.status === 201)!.body.data.customer_id));
      }
    });
    async function waitLocks(count: number) {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const result = await admin.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND usename=current_user AND wait_event_type='Lock' AND query LIKE '/* l2:customer-lock */%'");
        if (result.rows[0].n >= count) return;
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      throw new Error("Request did not reach expected row-lock wait.");
    }
    async function blockedRace(customerId: number, first: () => ReturnType<typeof api>, second: () => ReturnType<typeof api>) {
      const blocker = await pool.connect(); let committed = false;
      const pending: ReturnType<typeof api>[] = [];
      try {
        await blocker.query("BEGIN");
        await blocker.query("SELECT 1 FROM customer WHERE customer_id=$1 FOR UPDATE", [customerId]);
        pending.push(first()); await waitLocks(1);
        pending.push(second()); await waitLocks(2);
        await blocker.query("COMMIT"); committed = true;
        return await Promise.all(pending);
      } finally {
        if (!committed) await blocker.query("ROLLBACK");
        blocker.release();
        await Promise.allSettled(pending);
      }
    }
    await t.test("P3-I15 DELETE thắng E04 đang tranh khóa:204/404, không insert sau delete", async () => {
      const fresh = await api("POST", "/customers", { full_name: "Delete/create race", phone: "0883000001" });
      const id = fresh.body.data.customer_id;
      const result = await blockedRace(id, () => api("DELETE", "/customers/" + id),
        () => api("POST", "/customers/" + id + "/devices", { product_id: 101, serial_no: "DELETE-CREATE-RACE" }));
      assert.deepEqual(result.map(r => r.status), [204, 404]);
      assert.equal((await pool.query("SELECT 1 FROM device WHERE serial_no=$1", ["DELETE-CREATE-RACE"])).rowCount, 0);
    });
    await t.test("P3-I16 PATCH/delete có quan sát active:409, request sau đó404; hai DELETE cùng204", async () => {
      const fresh = await api("POST", "/customers", { full_name: "Customer race", phone: "0883000002" });
      const id = fresh.body.data.customer_id;
      const race = await blockedRace(id, () => api("DELETE", "/customers/" + id), () => api("PATCH", "/customers/" + id, { full_name: "Không sống lại" }));
      assert.deepEqual(race.map(r => r.status), [204, 409]); assert.equal(race[1]!.body.error.code, "RESOURCE_CHANGED");
      assert.equal((await api("PATCH", "/customers/" + id, { full_name: "X" })).status, 404);
      assert.deepEqual((await Promise.all([api("DELETE", "/customers/" + id), api("DELETE", "/customers/" + id)])).map(r => r.status), [204, 204]);
      const createdDevice = await api("POST", "/customers/" + newId + "/devices", { product_id: 101, serial_no: "DEVICE-PATCH-DELETE-RACE" });
      const path = "/customers/" + newId + "/devices/" + createdDevice.body.data.device_id;
      const devices = await blockedRace(newId, () => api("DELETE", path), () => api("PATCH", path, { purchase_date: null }));
      assert.deepEqual(devices.map(r => r.status), [204, 409]);
      assert.equal((await api("PATCH", path, { purchase_date: null })).status, 404);
    });
    await t.test("P3-I17 PATCH đồng thời field khác không ghi đè omission, giữ phone/center", async () => {
      const result = await Promise.all([api("PATCH", "/customers/" + newId, { full_name: "Tên cuối" }), api("PATCH", "/customers/" + newId, { address: "Địa chỉ cuối" })]);
      assert.deepEqual(result.map(r => r.status), [200, 200]);
      const read = await api("GET", "/customers?phone=0881000001");
      assert.equal(read.body.data.full_name, "Tên cuối"); assert.equal(read.body.data.address, "Địa chỉ cuối");
    });
    await t.test("P3-I18 FK/CHECK/transaction rollback thật và pool dùng tiếp sau UNIQUE lỗi", async () => {
      const before = Number((await pool.query("SELECT count(*)::text AS n FROM device")).rows[0].n);
      const marker = new Error("Rollback probe");
      await assert.rejects(withTransaction(pool, async client => {
        await deviceRepository.create(client, newId, { product_id: 101, serial_no: "TX-ROLLBACK", purchase_date: null }, 12);
        throw marker;
      }), error => error === marker);
      assert.equal(Number((await pool.query("SELECT count(*)::text AS n FROM device")).rows[0].n), before);
      await assert.rejects(pool.query("INSERT INTO device(customer_id,product_id,serial_no,warranty_months) VALUES(9007199254740991,101,'BAD-FK',12)"),
        error => typeof error === "object" && error !== null && "code" in error && error.code === "23503");
      await assert.rejects(pool.query("INSERT INTO device(customer_id,product_id,serial_no,warranty_months) VALUES($1,101,'BAD-MONTHS',121)", [newId]),
        error => typeof error === "object" && error !== null && "code" in error && error.code === "23514");
      assert.equal((await api("POST", "/customers/" + newId + "/devices", { product_id: 101, serial_no: "AFTER-ROLLBACK" })).status, 201);
    });
    await t.test("P3-I19 seed không restore hồ sơ ngừng và history không đổi qua toàn bộ CRUD", async () => {
      const c3 = (await pool.query("SELECT deleted_at FROM customer WHERE phone=$1", ["0990000003"])).rows[0].deleted_at;
      const result = await seed(pool, identity.config); assert.equal(result.tickets_created, 0);
      assert.equal((await pool.query("SELECT deleted_at FROM customer WHERE phone=$1", ["0990000003"])).rows[0].deleted_at.getTime(), c3.getTime());
      assert.ok((await pool.query("SELECT deleted_at FROM device WHERE device_id=$1", [d1])).rows[0].deleted_at);
      assert.deepEqual(await fingerprint(pool, ["ticket", "ticket_status_log", "ticket_communication"]), historyBefore);
      assert.equal((await pool.query("SELECT count(*)::text AS n FROM ticket")).rows[0].n, "200");
    });
    await t.test("P3-I20 chỉ8 API Phase3+login; E05–E13 và route test chưa public", async () => {
      for (const path of ["/products", "/issue-categories", "/devices/1/warranty", "/tickets", "/tickets/1", "/role", "/center/1"])
        assert.equal((await api("GET", path)).status, 404);
      assert.deepEqual(await fingerprint(admin, publicTables), publicBefore);
    });
  } finally {
    await live?.close(); auth?.close(); await pool.end();
    if (created && /^phase2_test_p3_[a-z0-9_]+$/.test(schema)) await admin.query('DROP SCHEMA "' + schema + '" CASCADE');
    await admin.end();
  }
});
