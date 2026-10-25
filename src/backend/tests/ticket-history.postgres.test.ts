import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { request } from "node:http";
import type { Pool } from "pg";
import { createPool, checkDatabase, withTransaction } from "../src/db.ts";
import { runtimeConfig } from "../src/runtime-config.ts";
import { migrate } from "../src/migrate.ts";
import { seed } from "../src/seed.ts";
import { createAuth } from "../src/auth.ts";
import { createApp } from "../src/app.ts";
import { createCustomerService } from "../src/services/customers.service.ts";
import { createDeviceService } from "../src/services/devices.service.ts";
import { createCatalogService } from "../src/services/catalog.service.ts";
import { createWarrantyService } from "../src/services/warranty.service.ts";
import { createTicketService } from "../src/services/tickets.service.ts";
import { ticketRepository } from "../src/repositories/tickets.repository.ts";
import { validateReference } from "../src/reference-config.ts";
import { timestamp } from "../src/domain/business-time.ts";
import { testIdentity, serve } from "./helpers.ts";

const names = ["customer", "device", "issue_category", "ticket", "ticket_status_log", "ticket_communication", "schema_migration"] as const;
async function fingerprints(pool: Pool, tables: readonly typeof names[number][] = names) {
  const result: Record<string, { count: number; hash: string }> = {};
  for (const name of tables) {
    const rows = (await pool.query("SELECT to_jsonb(t)::text AS value FROM " + name + " t")).rows.map(r => r.value).sort();
    result[name] = { count: rows.length, hash: createHash("sha256").update(rows.join("\n")).digest("hex") };
  }
  return result;
}
async function stateHash(pool: Pool) { return createHash("sha256").update(JSON.stringify(await fingerprints(pool))).digest("hex"); }
test("Phase 5 — HTTP + PostgreSQL: approval, communications, NFR02 và liên thông L2", async t => {
  const runtime = runtimeConfig(), admin = createPool(runtime);
  const schema = "phase2_test_p5_" + process.pid + "_" + randomBytes(6).toString("hex"), pool = createPool(runtime, schema);
  let created = false, live: Awaited<ReturnType<typeof serve>> | undefined, auth: ReturnType<typeof createAuth> | undefined;
  let clock = new Date("2026-09-28T10:00:00.123+07:00").getTime(); const now = () => new Date(clock);
  const publicBefore = await fingerprints(admin), seqBefore = (await admin.query("SELECT last_value::text,is_called FROM ticket_code_seq")).rows;
  try {
    assert.equal((await checkDatabase(admin)).can_create_schema, true);
    assert.match(schema, /^phase2_test_p5_[a-z0-9_]+$/); await admin.query('CREATE SCHEMA "' + schema + '"'); created = true;
    await migrate(pool); const identity = await testIdentity(); await seed(pool, identity.config);
    // Chỉ tăng identity trong schema test để bắt ORDER BY số qua ranh999/1000 và99/100.
    await pool.query("SELECT setval(pg_get_serial_sequence('ticket','ticket_id'),998,true)");
    await pool.query("SELECT setval(pg_get_serial_sequence('ticket_communication','communication_id'),98,true)");
    // Adapter mutable chỉ cho test account bị vô hiệu hóa; config production vẫn frozen.
    const accounts = identity.config.accounts.map(a => ({ ...a }));
    auth = createAuth({ ...identity.config, accounts }, identity.credentials, { ttlSeconds: 3600, maxSessions: 100 });
    const tickets = createTicketService(pool, identity.config, now);
    const services = { customers: createCustomerService(pool, now), devices: createDeviceService(pool, identity.config, now), now };
    const intake = { catalog: createCatalogService(pool, identity.config), warranty: createWarrantyService(pool, now), tickets };
    live = await serve(createApp(auth, services, intake, tickets));
    const tokens: Record<string, string> = {};
    async function login(user: string) {
      const r: Response = await fetch(live!.url + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: user, password: identity.password }) });
      const body = await r.json(); if (r.status === 200) tokens[user] = body.data.access_token;
      return { status: r.status, body };
    }
    for (const user of ["nv_demo_a", "nv_demo_b", "ql_demo_a", "ql_demo_ab"]) assert.equal((await login(user)).status, 200);
    async function api(method: string, path: string, body?: unknown, user = "nv_demo_a", extra: Record<string, string> = {}, url = live!.url) {
      const headers: Record<string, string> = { ...extra };
      if (user) headers.authorization ??= "Bearer " + (tokens[user] ?? user);
      if (body !== undefined) headers["content-type"] ??= "application/json";
      const r = await fetch(url + "/api" + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      const raw = await r.text(); return { status: r.status, body: raw ? JSON.parse(raw) : null, raw, headers: r.headers };
    }
    let counter = 0;
    async function profile(purchase: string | null = null, user = "nv_demo_a") {
      const suffix = String(++counter).padStart(6, "0"), phone = "0875" + suffix;
      const c = await api("POST", "/customers", { full_name: "Khách P5 " + suffix, phone }, user); assert.equal(c.status, 201);
      const d = await api("POST", "/customers/" + c.body.data.customer_id + "/devices", { product_id: 101, serial_no: "P5-" + suffix, purchase_date: purchase }, user); assert.equal(d.status, 201);
      return { customer: c.body.data, device: d.body.data, phone, user };
    }
    async function makeTicket(purchase: string | null = null, user = "nv_demo_a") {
      const value = await profile(purchase, user);
      const r = await api("POST", "/tickets", { customer_id: value.customer.customer_id, device_id: value.device.device_id, center_id: user === "nv_demo_b" ? 2 : 1, issue_desc: "Cần xác minh P5", category_id: 3, priority: "CAO" }, user);
      assert.equal(r.status, 201); return { ...value, ticket: r.body.data, location: r.headers.get("location")! };
    }
    const path = (id: number) => "/tickets/" + id;
    const rawTicket = async (id: number) => (await pool.query("SELECT to_jsonb(t) AS value FROM ticket t WHERE ticket_id=$1", [id])).rows[0].value;
    const unchangedTicketFields = (row: Record<string, unknown>) => Object.fromEntries(Object.entries(row).filter(([key]) => !["approval_status", "approved_by", "approved_at", "approval_note"].includes(key)));
    const base = await makeTicket(), center2 = await makeTicket(null, "nv_demo_b");

    await t.test("P5-I01 role từng endpoint,401/403 trước parse, không mở API ngoài L2", async () => {
      for (const [method, suffix, body] of [["GET", ""], ["GET", "/" + base.ticket.ticket_id], ["POST", "/" + base.ticket.ticket_id + "/warranty-approval", {}], ["GET", "/" + base.ticket.ticket_id + "/communications"], ["POST", "/" + base.ticket.ticket_id + "/communications", { content: "ok" }]] as const) {
        for (const user of ["", "invalid"]) { const r = await api(method, "/tickets" + suffix, body, user); assert.equal(r.status, 401); assert.equal(r.body.error.code, "AUTHENTICATION_REQUIRED"); }
      }
      assert.equal((await api("GET", "/tickets?size=bad")).status, 403);
      assert.equal((await api("POST", path(base.ticket.ticket_id) + "/warranty-approval", {}, "nv_demo_a")).status, 403);
      assert.equal((await api("POST", path(base.ticket.ticket_id) + "/communications", {}, "ql_demo_ab")).status, 403);
      for (const [method, suffix] of [["DELETE", ""], ["PATCH", ""], ["POST", "/assign"], ["POST", "/status"], ["DELETE", "/communications/99"], ["PATCH", "/communications/99"]])
        assert.equal((await api(method!, path(base.ticket.ticket_id) + suffix, {})).status, 404);
    });
    await t.test("P5-I02 E09 default/approved, scope1/1+2, exact DTO, numeric tie999/1000", async () => {
      for (const [user, centers] of [["ql_demo_a", [1]], ["ql_demo_ab", [1, 2]]] as const) for (const filter of ["CHO_PHE_DUYET", "DA_PHE_DUYET"]) {
        const r = await api("GET", "/tickets?approval_status=" + filter + "&size=100", undefined, user); assert.equal(r.status, 200);
        const expected = (await pool.query("SELECT t.ticket_id::text FROM ticket t WHERE t.center_id=ANY($1::bigint[]) AND t.warranty_status='CHUA_XAC_MINH' AND t.approval_status=$2 AND t.deleted_at IS NULL ORDER BY t.received_at,t.ticket_id", [centers, filter])).rows.map(x => Number(x.ticket_id));
        assert.deepEqual(r.body.data.map((x: { ticket_id: number }) => x.ticket_id), expected); assert.equal(r.body.meta.total, expected.length);
        for (const value of r.body.data) {
          assert.ok(centers.some(id => id === value.center_id)); assert.equal(value.warranty_status, "CHUA_XAC_MINH");
          assert.deepEqual(Object.keys(value).sort(), ["ticket_id", "ticket_code", "customer_id", "device_id", "center_id", "warranty_status", "approval_status", "status", "received_at", "due_date", "can_proceed"].sort());
          assert.equal(value.can_proceed, filter === "DA_PHE_DUYET"); assert.ok(value.received_at.endsWith("+07:00"));
        }
      }
      const defaults = await api("GET", "/tickets", undefined, "ql_demo_ab"); assert.deepEqual(defaults.body.meta.page, 1); assert.equal(defaults.body.meta.size, 20);
      const all = await api("GET", "/tickets?size=100", undefined, "ql_demo_ab");
      const end = all.body.data.slice(-2).map((x: { ticket_id: number }) => x.ticket_id); assert.deepEqual(end, [999, 1000]);
    });
    await t.test("P5-I03 E09 pagination sau scope, out-of-page/empty, query sai/lặp/body400", async () => {
      const all = await api("GET", "/tickets?size=100", undefined, "ql_demo_a");
      const page = await api("GET", "/tickets?page=2&size=3", undefined, "ql_demo_a");
      assert.deepEqual(page.body.data, all.body.data.slice(3, 6)); assert.equal(page.body.meta.total, all.body.meta.total);
      for (const q of ["page=99999", "page=9007199254740991&size=100"]) assert.deepEqual((await api("GET", "/tickets?" + q, undefined, "ql_demo_a")).body.data, []);
      for (const q of ["approval_status=KHONG_CAN", "approval_status=", "approval_status=CHO_PHE_DUYET&approval_status=DA_PHE_DUYET", "page=0", "page=1.2", "size=101", "size=", "center_id=2", "status=MOI", "technician_id=1", "page=1&page=2"])
        assert.equal((await api("GET", "/tickets?" + q, undefined, "ql_demo_ab")).status, 400);
      const status = await new Promise<number>((resolve, reject) => {
        const req = request(live!.url + "/api/tickets", { method: "GET", headers: { authorization: "Bearer " + tokens.ql_demo_ab, "content-length": "2", "content-type": "application/json" } }, res => { res.resume(); res.on("end", () => resolve(res.statusCode!)); }); req.on("error", reject); req.end("{}");
      }); assert.equal(status, 400);
      // Config test hợp lệ có center3 chưa có ticket, không thêm bảng/ghi config thật.
      const emptyConfig = validateReference({ ...identity.config, centers: [...identity.config.centers, { center_id: 3, center_name: "Center test rỗng", is_active: true }],
        accounts: accounts.map(a => a.employee_id === 21 ? { ...a, active_center_id: 3, allowed_center_ids: [3] } : a) });
      const emptyAuth = createAuth(emptyConfig, identity.credentials, { ttlSeconds: 3600, maxSessions: 100 });
      const emptyLive = await serve(createApp(emptyAuth, undefined, undefined, createTicketService(pool, emptyConfig, now)));
      try {
        const signed = await emptyAuth.login("ql_demo_a", identity.password);
        const r = await api("GET", "/tickets", undefined, "", { authorization: "Bearer " + signed.access_token }, emptyLive.url);
        assert.equal(r.status, 200); assert.deepEqual(r.body, { data: [], meta: { page: 1, size: 20, total: 0 } });
      } finally { await emptyLive.close(); emptyAuth.close(); }
    });
    await t.test("P5-I04 E08 Location→E10 exact commit DTO, phone NV/QL và read không ghi/log", async () => {
      const before = await fingerprints(pool);
      for (const user of ["nv_demo_a", "ql_demo_a", "ql_demo_ab"]) {
        const r = await api("GET", base.location.replace(/^\/api/, ""), undefined, user); assert.equal(r.status, 200);
        assert.deepEqual(r.body, { data: { ...base.ticket, customer: { customer_id: base.customer.customer_id, full_name: base.customer.full_name, phone: user === "nv_demo_a" ? base.customer.phone : base.phone },
          device: { device_id: base.device.device_id, serial_no: base.device.serial_no, product_id: 101 } } });
      }
      assert.deepEqual(await fingerprints(pool), before);
    });
    await t.test("P5-I05 E10 scope từ ticket.center_id, missing/deleted404, path/query validation", async () => {
      for (const user of ["nv_demo_a", "ql_demo_a"]) {
        const r = await api("GET", path(center2.ticket.ticket_id), undefined, user); assert.equal(r.status, 404); assert.equal(r.body.error.code, "TICKET_NOT_FOUND"); assert.ok(!r.raw.includes(center2.phone));
      }
      assert.equal((await api("GET", path(center2.ticket.ticket_id), undefined, "ql_demo_ab")).status, 200);
      assert.equal((await api("GET", path(base.ticket.ticket_id), undefined, "nv_demo_b")).status, 404);
      assert.equal((await api("GET", "/tickets/9007199254740991")).status, 404);
      for (const suffix of ["/0", "/9007199254740992", "/1.5", "/abc", "/1?unknown=x"]) assert.equal((await api("GET", "/tickets" + suffix)).status, 400);
      const deleted = await makeTicket(); await pool.query("UPDATE ticket SET deleted_at=$2 WHERE ticket_id=$1", [deleted.ticket.ticket_id, now()]);
      for (const suffix of ["", "/communications"]) assert.equal((await api("GET", path(deleted.ticket.ticket_id) + suffix)).status, 404);
    });
    await t.test("P5-I06 E10 snapshot/SLA không theo PATCH date/config/clock hiện tại", async () => {
      const value = await makeTicket(), before = await rawTicket(value.ticket.ticket_id);
      assert.equal((await api("PATCH", "/customers/" + value.customer.customer_id + "/devices/" + value.device.device_id, { purchase_date: "2026-09-01" })).status, 200);
      const updated = await api("GET", path(value.ticket.ticket_id)); assert.equal(updated.body.data.purchase_date_snapshot, null); assert.equal(updated.body.data.approval_status, "CHO_PHE_DUYET");
      const changedConfig = validateReference({ ...identity.config, products: identity.config.products.map(p => ({ ...p, warranty_months: 36 })) });
      const alternative = await serve(createApp(auth!, undefined, undefined, createTicketService(pool, changedConfig, () => new Date("2035-01-01T00:00:00+07:00"))));
      try { const r = await api("GET", path(value.ticket.ticket_id), undefined, "nv_demo_a", {}, alternative.url); assert.deepEqual(r.body.data, updated.body.data); }
      finally { await alternative.close(); }
      assert.deepEqual(await rawTicket(value.ticket.ticket_id), before);
    });
    await t.test("P5-I07 E11 success200 exact8 field, optional/null/note1000Unicode, actor/time server", async () => {
      for (const note of [undefined, null, "\uFEFF Cho phép tiếp tục 😀 \u3000", "😀".repeat(1000)]) {
        const value = await makeTicket(), before = await rawTicket(value.ticket.ticket_id), logs = await fingerprints(pool, ["ticket_status_log"]);
        clock += 1000;
        const r = await api("POST", path(value.ticket.ticket_id) + "/warranty-approval", note === undefined ? {} : { note }, "ql_demo_a"); assert.equal(r.status, 200);
        assert.deepEqual(r.body, { data: { ticket_id: value.ticket.ticket_id, status: "MOI", warranty_status: "CHUA_XAC_MINH", approval_status: "DA_PHE_DUYET", approved_by: 21, approved_at: timestamp(now()), approval_note: note == null ? null : note.trim(), can_proceed: true } });
        const after = await rawTicket(value.ticket.ticket_id);
        assert.deepEqual(unchangedTicketFields(after), unchangedTicketFields(before)); assert.equal(Number(after.approved_by), 21);
        assert.deepEqual(await fingerprints(pool, ["ticket_status_log"]), logs);
        const detail = await api("GET", path(value.ticket.ticket_id), undefined, "ql_demo_a"); assert.equal(detail.body.data.can_proceed, true); assert.equal(detail.body.data.approved_at, r.body.data.approved_at);
      }
    });
    await t.test("P5-I08 E11 CON/HET/lifecycle/repeat409 đúng code và toàn bộ DB bất biến", async () => {
      const con = await makeTicket("2026-09-01"), het = await makeTicket("2020-01-01"), progressed = await makeTicket(), approved = await makeTicket();
      await pool.query("UPDATE ticket SET status='DA_PHAN_CONG' WHERE ticket_id=$1", [progressed.ticket.ticket_id]);
      await pool.query("INSERT INTO ticket_status_log(ticket_id,from_status,to_status,changed_by,changed_at) VALUES($1,'MOI','DA_PHAN_CONG',21,$2)", [progressed.ticket.ticket_id, now()]);
      assert.equal((await api("POST", path(approved.ticket.ticket_id) + "/warranty-approval", { note: "Quyết định đầu" }, "ql_demo_a")).status, 200);
      const before = await fingerprints(pool);
      for (const value of [con, het, progressed, approved]) {
        const r = await api("POST", path(value.ticket.ticket_id) + "/warranty-approval", { note: "Không ghi đè" }, "ql_demo_ab");
        assert.equal(r.status, 409); assert.equal(r.body.error.code, value === approved ? "ALREADY_APPROVED" : "APPROVAL_NOT_APPLICABLE");
      }
      assert.deepEqual(await fingerprints(pool), before);
    });
    await t.test("P5-I09 E11 note/readonly/JSON/media/query/path sai không ghi DB", async () => {
      const before = await fingerprints(pool), url = path(base.ticket.ticket_id) + "/warranty-approval";
      for (const body of [null, [], { note: 1 }, { note: "" }, { note: "\uFEFF\u3000" }, { note: "😀".repeat(1001) }, { note: "\ud800" }, { approved_by: 22 }, { approved_at: timestamp(now()) }, { approval_status: "DA_PHE_DUYET" }, { note: "ok", role: "QUAN_LY_TTBH" }, { action: "reject" }])
        assert.equal((await api("POST", url, body, "ql_demo_a")).status, 400);
      assert.equal((await api("POST", url + "?note=x", {}, "ql_demo_a")).status, 400);
      assert.equal((await api("POST", "/tickets/9007199254740992/warranty-approval", {}, "ql_demo_a")).status, 400);
      for (const [content, body, status] of [["application/json", "{", 400], ["text/plain", "{}", 415]] as const) {
        const r = await fetch(live!.url + "/api" + url, { method: "POST", headers: { authorization: "Bearer " + tokens.ql_demo_a, "content-type": content }, body }); assert.equal(r.status, status);
        const raw = await r.text(); assert.ok(!/stack|SELECT |UPDATE |postgresql:/i.test(raw));
      }
      assert.deepEqual(await fingerprints(pool), before);
    });
    async function waitLocks(count: number) {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const r = await admin.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND usename=current_user AND wait_event_type='Lock' AND query LIKE '/* l2:ticket-lock */%'");
        if (r.rows[0].n >= count) return;
        await new Promise<void>(resolve => setImmediate(resolve));
      }
      throw new Error("Không quan sát đủ request chờ ticket lock");
    }
    await t.test("P5-I10 hai manager tranh khóa thật: một200/một409, giữ actor/time/note đầu", async () => {
      const value = await makeTicket(), id = value.ticket.ticket_id, blocker = await pool.connect();
      const before = await rawTicket(id), logs = await fingerprints(pool, ["ticket_status_log"]);
      let first: ReturnType<typeof api> | undefined, second: ReturnType<typeof api> | undefined;
      try {
        await blocker.query("BEGIN"); await blocker.query("SELECT ticket_id FROM ticket WHERE ticket_id=$1 FOR UPDATE", [id]);
        first = api("POST", path(id) + "/warranty-approval", { note: "Manager21 thắng" }, "ql_demo_a"); await waitLocks(1);
        second = api("POST", path(id) + "/warranty-approval", { note: "Manager22 không ghi đè" }, "ql_demo_ab"); await waitLocks(2);
        clock += 1000; await blocker.query("COMMIT");
        const [a, b] = await Promise.all([first, second]); assert.equal(a.status, 200); assert.equal(b.status, 409); assert.equal(b.body.error.code, "ALREADY_APPROVED");
        const saved = await rawTicket(id); assert.equal(Number(saved.approved_by), 21); assert.equal(saved.approval_note, "Manager21 thắng"); assert.equal(new Date(saved.approved_at).getTime(), clock);
        assert.deepEqual(unchangedTicketFields(saved), unchangedTicketFields(before)); assert.deepEqual(await fingerprints(pool, ["ticket_status_log"]), logs);
        clock += 5000; assert.equal((await api("POST", path(id) + "/warranty-approval", {}, "ql_demo_ab")).status, 409); assert.deepEqual(await rawTicket(id), saved);
      } finally { await blocker.query("ROLLBACK"); blocker.release(); await Promise.allSettled([first, second]); }
    });
    await t.test("P5-I11 E11 UPDATE CHECK lỗi PostgreSQL thật rollback; guarded UPDATE0 không overwrite", async () => {
      const value = await makeTicket(), before = await fingerprints(pool);
      await pool.query("ALTER TABLE ticket ADD CONSTRAINT p5_force_approval_failure CHECK(approved_by IS NULL) NOT VALID");
      try {
        const r = await api("POST", path(value.ticket.ticket_id) + "/warranty-approval", { note: "Không thể commit" }, "ql_demo_a"); assert.equal(r.status, 500); assert.equal(r.body.error.code, "INTERNAL_ERROR"); assert.ok(!r.raw.includes("p5_force_approval_failure"));
        assert.deepEqual(await fingerprints(pool), before);
      } finally { await pool.query("ALTER TABLE ticket DROP CONSTRAINT p5_force_approval_failure"); }
      assert.equal((await api("POST", path(value.ticket.ticket_id) + "/warranty-approval", {}, "ql_demo_a")).status, 200);
      const saved = await rawTicket(value.ticket.ticket_id);
      assert.equal(await withTransaction(pool, c => ticketRepository.approve(c, value.ticket.ticket_id, [1], 22, now(), "Bỏ qua lock cũng không overwrite")), undefined);
      assert.deepEqual(await rawTicket(value.ticket.ticket_id), saved);
    });
    await t.test("P5-I12 NFR02:9 yêu cầu trái quyền bị từ chối, hash7 bảng trước/sau từng lượt khớp", async () => {
      const endpoint = path(base.ticket.ticket_id) + "/warranty-approval", outside = path(center2.ticket.ticket_id) + "/warranty-approval";
      const evidence: { id: string; actor: string; center: number | null; expected: number; actual: number; before: string; after: string; pass: boolean }[] = [];
      async function verify(id: string, actor: string, center: number | null, expected: number, run: () => ReturnType<typeof api>) {
        const before = await stateHash(pool), response = await run(), after = await stateHash(pool);
        assert.equal(response.status, expected); assert.equal(after, before); assert.deepEqual(Object.keys(response.body.error).sort(), ["code", "message", "fields"].sort());
        evidence.push({ id, actor, center, expected, actual: response.status, before, after, pass: true });
      }
      await verify("N01", "anonymous", null, 401, () => api("POST", endpoint, {}, ""));
      await verify("N02", "invalid token", null, 401, () => api("POST", endpoint, {}, "invalid"));
      await verify("N03", "employee11", 1, 403, () => api("POST", endpoint, {}, "nv_demo_a"));
      await verify("N04", "manager21 outside ticket center2", 1, 404, () => api("POST", outside, {}, "ql_demo_a"));
      await verify("N05", "employee11 forged headers", 1, 403, () => api("POST", endpoint, {}, "nv_demo_a", { role: "QUAN_LY_TTBH", "x-employee-id": "21", "x-center-id": "2" }));
      await verify("N06", "employee11 forged body", 1, 403, () => api("POST", endpoint, { role: "QUAN_LY_TTBH", approved_by: 21 }, "nv_demo_a"));
      let authClock = 0;
      const expiredAuth = createAuth(identity.config, identity.credentials, { ttlSeconds: 1, maxSessions: 100, now: () => authClock });
      const expiredLive = await serve(createApp(expiredAuth, undefined, undefined, tickets));
      try {
        const signed = await expiredAuth.login("ql_demo_a", identity.password); authClock = 1000;
        await verify("N07", "manager21 expired token", 1, 401, () => api("POST", endpoint, {}, "", { authorization: "Bearer " + signed.access_token }, expiredLive.url));
      } finally { await expiredLive.close(); expiredAuth.close(); }
      const manager = accounts.find(a => a.employee_id === 21)!; manager.is_active = false;
      try { await verify("N08", "manager21 deactivated session", 1, 401, () => api("POST", endpoint, {}, "ql_demo_a")); }
      finally { manager.is_active = true; assert.equal((await login("ql_demo_a")).status, 200); }
      assert.equal((await login("inactive_demo")).status, 401);
      await verify("N09", "inactive_demo has no session", 1, 401, () => api("POST", endpoint, {}, "invalid"));
      assert.equal(evidence.length, 9); assert.equal(evidence.filter(x => x.pass).length, 9);
      console.log("P5_NFR_EVIDENCE " + JSON.stringify(evidence));
    });
    await t.test("P5-I13 E12 empty khác404, scope1/2, order99/100 cùng timestamp, pagination/meta", async () => {
      const value = await makeTicket(), url = path(value.ticket.ticket_id) + "/communications";
      assert.deepEqual((await api("GET", url)).body, { data: [], meta: { page: 1, size: 20, total: 0 } });
      const a = await api("POST", url, { content: "Thứ nhất" }), b = await api("POST", url, { content: "Thứ hai" });
      assert.equal(a.status, 201); assert.equal(b.status, 201); assert.deepEqual([a.body.data.communication_id, b.body.data.communication_id], [99, 100]);
      for (const user of ["nv_demo_a", "ql_demo_a", "ql_demo_ab"]) {
        const r = await api("GET", url, undefined, user); assert.equal(r.status, 200); assert.deepEqual(r.body.data, [a.body.data, b.body.data]); assert.equal(r.body.meta.total, 2);
      }
      assert.deepEqual((await api("GET", url + "?page=2&size=1")).body, { data: [b.body.data], meta: { page: 2, size: 1, total: 2 } });
      for (const page of ["99", "9007199254740991"]) { const r = await api("GET", url + "?page=" + page + "&size=100"); assert.deepEqual(r.body.data, []); assert.equal(r.body.meta.total, 2); }
      const other = await makeTicket(); assert.deepEqual((await api("GET", path(other.ticket.ticket_id) + "/communications")).body.data, []);
      for (const [id, user] of [[99999999, "nv_demo_a"], [center2.ticket.ticket_id, "nv_demo_a"], [center2.ticket.ticket_id, "ql_demo_a"]] as const) {
        const r = await api("GET", path(id) + "/communications", undefined, user); assert.equal(r.status, 404); assert.equal(r.body.error.code, "TICKET_NOT_FOUND");
      }
      for (const q of ["page=0", "size=101", "page=1&page=2", "content=x", "size="]) assert.equal((await api("GET", url + "?" + q)).status, 400);
    });
    await t.test("P5-I14 E13 exact5 fields201, Unicode1/2000, actor11/12/time, không đổi ticket/log", async () => {
      for (const user of ["nv_demo_a", "nv_demo_b"]) {
        const value = await makeTicket(null, user), id = value.ticket.ticket_id;
        const before = await fingerprints(pool, ["ticket", "ticket_status_log", "customer", "device"]);
        for (const content of ["\uFEFF😀\u3000", "😀".repeat(2000)]) {
          const r = await api("POST", path(id) + "/communications", { content }, user); assert.equal(r.status, 201); assert.equal(r.headers.get("location"), null);
          assert.deepEqual(r.body, { data: { communication_id: r.body.data.communication_id, ticket_id: id, content: content.trim(), created_at: timestamp(now()), created_by: user === "nv_demo_a" ? 11 : 12 } });
          const db = (await pool.query("SELECT content,char_length(content)::int AS length,created_at,created_by::int FROM ticket_communication WHERE communication_id=$1", [r.body.data.communication_id])).rows[0];
          assert.equal(db.length, Array.from(content.trim()).length); assert.equal(db.created_by, r.body.data.created_by); assert.equal(db.created_at.getTime(), clock);
        }
        assert.deepEqual(await fingerprints(pool, ["ticket", "ticket_status_log", "customer", "device"]), before);
      }
    });
    await t.test("P5-I15 E13 invalid/readonly/media/role/scope/ticket missing không INSERT hoặc log", async () => {
      const url = path(base.ticket.ticket_id) + "/communications", before = await fingerprints(pool);
      for (const body of [null, [], {}, { content: null }, { content: 1 }, { content: "" }, { content: "\uFEFF\u3000" }, { content: "😀".repeat(2001) }, { content: "\0" }, { content: "\ud800" }, { content: "x", created_by: 21 }, { content: "x", created_at: timestamp(now()) }, { content: "x", ticket_id: center2.ticket.ticket_id }])
        assert.equal((await api("POST", url, body)).status, 400);
      assert.equal((await api("POST", url + "?x=1", { content: "x" })).status, 400);
      assert.equal((await api("POST", url, { content: "x" }, "ql_demo_ab")).status, 403);
      for (const id of [99999999, center2.ticket.ticket_id]) assert.equal((await api("POST", path(id) + "/communications", { content: "x" })).status, 404);
      const response = await fetch(live!.url + "/api" + url, { method: "POST", headers: { authorization: "Bearer " + tokens.nv_demo_a, "content-type": "text/plain" }, body: "x" }); assert.equal(response.status, 415);
      assert.deepEqual(await fingerprints(pool), before);
    });
    await t.test("P5-I16 parent tombstone vẫn E09/E10/E11/E12/E13; không restore, lịch sử giữ nguyên", async () => {
      const value = await makeTicket(), id = value.ticket.ticket_id, original = await rawTicket(id);
      assert.equal((await api("DELETE", "/customers/" + value.customer.customer_id)).status, 204);
      assert.equal((await api("DELETE", "/customers/" + value.customer.customer_id + "/devices/" + value.device.device_id)).status, 204);
      const parents = await fingerprints(pool, ["customer", "device"]), logs = await fingerprints(pool, ["ticket_status_log"]);
      assert.equal((await api("GET", path(id))).status, 200);
      const list = await api("GET", "/tickets?size=100", undefined, "ql_demo_a"); assert.ok(list.body.data.some((x: { ticket_id: number }) => x.ticket_id === id));
      assert.equal((await api("POST", path(id) + "/communications", { content: "Xác minh hồ sơ lịch sử" })).status, 201);
      assert.equal((await api("GET", path(id) + "/communications", undefined, "ql_demo_a")).body.meta.total, 1);
      assert.equal((await api("POST", path(id) + "/warranty-approval", { note: "Duyệt sau ngừng hồ sơ nguồn" }, "ql_demo_a")).status, 200);
      assert.deepEqual(unchangedTicketFields(await rawTicket(id)), unchangedTicketFields(original));
      assert.deepEqual(await fingerprints(pool, ["customer", "device"]), parents); assert.deepEqual(await fingerprints(pool, ["ticket_status_log"]), logs);
    });
    await t.test("P5-I17 E13 concurrent10 không mất message; E12 total/data một snapshot khi ghi đồng thời", async () => {
      const value = await makeTicket(), url = path(value.ticket.ticket_id) + "/communications", before = await fingerprints(pool, ["ticket", "ticket_status_log"]);
      const writes = Array.from({ length: 10 }, (_, i) => api("POST", url, { content: "Concurrent " + i }));
      const reads = Array.from({ length: 8 }, () => api("GET", url + "?size=100"));
      const results = await Promise.all([...writes, ...reads]); results.slice(0, 10).forEach(r => assert.equal(r.status, 201));
      results.slice(10).forEach(r => { assert.equal(r.status, 200); assert.equal(r.body.data.length, r.body.meta.total); });
      const all = await api("GET", url + "?size=100"); assert.equal(all.body.meta.total, 10); assert.equal(new Set(all.body.data.map((x: { communication_id: number }) => x.communication_id)).size, 10);
      const ids = all.body.data.map((x: { communication_id: number }) => x.communication_id); assert.deepEqual(ids, [...ids].sort((a, b) => a - b));
      assert.deepEqual(await fingerprints(pool, ["ticket", "ticket_status_log"]), before);
    });
    await t.test("P5-I18 INSERT communication CHECK lỗi PostgreSQL rollback, response500 an toàn", async () => {
      const before = await fingerprints(pool);
      await pool.query("ALTER TABLE ticket_communication ADD CONSTRAINT p5_force_message_failure CHECK(content <> 'FORCE_P5_DB_FAILURE') NOT VALID");
      try {
        const r = await api("POST", path(base.ticket.ticket_id) + "/communications", { content: "FORCE_P5_DB_FAILURE" });
        assert.equal(r.status, 500); assert.equal(r.body.error.code, "INTERNAL_ERROR"); assert.ok(!r.raw.includes("p5_force_message_failure")); assert.deepEqual(await fingerprints(pool), before);
      } finally { await pool.query("ALTER TABLE ticket_communication DROP CONSTRAINT p5_force_message_failure"); }
    });
    await t.test("P5-I19 ticket soft delete thắng khóa: E11/E13 recheck404, không metadata/message mới", async () => {
      for (const operation of ["warranty-approval", "communications"]) {
        const value = await makeTicket(), id = value.ticket.ticket_id, blocker = await pool.connect(); let pending: ReturnType<typeof api> | undefined;
        const comm = await fingerprints(pool, ["ticket_communication", "ticket_status_log"]);
        try {
          await blocker.query("BEGIN"); await blocker.query("UPDATE ticket SET deleted_at=$2 WHERE ticket_id=$1", [id, now()]);
          pending = api("POST", path(id) + "/" + operation, operation === "communications" ? { content: "Không được ghi" } : {}, operation === "communications" ? "nv_demo_a" : "ql_demo_a");
          await waitLocks(1); await blocker.query("COMMIT");
          const r = await pending; assert.equal(r.status, 404); assert.equal(r.body.error.code, "TICKET_NOT_FOUND");
          const current = await rawTicket(id); assert.equal(current.approval_status, "CHO_PHE_DUYET"); assert.equal(current.approved_by, null);
          assert.deepEqual(await fingerprints(pool, ["ticket_communication", "ticket_status_log"]), comm);
          assert.ok(!(await api("GET", "/tickets?size=100", undefined, "ql_demo_a")).body.data.some((x: { ticket_id: number }) => x.ticket_id === id));
        } finally { await blocker.query("ROLLBACK"); blocker.release(); await Promise.allSettled([pending]); }
      }
    });
    await t.test("P5-I20 liên thông E01/E04/E07/E08→E10→E13/E12→E09/E11→E10 và lặp409", async () => {
      assert.equal((await login("nv_demo_a")).status, 200);
      assert.ok((await api("GET", "/products")).body.data.some((x: { product_id: number }) => x.product_id === 101));
      assert.ok((await api("GET", "/issue-categories")).body.data.some((x: { category_id: number }) => x.category_id === 3));
      const value = await profile();
      assert.equal((await api("GET", "/customers?phone=" + value.phone)).body.data.customer_id, value.customer.customer_id);
      assert.ok((await api("GET", "/customers/" + value.customer.customer_id + "/devices")).body.data.some((x: { device_id: number }) => x.device_id === value.device.device_id));
      assert.equal((await api("GET", "/devices/" + value.device.device_id + "/warranty")).body.data.warranty_status, "CHUA_XAC_MINH");
      const createdTicket = await api("POST", "/tickets", { customer_id: value.customer.customer_id, device_id: value.device.device_id, center_id: 1, issue_desc: "Liên thông L2", category_id: 3, priority: "CAO" });
      assert.equal(createdTicket.status, 201); const id = createdTicket.body.data.ticket_id; assert.equal(createdTicket.headers.get("location"), "/api/tickets/" + id);
      assert.equal(createdTicket.body.data.can_proceed, false); const before = await rawTicket(id), logs = await fingerprints(pool, ["ticket_status_log"]);
      assert.equal((await api("GET", path(id))).body.data.approval_status, "CHO_PHE_DUYET");
      assert.equal((await api("POST", path(id) + "/communications", { content: "Khách chưa tìm được hóa đơn" })).status, 201);
      assert.equal((await api("GET", path(id) + "/communications")).body.data.length, 1);
      assert.equal((await login("ql_demo_a")).status, 200);
      assert.ok((await api("GET", "/tickets?size=100", undefined, "ql_demo_a")).body.data.some((x: { ticket_id: number }) => x.ticket_id === id));
      const approved = await api("POST", path(id) + "/warranty-approval", { note: "Cho phép tiếp tục L2" }, "ql_demo_a"); assert.equal(approved.status, 200);
      const detail = (await api("GET", path(id), undefined, "ql_demo_a")).body.data;
      assert.equal(detail.can_proceed, true); assert.equal(detail.approved_by, 21); assert.equal(detail.approved_at, approved.body.data.approved_at); assert.equal(detail.approval_note, "Cho phép tiếp tục L2");
      assert.ok((await api("GET", "/tickets?approval_status=DA_PHE_DUYET&size=100", undefined, "ql_demo_a")).body.data.some((x: { ticket_id: number }) => x.ticket_id === id));
      const final = await rawTicket(id); assert.deepEqual(unchangedTicketFields(final), unchangedTicketFields(before)); assert.deepEqual(await fingerprints(pool, ["ticket_status_log"]), logs);
      assert.equal((await api("POST", path(id) + "/warranty-approval", {}, "ql_demo_ab")).body.error.code, "ALREADY_APPROVED"); assert.deepEqual(await rawTicket(id), final);
      // Đã xác định còn/hết bảo hành nằm ở nhánh I08, không cho duyệt sai matrix.
    });
    await t.test("P5-I21 E09 total/data nhất quán khi intake đồng thời, không lộ scope/phone", async () => {
      const value = await profile();
      const writes = Array.from({ length: 8 }, () => api("POST", "/tickets", { customer_id: value.customer.customer_id, device_id: value.device.device_id, center_id: 1, category_id: 3, priority: "CAO", issue_desc: "Concurrent list" }));
      const reads = Array.from({ length: 8 }, () => api("GET", "/tickets?size=100", undefined, "ql_demo_a"));
      const results = await Promise.all([...writes, ...reads]); results.slice(0, 8).forEach(r => assert.equal(r.status, 201));
      results.slice(8).forEach(r => { assert.equal(r.status, 200); assert.ok(r.body.meta.total < 100); assert.equal(r.body.data.length, r.body.meta.total); r.body.data.forEach((x: { center_id: number }) => assert.equal(x.center_id, 1)); assert.ok(!r.raw.includes(value.phone)); });
    });
    await t.test("P5-I22 seed không ghi đè approval/communications/snapshot; vẫn6+1 bảng, public/sequence nguyên", async () => {
      const before = await fingerprints(pool); await seed(pool, identity.config); assert.deepEqual(await fingerprints(pool), before);
      const tables = (await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() ORDER BY table_name")).rows.map(x => x.table_name); assert.deepEqual(tables, [...names].sort());
      assert.deepEqual(await fingerprints(admin), publicBefore); assert.deepEqual((await admin.query("SELECT last_value::text,is_called FROM ticket_code_seq")).rows, seqBefore);
    });
  } finally {
    await live?.close(); auth?.close(); await pool.end();
    try { if (created && /^phase2_test_p5_[a-z0-9_]+$/.test(schema)) await admin.query('DROP SCHEMA "' + schema + '" CASCADE'); assert.deepEqual(await fingerprints(admin), publicBefore); }
    finally { await admin.end(); }
  }
});
