import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { createApiClient, ApiError } from "../../frontend/src/lib/api-client.ts";
import { createPool, checkDatabase } from "../src/db.ts";
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
import { testIdentity, serve } from "./helpers.ts";

test("Phase6 —12 case BT2, API client ↔ Express ↔ PostgreSQL thật", async t => {
  const runtime = runtimeConfig(), admin = createPool(runtime), schema = "phase2_test_p6_" + randomBytes(8).toString("hex"), pool = createPool(runtime, schema);
  let created = false, live: Awaited<ReturnType<typeof serve>> | undefined, auth: ReturnType<typeof createAuth> | undefined;
  const fixed = new Date("2026-09-28T09:00:00+07:00");
  const evidence: { id: string; type: string; actual: string; result: string }[] = [];
  async function publicHash() {
    const hashes: string[] = [];
    for (const name of ["customer", "device", "issue_category", "ticket", "ticket_status_log", "ticket_communication", "schema_migration"]) {
      const values = (await admin.query("SELECT to_jsonb(t)::text AS value FROM " + name + " t")).rows.map(r => r.value).sort();
      hashes.push(createHash("sha256").update(values.join("\n")).digest("hex"));
    }
    return hashes;
  }
  const before = await publicHash();
  try {
    await checkDatabase(admin); await admin.query('CREATE SCHEMA "' + schema + '"'); created = true; await migrate(pool);
    const identity = await testIdentity(); await seed(pool, identity.config);
    auth = createAuth(identity.config, identity.credentials, { ttlSeconds: 3600, maxSessions: 100 });
    const ticketService = createTicketService(pool, identity.config, () => fixed);
    live = await serve(createApp(auth, { customers: createCustomerService(pool, () => fixed), devices: createDeviceService(pool, identity.config, () => fixed), now: () => fixed },
      { catalog: createCatalogService(pool, identity.config), warranty: createWarrantyService(pool, () => fixed), tickets: ticketService }, ticketService));
    const nv = createApiClient({ baseUrl: live.url + "/api" }), manager = createApiClient({ baseUrl: live.url + "/api" }), managerAB = createApiClient({ baseUrl: live.url + "/api" }), nvB = createApiClient({ baseUrl: live.url + "/api" });
    await manager.login("ql_demo_a", identity.password); await managerAB.login("ql_demo_ab", identity.password); await nvB.login("nv_demo_b", identity.password);
    let customerId = 0, deviceId = 0, pendingId = 0, duplicateCustomerId = 0;
    async function pending() { return nv.createTicket({ customer_id: customerId, device_id: deviceId, center_id: 1, issue_desc: "Tiếp nhận để xác minh", category_id: 3, priority: "CAO" }); }
    async function queued(id: number, filter = "CHO_PHE_DUYET") {
      for (let page = 1; ; page++) { const result = await manager.tickets(filter, page); if (result.data.some(t => t.ticket_id === id)) return true; if (page * result.meta.size >= result.meta.total) return false; }
    }
    async function check(id: string, type: string, actual: string, run: () => Promise<void>) { await t.test(id + " " + actual, async () => { await run(); evidence.push({ id, type, actual, result: "PASS" }); }); }
    await check("TC01", "Luồng đúng", "login200/Bearer/principal NV11 center1", async () => {
      const signed = await nv.login("nv_demo_a", identity.password); assert.equal(signed.principal.employee_id, 11); assert.equal(signed.principal.active_center_id, 1); assert.equal(signed.token_type, "Bearer"); assert.equal(signed.access_token.length, 43);
    });
    await check("TC02", "Luồng đúng", "bốn phone cùng customer_id và phone che", async () => {
      const c = await nv.createCustomer({ full_name: "Khách minh chứng", phone: "0885550001" }); customerId = c.customer_id;
      for (const phone of ["0885550001", "+84 885.550.001", "84885550001", "0885 550 001"]) { const value = await nv.customer(phone); assert.equal(value.customer_id, customerId); assert.equal(value.phone, "088****001"); assert.equal(value.address, null); }
    });
    await check("TC03", "Dữ liệu sai", "trùng phone409/field phone/existing_customer đã mask", async () => {
      const count = (await pool.query("SELECT count(*)::int AS n FROM customer")).rows[0].n;
      await assert.rejects(nv.createCustomer({ full_name: "Không ghi đè", phone: "84885550001" }), (e: unknown) => e instanceof ApiError && e.status === 409 && e.code === "PHONE_ALREADY_EXISTS" && e.existingCustomer?.customer_id === customerId && e.existingCustomer.phone === "088****001");
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM customer")).rows[0].n, count);
    });
    await check("TC04", "Luồng đúng / sai", "device201 months12, trùng serial409, chủ không chuyển", async () => {
      const d = await nv.createDevice(customerId, { product_id: 101, serial_no: "P6-EVIDENCE-001", purchase_date: null }); deviceId = d.device_id;
      assert.equal(d.customer_id, customerId); assert.equal(d.warranty_months, 12); assert.equal(d.purchase_date, null);
      duplicateCustomerId = (await nv.createCustomer({ full_name: "Khách khác", phone: "0885550002" })).customer_id;
      await assert.rejects(nv.createDevice(duplicateCustomerId, { product_id: 101, serial_no: "P6-EVIDENCE-001", purchase_date: null }), (e: unknown) => e instanceof ApiError && e.status === 409 && e.code === "DEVICE_OWNER_MISMATCH");
      assert.equal((await pool.query("SELECT customer_id::text FROM device WHERE device_id=$1", [deviceId])).rows[0].customer_id, String(customerId));
      assert.equal((await nv.devices(customerId)).data[0]!.device_id, deviceId); assert.ok((await nv.products()).data.length); assert.ok((await nv.categories()).length);
    });
    await check("TC05", "Giá trị biên", "ngày cuối 28/09/2026 còn bảo hành", async () => {
      const d = await nv.createDevice(customerId, { product_id: 101, serial_no: "P6-BOUNDARY", purchase_date: "2025-09-28" });
      const w = await nv.warranty(d.device_id, "2026-09-28"); assert.equal(w.warranty_expires_on, "2026-09-28"); assert.equal(w.warranty_status, "CON_BAO_HANH");
    });
    await check("TC06", "Giá trị biên", "ngày sau29/09 hết bảo hành, preview200", async () => {
      const d = (await nv.devices(customerId)).data.find(d => d.serial_no === "P6-BOUNDARY")!;
      const w = await nv.warranty(d.device_id, "2026-09-29"); assert.equal(w.warranty_status, "HET_BAO_HANH"); assert.equal(w.requires_approval, false);
    });
    await check("TC07", "Luồng đúng / ngoại lệ", "NULL purchase→CHUA/CHO, MOI, can_proceed=false", async () => {
      const w = await nv.warranty(deviceId); assert.equal(w.warranty_status, "CHUA_XAC_MINH"); assert.equal(w.warranty_expires_on, null);
      const result = await pending(); pendingId = result.ticket_id; assert.equal(result.status, "MOI"); assert.equal(result.approval_status, "CHO_PHE_DUYET"); assert.equal(result.purchase_date_snapshot, null); assert.equal(result.can_proceed, false);
    });
    await check("TC08", "Luồng đúng / lỗi ghi", "ticket+initial log commit cùng nhau; log lỗi rollback thật", async () => {
      const logs = (await pool.query("SELECT from_status,to_status,changed_by::int FROM ticket_status_log WHERE ticket_id=$1", [pendingId])).rows;
      assert.deepEqual(logs, [{ from_status: null, to_status: "MOI", changed_by: 11 }]);
      const count = (await pool.query("SELECT count(*)::int AS n FROM ticket")).rows[0].n;
      await pool.query("ALTER TABLE ticket_status_log ADD CONSTRAINT p6_log_fault CHECK(changed_by<>11) NOT VALID");
      try { await assert.rejects(pending(), (e: unknown) => e instanceof ApiError && e.status === 500); assert.equal((await pool.query("SELECT count(*)::int AS n FROM ticket")).rows[0].n, count); }
      finally { await pool.query("ALTER TABLE ticket_status_log DROP CONSTRAINT p6_log_fault"); }
    });
    await check("TC09", "Dữ liệu sai", "thiếu priority400/fields.priority, không tạo phiếu", async () => {
      const count = (await pool.query("SELECT count(*)::int AS n FROM ticket")).rows[0].n;
      await assert.rejects(Reflect.apply(nv.createTicket, undefined, [{ customer_id: customerId, device_id: deviceId, center_id: 1, issue_desc: "Thiếu priority", category_id: 3 }]), (e: unknown) => e instanceof ApiError && e.status === 400 && Boolean(e.fields.priority));
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM ticket")).rows[0].n, count);
    });
    await check("TC10", "Dữ liệu sai / quyền", "manager center1 duyệt center2→404, không metadata mới", async () => {
      const c = await nvB.createCustomer({ full_name: "Center2", phone: "0885550003" }), d = await nvB.createDevice(c.customer_id, { product_id: 101, serial_no: "P6-CENTER2", purchase_date: null });
      const value = await nvB.createTicket({ customer_id: c.customer_id, device_id: d.device_id, center_id: 2, issue_desc: "Ngoài scope", category_id: 3, priority: "CAO" });
      await assert.rejects(manager.approve(value.ticket_id, null), (e: unknown) => e instanceof ApiError && e.status === 404);
      assert.equal((await managerAB.detail(value.ticket_id)).approved_by, null);
    });
    await check("TC11", "Đồng thời", "hai manager: một200/một409, metadata người thắng giữ nguyên", async () => {
      const value = await pending(), blocker = await pool.connect(); let a: ReturnType<typeof manager.approve> | undefined, b: ReturnType<typeof managerAB.approve> | undefined;
      const wait = async (count: number) => { const end = Date.now() + 5000; while (Date.now() < end) { const n = (await admin.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND usename=current_user AND wait_event_type='Lock' AND query LIKE '/* l2:ticket-lock */%'")).rows[0].n; if (n >= count) return; await new Promise<void>(r => setImmediate(r)); } throw new Error("Thiếu request chờ khóa"); };
      try {
        await blocker.query("BEGIN"); await blocker.query("SELECT ticket_id FROM ticket WHERE ticket_id=$1 FOR UPDATE", [value.ticket_id]);
        a = manager.approve(value.ticket_id, "Đầu tiên"); await wait(1); b = managerAB.approve(value.ticket_id, "Không ghi đè"); const settledB = b.catch(e => e as unknown); await wait(2); await blocker.query("COMMIT");
        assert.equal((await a).approved_by, 21); const failure = await settledB; assert.ok(failure instanceof ApiError && failure.status === 409 && failure.code === "ALREADY_APPROVED");
        const saved = await manager.detail(value.ticket_id); assert.equal(saved.approved_by, 21); assert.equal(saved.approval_note, "Đầu tiên");
      } finally { await blocker.query("ROLLBACK"); blocker.release(); await Promise.allSettled([a, b]); }
    });
    await check("TC12", "Liên thông", "communication→approval→detail, giữ snapshot/SLA/log; lặp409", async () => {
      const original = await nv.detail(pendingId); assert.equal(original.customer.phone, "088****001");
      const m = await nv.communicate(pendingId, "Khách cần xác minh ngày mua"); assert.equal(m.created_by, 11); assert.equal((await manager.communications(pendingId)).meta.total, 1);
      assert.ok(await queued(pendingId));
      const approved = await manager.approve(pendingId, "Cho phép tiếp tục"); assert.equal(approved.can_proceed, true);
      const final = await manager.detail(pendingId); assert.equal(final.customer.phone, "0885550001"); assert.equal(final.can_proceed, true);
      for (const key of ["status", "warranty_status", "assessed_on", "purchase_date_snapshot", "warranty_months_snapshot", "warranty_expires_on", "received_at", "due_date"] as const) assert.deepEqual(final[key], original[key]);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM ticket_status_log WHERE ticket_id=$1", [pendingId])).rows[0].n, 1);
      assert.ok(await queued(pendingId, "DA_PHE_DUYET"));
      await assert.rejects(managerAB.approve(pendingId, "Ghi đè"), (e: unknown) => e instanceof ApiError && e.code === "ALREADY_APPROVED");
    });
    assert.equal(evidence.length, 12); console.log("P6_BT2_EVIDENCE " + JSON.stringify(evidence)); assert.deepEqual(await publicHash(), before);
  } finally {
    await live?.close(); auth?.close(); await pool.end();
    try { if (created && /^phase2_test_p6_[0-9a-f]{16}$/.test(schema)) await admin.query('DROP SCHEMA "' + schema + '" CASCADE'); assert.deepEqual(await publicHash(), before); } finally { await admin.end(); }
  }
});
