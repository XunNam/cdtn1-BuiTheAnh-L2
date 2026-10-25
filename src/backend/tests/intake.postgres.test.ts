import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { request } from "node:http";
import type { Pool } from "pg";
import { runtimeConfig } from "../src/runtime-config.ts";
import { createPool, checkDatabase, withTransaction } from "../src/db.ts";
import { migrate } from "../src/migrate.ts";
import { seed } from "../src/seed.ts";
import { createAuth } from "../src/auth.ts";
import { createApp } from "../src/app.ts";
import { createCustomerService } from "../src/services/customers.service.ts";
import { createDeviceService } from "../src/services/devices.service.ts";
import { createCatalogService } from "../src/services/catalog.service.ts";
import { createWarrantyService } from "../src/services/warranty.service.ts";
import { createTicketService } from "../src/services/tickets.service.ts";
import { validateReference } from "../src/reference-config.ts";
import { timestamp } from "../src/domain/business-time.ts";
import { testIdentity, serve } from "./helpers.ts";

const tables = ["customer", "device", "issue_category", "ticket", "ticket_status_log", "ticket_communication", "schema_migration"] as const;
async function fingerprint(pool: Pool) {
  const result: Record<string, { count: number; hash: string }> = {};
  for (const name of tables) {
    const rows = (await pool.query("SELECT to_jsonb(t)::text AS value FROM " + name + " t")).rows.map(r => r.value).sort();
    result[name] = { count: rows.length, hash: createHash("sha256").update(rows.join("\n")).digest("hex") };
  }
  return result;
}

test("Phase 4 — HTTP + PostgreSQL: catalog, warranty, SLA, intake nguyên tử và tranh khóa", async t => {
  const runtime = runtimeConfig(), admin = createPool(runtime);
  let live: Awaited<ReturnType<typeof serve>> | undefined, auth: ReturnType<typeof createAuth> | undefined, created = false;
  const schema = "phase2_test_p4_" + process.pid + "_" + randomBytes(6).toString("hex"), pool = createPool(runtime, schema);
  let clock = new Date("2026-09-28T09:00:00+07:00").getTime();
  const now = () => new Date(clock);
  const publicBefore = await fingerprint(admin);
  const sequenceBefore = (await admin.query("SELECT last_value::text,is_called FROM ticket_code_seq")).rows;
  try {
    assert.equal((await checkDatabase(admin)).can_create_schema, true);
    assert.match(schema, /^phase2_test_p4_[a-z0-9_]+$/);
    await admin.query('CREATE SCHEMA "' + schema + '"'); created = true;
    await migrate(pool);
    const identity = await testIdentity(); await seed(pool, identity.config);
    auth = createAuth(identity.config, identity.credentials, { ttlSeconds: 3600, maxSessions: 100 });
    const services = { customers: createCustomerService(pool, now), devices: createDeviceService(pool, identity.config, now), now };
    const intake = { catalog: createCatalogService(pool, identity.config), warranty: createWarrantyService(pool, now), tickets: createTicketService(pool, identity.config, now) };
    live = await serve(createApp(auth, services, intake));
    const tokens: Record<string, string> = {};
    for (const user of ["nv_demo_a", "nv_demo_b", "ql_demo_ab"]) {
      const r: Response = await fetch(live.url + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: user, password: identity.password }) });
      assert.equal(r.status, 200); tokens[user] = (await r.json()).data.access_token;
    }
    async function api(method: string, path: string, body?: unknown, user = "nv_demo_a") {
      const headers: Record<string, string> = {};
      if (user) headers.authorization = "Bearer " + (tokens[user] ?? user);
      if (body !== undefined) headers["content-type"] = "application/json";
      const r = await fetch(live!.url + "/api" + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      const raw = await r.text();
      return { status: r.status, body: raw ? JSON.parse(raw) : null, raw, headers: r.headers };
    }
    let counter = 0;
    async function make(date: string | null = "2026-09-01", product = 101, user = "nv_demo_a") {
      const suffix = String(++counter).padStart(6, "0");
      const c = await api("POST", "/customers", { full_name: "Khách P4 " + suffix, phone: "0874" + suffix }, user);
      assert.equal(c.status, 201);
      const d = await api("POST", "/customers/" + c.body.data.customer_id + "/devices", { product_id: product, serial_no: "P4-" + suffix, purchase_date: date }, user);
      assert.equal(d.status, 201);
      return { customer_id: c.body.data.customer_id as number, device_id: d.body.data.device_id as number,
        center_id: user === "nv_demo_b" ? 2 : 1, category_id: 1, priority: "CAO", issue_desc: " Lỗi tiếp nhận 😀 " };
    }
    const counts = async () => (await pool.query("SELECT (SELECT count(*)::int FROM ticket) AS tickets,(SELECT count(*)::int FROM ticket_status_log) AS logs")).rows[0];
    const base = await make();

    await t.test("P4-I01 E05–E08 auth/role401/403 trước validation; E09–E13 vẫn404", async () => {
      for (const [method, path, body] of [["GET", "/products"], ["GET", "/issue-categories"], ["GET", "/devices/1/warranty"], ["POST", "/tickets", {}]] as const) {
        for (const user of ["", "invalid"]) {
          const r = await api(method, path, body, user); assert.equal(r.status, 401); assert.equal(r.body.error.code, "AUTHENTICATION_REQUIRED");
        }
        const r = await api(method, path, body, "ql_demo_ab"); assert.equal(r.status, 403); assert.equal(r.body.error.code, "ROLE_FORBIDDEN");
      }
      for (const [method, path, body] of [["GET", "/tickets"], ["GET", "/tickets/1"], ["POST", "/tickets/1/warranty-approval", {}], ["GET", "/tickets/1/communications"], ["POST", "/tickets/1/communications", {}]] as const)
        assert.equal((await api(method, path, body)).status, 404);
    });
    await t.test("P4-I02 E05 exact config, numeric paging, inactive/empty, query/body errors", async () => {
      const r = await api("GET", "/products"); assert.equal(r.status, 200);
      assert.deepEqual(r.body, { data: identity.config.products.filter(p => p.is_active).map(({ product_id, product_name, warranty_months }) => ({ product_id, product_name, warranty_months })), meta: { page: 1, size: 20, total: 3 } });
      assert.deepEqual((await api("GET", "/products?page=2&size=2")).body.data.map((p: { product_id: number }) => p.product_id), [103]);
      assert.deepEqual((await api("GET", "/products?page=9007199254740991&size=100")).body.data, []);
      for (const q of ["page=0", "size=101", "size=-1", "page=1.1", "page=9007199254740992", "size=", "page=1&page=2", "q=x"])
        assert.equal((await api("GET", "/products?" + q)).status, 400);
      const input = structuredClone(identity.config);
      const emptyConfig = validateReference({ ...input, products: input.products.map(p => ({ ...p, is_active: false })) });
      const empty = await serve(createApp(auth!, undefined, { ...intake, catalog: createCatalogService(pool, emptyConfig) }));
      try {
        const result = await fetch(empty.url + "/api/products", { headers: { authorization: "Bearer " + tokens.nv_demo_a } });
        assert.equal(result.status, 200); assert.deepEqual(await result.json(), { data: [], meta: { page: 1, size: 20, total: 0 } });
      } finally { await empty.close(); }
      const bodyResponse = await new Promise<number>((resolve, reject) => {
        const req = request(live!.url + "/api/products", { method: "GET", headers: { authorization: "Bearer " + tokens.nv_demo_a, "content-type": "application/json", "content-length": "2" } }, res => { res.resume(); res.on("end", () => resolve(res.statusCode!)); });
        req.on("error", reject); req.end("{}");
      }); assert.equal(bodyResponse, 400);
    });
    await t.test("P4-I03 E06 sáu nhãn, active/empty, không default_priority và không query", async () => {
      const r = await api("GET", "/issue-categories"); assert.equal(r.status, 200);
      assert.deepEqual(r.body, { data: ["Màn hình", "Pin", "Sạc", "Phần mềm", "Nước vào", "Khác"].map((category_name, i) => ({ category_id: i + 1, category_name })) });
      const before = await fingerprint(pool);
      assert.equal((await api("GET", "/issue-categories?page=1")).status, 400);
      await pool.query("UPDATE issue_category SET is_active=false WHERE category_id=1");
      assert.equal((await api("GET", "/issue-categories")).body.data.length, 5);
      await pool.query("UPDATE issue_category SET is_active=false");
      assert.deepEqual((await api("GET", "/issue-categories")).body, { data: [] });
      await pool.query("UPDATE issue_category SET is_active=true");
      assert.deepEqual(await fingerprint(pool), before);
    });
    await t.test("P4-I04 E07 còn/hết/NULL, leap/clamp/inclusive/0/120 và DATE không timestamp", async () => {
      for (const [purchase, product, assessed, expires, status] of [
        ["2026-09-01", 101, "2027-09-01", "2027-09-01", "CON_BAO_HANH"],
        ["2026-09-01", 101, "2027-09-02", "2027-09-01", "HET_BAO_HANH"],
        [null, 101, "2026-09-28", null, "CHUA_XAC_MINH"],
        ["2024-02-29", 101, "2025-02-28", "2025-02-28", "CON_BAO_HANH"],
        ["2026-09-28", 102, "2026-09-28", "2026-09-28", "CON_BAO_HANH"],
        ["2026-09-28", 102, "2026-09-29", "2026-09-28", "HET_BAO_HANH"],
        ["2020-01-31", 103, "2030-01-31", "2030-01-31", "CON_BAO_HANH"],
      ] as const) {
        const input = await make(purchase, product), device = (await pool.query("SELECT warranty_months FROM device WHERE device_id=$1", [input.device_id])).rows[0];
        const r = await api("GET", "/devices/" + input.device_id + "/warranty?assessment_date=" + assessed);
        assert.equal(r.status, 200);
        assert.deepEqual(r.body, { data: { device_id: input.device_id, assessed_on: assessed, purchase_date: purchase,
          warranty_months: device.warranty_months, warranty_expires_on: expires, warranty_status: status, requires_approval: status === "CHUA_XAC_MINH" } });
      }
      const input = await make("2026-01-31");
      await pool.query("UPDATE device SET warranty_months=1 WHERE device_id=$1", [input.device_id]);
      assert.equal((await api("GET", "/devices/" + input.device_id + "/warranty?assessment_date=2026-02-28")).body.data.warranty_expires_on, "2026-02-28");
      for (const suffix of ["2026-01-30", "2026-02-29", "2026-09-28T09:00:00%2B07:00", ""]) {
        const r = await api("GET", "/devices/" + input.device_id + "/warranty?assessment_date=" + suffix);
        assert.equal(r.status, 400); assert.equal(r.body.error.code, "VALIDATION_FAILED"); assert.ok(r.body.error.fields.assessment_date);
      }
      for (const suffix of ["?assessment_date=2026-09-28&assessment_date=2026-09-29", "?foo=x"])
        assert.equal((await api("GET", "/devices/" + input.device_id + "/warranty" + suffix)).status, 400);
      assert.equal((await api("GET", "/devices/9007199254740992/warranty")).status, 400);
    });
    await t.test("P4-I05 E07 không ghi toàn bộ7 bảng/sequence, clock+07 tại ranh UTC", async () => {
      const before = await fingerprint(pool), seq = (await pool.query("SELECT last_value::text,is_called FROM ticket_code_seq")).rows;
      clock = new Date("2026-09-27T17:00:00.123Z").getTime();
      const r = await api("GET", "/devices/" + base.device_id + "/warranty");
      assert.equal(r.body.data.assessed_on, "2026-09-28");
      assert.deepEqual(await fingerprint(pool), before);
      assert.deepEqual((await pool.query("SELECT last_value::text,is_called FROM ticket_code_seq")).rows, seq);
      clock = new Date("2026-09-28T09:00:00+07:00").getTime();
    });
    await t.test("P4-I06 E07 scope/soft delete customer hoặc device404, không lộ hồ sơ", async () => {
      const other = await make(null, 101, "nv_demo_b"), stopped = await make();
      assert.equal((await api("DELETE", "/customers/" + stopped.customer_id)).status, 204);
      const deleted = await make();
      assert.equal((await api("DELETE", "/customers/" + deleted.customer_id + "/devices/" + deleted.device_id)).status, 204);
      for (const id of [other.device_id, stopped.device_id, deleted.device_id, 9999999]) {
        const r = await api("GET", "/devices/" + id + "/warranty");
        assert.equal(r.status, 404); assert.equal(r.body.error.code, "DEVICE_NOT_FOUND");
        assert.deepEqual(Object.keys(r.body.error).sort(), ["code", "message", "fields"].sort());
      }
    });
    await t.test("P4-I07 E08 ba matrix201, exact DTO/Location, actor/time/MOI và1 log cùng commit", async () => {
      for (const [purchase, expires, status, approval, can_proceed] of [
        ["2026-09-01", "2027-09-01", "CON_BAO_HANH", "KHONG_CAN", true],
        ["2020-09-01", "2021-09-01", "HET_BAO_HANH", "KHONG_CAN", true],
        [null, null, "CHUA_XAC_MINH", "CHO_PHE_DUYET", false],
      ] as const) {
        const input = await make(purchase), r = await api("POST", "/tickets", input);
        assert.equal(r.status, 201); const data = r.body.data;
        assert.equal(r.headers.get("location"), "/api/tickets/" + data.ticket_id);
        assert.match(data.ticket_code, /^BH-1\d{6}\/2026$/);
        assert.deepEqual(r.body, { data: { ticket_id: data.ticket_id, ticket_code: data.ticket_code, ...input, issue_desc: input.issue_desc.trim(), status: "MOI",
          received_at: "2026-09-28T09:00:00.000+07:00", due_date: "2026-09-29T09:00:00.000+07:00", assessed_on: "2026-09-28",
          purchase_date_snapshot: purchase, warranty_months_snapshot: 12, warranty_expires_on: expires, warranty_status: status, approval_status: approval,
          approved_by: null, approved_at: null, approval_note: null, can_proceed } });
        const persisted = (await pool.query("SELECT received_by::int,received_at,due_date,status FROM ticket WHERE ticket_id=$1", [data.ticket_id])).rows[0];
        assert.equal(persisted.received_by, 11); assert.equal(persisted.received_at.getTime(), clock); assert.equal(persisted.status, "MOI");
        const logs = (await pool.query("SELECT from_status,to_status,changed_by::int,changed_at,note FROM ticket_status_log WHERE ticket_id=$1", [data.ticket_id])).rows;
        assert.deepEqual(logs, [{ from_status: null, to_status: "MOI", changed_by: 11, changed_at: now(), note: null }]);
      }
      const r = await api("POST", "/tickets", { ...base, priority: "THAP", category_id: 2 });
      assert.equal(r.status, 201); assert.equal(r.body.data.priority, "THAP"); assert.equal(r.body.data.due_date, "2026-10-03T09:00:00.000+07:00");
    });
    await t.test("P4-I08 E08 thiếu/sai priority, safe ID/kiểu/Unicode/readonly/media/query không ghi DB", async () => {
      const before = await counts();
      const bad: unknown[] = [null, [], { ...base, priority: "" }, { ...base, priority: null }, { ...base, issue_desc: "\uFEFF\u3000" }, { ...base, issue_desc: "😀".repeat(2001) }, { ...base, issue_desc: "\ud800" }];
      const missing = { ...base } as Record<string, unknown>; delete missing.priority; bad.push(missing);
      for (const key of ["customer_id", "device_id", "center_id", "category_id"]) for (const value of ["1", null, 0, -1, 1.5, 9007199254740992]) bad.push({ ...base, [key]: value });
      for (const key of ["ticket_id", "ticket_code", "received_at", "due_date", "received_by", "status", "assessed_on", "purchase_date_snapshot", "warranty_months_snapshot", "warranty_expires_on", "warranty_status", "approval_status", "approved_by", "approved_at", "approval_note", "can_proceed", "role", "allowed_center_ids"])
        bad.push({ ...base, [key]: "client" });
      for (const body of bad) {
        const r = await api("POST", "/tickets", body); assert.equal(r.status, 400); assert.equal(r.body.error.code, "VALIDATION_FAILED");
        assert.deepEqual(Object.keys(r.body.error).sort(), ["code", "message", "fields"].sort());
      }
      for (const [content, body, status] of [["application/json", "{", 400], ["text/plain", "{}", 415]] as const) {
        const r = await fetch(live!.url + "/api/tickets", { method: "POST", headers: { authorization: "Bearer " + tokens.nv_demo_a, "content-type": content }, body });
        assert.equal(r.status, status);
      }
      assert.equal((await api("POST", "/tickets?foo=x", base)).status, 400);
      assert.deepEqual(await counts(), before);
    });
    await t.test("P4-I09 E08 scope403/404, owner409, category400 và tombstone không tạo ticket/log", async () => {
      const sameCenter = await make(), otherCenter = await make(null, 101, "nv_demo_b");
      const stopped = await make(), deleted = await make();
      await api("DELETE", "/customers/" + stopped.customer_id);
      await api("DELETE", "/customers/" + deleted.customer_id + "/devices/" + deleted.device_id);
      const before = await counts();
      for (const [input, status, code] of [
        [{ ...base, center_id: 2 }, 403, "ROLE_FORBIDDEN"], [{ ...base, center_id: 999999 }, 403, "ROLE_FORBIDDEN"],
        [{ ...base, customer_id: otherCenter.customer_id }, 404, "CUSTOMER_NOT_FOUND"],
        [{ ...base, device_id: otherCenter.device_id }, 404, "DEVICE_NOT_FOUND"],
        [{ ...base, device_id: sameCenter.device_id }, 409, "DEVICE_OWNER_MISMATCH"],
        [{ ...base, customer_id: Number.MAX_SAFE_INTEGER }, 404, "CUSTOMER_NOT_FOUND"],
        [{ ...base, device_id: Number.MAX_SAFE_INTEGER }, 404, "DEVICE_NOT_FOUND"],
        [stopped, 404, "CUSTOMER_NOT_FOUND"], [deleted, 404, "DEVICE_NOT_FOUND"],
        [{ ...base, category_id: Number.MAX_SAFE_INTEGER }, 400, "VALIDATION_FAILED"],
      ] as const) {
        const r = await api("POST", "/tickets", input); assert.equal(r.status, status); assert.equal(r.body.error.code, code);
        assert.deepEqual(Object.keys(r.body.error).sort(), ["code", "message", "fields"].sort());
        if (code === "VALIDATION_FAILED") assert.ok(r.body.error.fields.category_id);
      }
      await pool.query("UPDATE issue_category SET is_active=false WHERE category_id=1");
      try { const r = await api("POST", "/tickets", base); assert.equal(r.status, 400); assert.ok(r.body.error.fields.category_id); }
      finally { await pool.query("UPDATE issue_category SET is_active=true WHERE category_id=1"); }
      assert.deepEqual(await counts(), before);
    });
    await t.test("P4-I10 E08 Unicode1/2000, lưu trim và lấy tháng device chứ không product hiện tại", async () => {
      const input = await make("2026-01-31");
      await pool.query("UPDATE device SET warranty_months=1 WHERE device_id=$1", [input.device_id]);
      for (const desc of ["\uFEFF😀\u3000", "😀".repeat(2000)]) {
        const r = await api("POST", "/tickets", { ...input, issue_desc: desc });
        assert.equal(r.status, 201); assert.equal(r.body.data.issue_desc, desc.trim());
        assert.equal(r.body.data.warranty_months_snapshot, 1); assert.equal(r.body.data.warranty_expires_on, "2026-02-28");
      }
    });
    await t.test("P4-I11 E08 tính lại preview; PATCH/seed giữ snapshot/SLA/log cũ, hai thời điểm độc lập", async () => {
      const input = await make(null);
      const preview = await api("GET", "/devices/" + input.device_id + "/warranty?assessment_date=2030-01-01");
      assert.equal(preview.body.data.assessed_on, "2030-01-01");
      const first = await api("POST", "/tickets", input); assert.equal(first.status, 201); assert.equal(first.body.data.assessed_on, "2026-09-28");
      const original = (await pool.query("SELECT to_jsonb(t) AS value FROM ticket t WHERE ticket_id=$1", [first.body.data.ticket_id])).rows;
      assert.equal((await api("PATCH", "/customers/" + input.customer_id + "/devices/" + input.device_id, { purchase_date: "2026-09-01" })).status, 200);
      clock += 24 * 3600000;
      const second = await api("POST", "/tickets", input); assert.equal(second.status, 201);
      assert.equal(second.body.data.assessed_on, "2026-09-29"); assert.equal(second.body.data.purchase_date_snapshot, "2026-09-01");
      assert.equal(second.body.data.approval_status, "KHONG_CAN");
      assert.equal(first.body.data.approval_status, "CHO_PHE_DUYET"); assert.equal(first.body.data.purchase_date_snapshot, null);
      const beforeSeed = await fingerprint(pool); await seed(pool, identity.config);
      assert.deepEqual(await fingerprint(pool), beforeSeed);
      assert.deepEqual((await pool.query("SELECT to_jsonb(t) AS value FROM ticket t WHERE ticket_id=$1", [first.body.data.ticket_id])).rows, original);
      clock -= 24 * 3600000;
    });
    await t.test("P4-I12 lỗi INSERT log PostgreSQL thật rollback ticket; sequence gap được phép/pool còn dùng", async () => {
      const before = await counts(), seq = BigInt((await pool.query("SELECT last_value::text AS value FROM ticket_code_seq")).rows[0].value);
      // Constraint chỉ trong schema test; NOT VALID giữ nguyên lịch sử nhưng chặn INSERT mới.
      await pool.query("ALTER TABLE ticket_status_log ADD CONSTRAINT p4_force_log_failure CHECK(changed_by <> 11) NOT VALID");
      try {
        const r = await api("POST", "/tickets", base); assert.equal(r.status, 500); assert.equal(r.body.error.code, "INTERNAL_ERROR");
        assert.ok(!r.raw.includes("p4_force_log_failure")); assert.equal(r.headers.get("location"), null);
        assert.deepEqual(await counts(), before);
      } finally { await pool.query("ALTER TABLE ticket_status_log DROP CONSTRAINT p4_force_log_failure"); }
      const r = await api("POST", "/tickets", base); assert.equal(r.status, 201);
      assert.equal(BigInt(r.body.data.ticket_code.split("/")[0].slice(3)), seq + 2n);
    });
    await t.test("P4-I13 concurrent10 E08 cùng thiết bị đều201, unique code và một initial log mỗi phiếu", async () => {
      const before = await counts(), results = await Promise.all(Array.from({ length: 10 }, () => api("POST", "/tickets", base)));
      results.forEach(r => assert.equal(r.status, 201));
      assert.equal(new Set(results.map(r => r.body.data.ticket_code)).size, 10);
      assert.equal(new Set(results.map(r => r.body.data.ticket_id)).size, 10);
      assert.deepEqual(await counts(), { tickets: before.tickets + 10, logs: before.logs + 10 });
      const ids = results.map(r => r.body.data.ticket_id);
      const rows = (await pool.query("SELECT t.ticket_id::text,count(l.log_id)::int AS logs FROM ticket t LEFT JOIN ticket_status_log l USING(ticket_id) WHERE t.ticket_id=ANY($1::bigint[]) GROUP BY t.ticket_id", [ids])).rows;
      assert.equal(rows.length, 10); rows.forEach(r => assert.equal(r.logs, 1));
    });

    async function waitLocks(kind: "customer" | "device" | "category", count: number) {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const r = await admin.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND usename=current_user AND wait_event_type='Lock' AND query LIKE $1", ["/* l2:" + kind + "-lock */%"]);
        if (r.rows[0].n >= count) return;
        // Chỉ nhường event loop; tiến trình theo pg_stat_activity, không theo sleep giả định.
        await new Promise<void>(resolve => setImmediate(resolve));
      }
      throw new Error("Không quan sát đủ transaction đang chờ khóa " + kind);
    }
    async function orderAtCustomer(input: typeof base, first: () => ReturnType<typeof api>, second: () => ReturnType<typeof api>) {
      const blocker = await pool.connect(); let a: ReturnType<typeof api> | undefined, b: ReturnType<typeof api> | undefined;
      try {
        await blocker.query("BEGIN"); await blocker.query("SELECT customer_id FROM customer WHERE customer_id=$1 FOR UPDATE", [input.customer_id]);
        a = first(); await waitLocks("customer", 1); b = second(); await waitLocks("customer", 2);
        await blocker.query("COMMIT"); return await Promise.all([a, b]);
      } finally { await blocker.query("ROLLBACK"); blocker.release(); await Promise.allSettled([a, b]); }
    }
    await t.test("P4-I14 DELETE Customer thắng E08 đang chờ:404 không insert; E08 thắng giữ lịch sử", async () => {
      const input = await make(), before = await counts();
      const [del, ticket] = await orderAtCustomer(input, () => api("DELETE", "/customers/" + input.customer_id), () => api("POST", "/tickets", input));
      assert.equal(del.status, 204); assert.equal(ticket.status, 404); assert.equal(ticket.body.error.code, "CUSTOMER_NOT_FOUND"); assert.deepEqual(await counts(), before);
      const next = await make();
      const [saved, stopped] = await orderAtCustomer(next, () => api("POST", "/tickets", next), () => api("DELETE", "/customers/" + next.customer_id));
      assert.equal(saved.status, 201); assert.equal(stopped.status, 204);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM ticket_status_log WHERE ticket_id=$1", [saved.body.data.ticket_id])).rows[0].n, 1);
    });
    await t.test("P4-I15 DELETE Device thắng E08:404 không insert, tombstone giữ quan hệ", async () => {
      const input = await make(), before = await counts();
      const [del, ticket] = await orderAtCustomer(input, () => api("DELETE", "/customers/" + input.customer_id + "/devices/" + input.device_id), () => api("POST", "/tickets", input));
      assert.equal(del.status, 204); assert.equal(ticket.status, 404); assert.equal(ticket.body.error.code, "DEVICE_NOT_FOUND"); assert.deepEqual(await counts(), before);
    });
    await t.test("P4-I16 PATCH ngày mua thắng E08 thì snapshot mới; E08 khóa device trước thì snapshot cũ", async () => {
      const input = await make(null), path = "/customers/" + input.customer_id + "/devices/" + input.device_id;
      const [patched, saved] = await orderAtCustomer(input, () => api("PATCH", path, { purchase_date: "2026-09-01" }), () => api("POST", "/tickets", input));
      assert.equal(patched.status, 200); assert.equal(saved.status, 201); assert.equal(saved.body.data.purchase_date_snapshot, "2026-09-01");
      const blocker = await pool.connect(); let ticket: ReturnType<typeof api> | undefined, patch: ReturnType<typeof api> | undefined;
      try {
        await blocker.query("BEGIN"); await blocker.query("SELECT device_id FROM device WHERE device_id=$1 FOR UPDATE", [input.device_id]);
        ticket = api("POST", "/tickets", input); await waitLocks("device", 1);
        patch = api("PATCH", path, { purchase_date: null }); await waitLocks("customer", 1);
        await blocker.query("COMMIT");
        const [a, b] = await Promise.all([ticket, patch]);
        assert.equal(a.status, 201); assert.equal(b.status, 200); assert.equal(a.body.data.purchase_date_snapshot, "2026-09-01");
        assert.equal((await api("GET", "/devices/" + input.device_id + "/warranty")).body.data.purchase_date, null);
      } finally { await blocker.query("ROLLBACK"); blocker.release(); await Promise.allSettled([ticket, patch]); }
    });
    await t.test("P4-I17 Category khóa/recheck khi inactive cạnh tranh, không lưu category cũ", async () => {
      const blocker = await pool.connect(); let pending: ReturnType<typeof api> | undefined;
      const before = await counts();
      try {
        await blocker.query("BEGIN"); await blocker.query("UPDATE issue_category SET is_active=false WHERE category_id=1");
        pending = api("POST", "/tickets", base); await waitLocks("category", 1); await blocker.query("COMMIT");
        const r = await pending; assert.equal(r.status, 400); assert.ok(r.body.error.fields.category_id); assert.deepEqual(await counts(), before);
      } finally {
        await blocker.query("ROLLBACK"); blocker.release(); await Promise.allSettled([pending]);
        await pool.query("UPDATE issue_category SET is_active=true WHERE category_id=1");
      }
    });
    await t.test("P4-I18 E08 clock thực hiện sau khóa, SLA Chủ nhật/+07/milliseconds và code qua năm không reset", async () => {
      const input = await make(null);
      clock = new Date("2026-10-04T09:00:00.123+07:00").getTime();
      const r = await api("POST", "/tickets", input); assert.equal(r.status, 201);
      assert.equal(r.body.data.due_date, "2026-10-06T00:00:00.000+07:00");
      assert.equal(r.body.data.received_at, timestamp(now()));
      clock = new Date("2026-12-31T23:59:59.987+07:00").getTime();
      const a = await api("POST", "/tickets", input); assert.equal(a.status, 201); assert.ok(a.body.data.ticket_code.endsWith("/2026"));
      clock = new Date("2027-01-01T00:00:00.987+07:00").getTime();
      const b = await api("POST", "/tickets", input); assert.equal(b.status, 201); assert.ok(b.body.data.ticket_code.endsWith("/2027"));
      const number = (code: string) => BigInt(code.split("/")[0]!.slice(3));
      assert.equal(number(b.body.data.ticket_code), number(a.body.data.ticket_code) + 1n);
      assert.ok(b.body.data.due_date.includes(".987+07:00"));
      clock = new Date("2026-09-28T09:00:00+07:00").getTime();
    });
    await t.test("P4-I19 PG CHECK/FK/UNIQUE bảo toàn matrix/snapshot/metadata/due/log, không ticket thiếu log", async () => {
      const saved = await api("POST", "/tickets", base); assert.equal(saved.status, 201);
      const id = saved.body.data.ticket_id;
      for (const [sql, params, code] of [
        ["UPDATE ticket SET due_date=received_at WHERE ticket_id=$1", [id], "23514"],
        ["UPDATE ticket SET warranty_expires_on=NULL WHERE ticket_id=$1", [id], "23514"],
        ["UPDATE ticket SET approval_status='CHO_PHE_DUYET' WHERE ticket_id=$1", [id], "23514"],
        ["UPDATE ticket SET approved_by=11 WHERE ticket_id=$1", [id], "23514"],
        ["UPDATE ticket SET device_id=99999999 WHERE ticket_id=$1", [id], "23503"],
        ["UPDATE ticket SET category_id=99999999 WHERE ticket_id=$1", [id], "23503"],
        ["UPDATE ticket SET ticket_code=(SELECT ticket_code FROM ticket WHERE ticket_id<>$1 LIMIT 1) WHERE ticket_id=$1", [id], "23505"],
        ["INSERT INTO ticket_status_log(ticket_id,from_status,to_status,changed_by) VALUES($1,NULL,'MOI',11)", [id], "23505"],
      ] as const) {
        await assert.rejects(withTransaction(pool, async client => { await client.query(sql, [...params]); }), { code });
      }
      const orphan = (await pool.query("SELECT count(*)::int AS n FROM ticket t LEFT JOIN ticket_status_log l ON l.ticket_id=t.ticket_id AND l.from_status IS NULL GROUP BY t.ticket_id HAVING count(l.log_id)<>1")).rows;
      assert.deepEqual(orphan, []);
      const names = (await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() ORDER BY table_name")).rows.map(r => r.table_name);
      assert.deepEqual(names, [...tables].sort());
      const constraints = (await pool.query("SELECT count(*)::int AS n FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname=current_schema() AND c.contype='f'")).rows[0].n;
      assert.equal(constraints, 5);
    });
    await t.test("P4-I20 E08 center2 actor12, snapshot0/120 và ngày mua tương lai bị từ chối", async () => {
      const input = await make(null, 101, "nv_demo_b");
      const r = await api("POST", "/tickets", input, "nv_demo_b");
      assert.equal(r.status, 201); assert.equal(r.body.data.center_id, 2);
      const actors = (await pool.query("SELECT received_by::int,changed_by::int FROM ticket JOIN ticket_status_log USING(ticket_id) WHERE ticket_id=$1", [r.body.data.ticket_id])).rows[0];
      assert.deepEqual(actors, { received_by: 12, changed_by: 12 });
      for (const [product, purchase, months, expiry] of [[102, "2026-09-28", 0, "2026-09-28"], [103, "2020-09-28", 120, "2030-09-28"]] as const) {
        const value = await make(purchase, product), saved = await api("POST", "/tickets", value);
        assert.equal(saved.status, 201); assert.equal(saved.body.data.warranty_months_snapshot, months);
        assert.equal(saved.body.data.warranty_expires_on, expiry); assert.equal(saved.body.data.warranty_status, "CON_BAO_HANH");
      }
      const future = await make(null);
      await pool.query("UPDATE device SET purchase_date='2026-09-29' WHERE device_id=$1", [future.device_id]);
      const before = await counts(), rejected = await api("POST", "/tickets", future);
      assert.equal(rejected.status, 400); assert.ok(rejected.body.error.fields.assessment_date); assert.deepEqual(await counts(), before);
    });
    await t.test("P4-I21 clock lấy sau khóa, qua nửa đêm cùng assessed_on/received_at/log", async () => {
      const input = await make(null), blocker = await pool.connect();
      let pending: ReturnType<typeof api> | undefined;
      try {
        await blocker.query("BEGIN"); await blocker.query("SELECT customer_id FROM customer WHERE customer_id=$1 FOR UPDATE", [input.customer_id]);
        clock = new Date("2026-09-28T23:59:59.987+07:00").getTime();
        pending = api("POST", "/tickets", input); await waitLocks("customer", 1);
        clock = new Date("2026-09-29T00:00:00.123+07:00").getTime();
        await blocker.query("COMMIT");
        const r = await pending; assert.equal(r.status, 201);
        assert.equal(r.body.data.assessed_on, "2026-09-29"); assert.equal(r.body.data.received_at, timestamp(now()));
        const log = (await pool.query("SELECT changed_at FROM ticket_status_log WHERE ticket_id=$1", [r.body.data.ticket_id])).rows[0];
        assert.equal(log.changed_at.getTime(), clock);
      } finally {
        await blocker.query("ROLLBACK"); blocker.release(); await Promise.allSettled([pending]);
        clock = new Date("2026-09-28T09:00:00+07:00").getTime();
      }
    });
    await t.test("P4-I22 public7 bảng và sequence không đổi qua toàn bộ HTTP/PG test", async () => {
      assert.deepEqual(await fingerprint(admin), publicBefore);
      assert.deepEqual((await admin.query("SELECT last_value::text,is_called FROM ticket_code_seq")).rows, sequenceBefore);
    });
  } finally {
    await live?.close(); auth?.close(); await pool.end();
    try {
      if (created && /^phase2_test_p4_[a-z0-9_]+$/.test(schema)) await admin.query('DROP SCHEMA "' + schema + '" CASCADE');
      assert.deepEqual(await fingerprint(admin), publicBefore);
    } finally { await admin.end(); }
  }
});
