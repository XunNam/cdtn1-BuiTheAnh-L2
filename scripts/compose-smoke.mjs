import assert from "node:assert/strict";
import { readFile, writeFile, access } from "node:fs/promises";
import { randomInt } from "node:crypto";
import { createApiClient, ApiError } from "../src/frontend/src/lib/api-client.ts";
const args = process.argv.slice(2), option = name => args[args.indexOf(name) + 1];
if (!args.includes("--confirm-isolated-compose")) throw new Error("Use only an isolated Compose test volume");
const base = option("--url"), credentialFile = option("--credentials"), receiptFile = option("--receipt");
if (!base || !["127.0.0.1", "localhost"].includes(new URL(base).hostname) || !credentialFile || !receiptFile) throw new Error("SMOKE_CONFIG_INVALID");
const credentials = JSON.parse(await readFile(credentialFile, "utf8"));
async function client(user) { const account = credentials.find(x => x.username === user); assert.ok(account); const api = createApiClient({ baseUrl: base + "/api" }); const signed = await api.login(user, account.password); return { api, token: signed.access_token }; }
async function raw(method, path, body, token) { const r = await fetch(base + "/api" + path, { method, headers: { authorization: "Bearer " + token, ...(body === undefined ? {} : { "content-type": "application/json" }) }, body: body === undefined ? undefined : JSON.stringify(body) }); return r.status; }
async function queued(api, id, filter) { for (let page = 1; ; page++) { const r = await api.tickets(filter, page); if (r.data.some(x => x.ticket_id === id)) return true; if (page * r.meta.size >= r.meta.total) return false; } }
try {
  if (args.includes("--restart")) {
    const receipt = JSON.parse(await readFile(receiptFile, "utf8"));
    assert.equal(await raw("GET", "/tickets/" + receipt.ticket_id, undefined, receipt.old_token), 401);
    const { api: manager } = await client("ql_demo_a"), detail = await manager.detail(receipt.ticket_id);
    for (const [key, expected] of Object.entries(receipt.snapshot)) assert.deepEqual(detail[key], expected);
    assert.equal((await manager.communications(receipt.ticket_id)).meta.total, receipt.communications);
    assert.equal(detail.approval_status, "DA_PHE_DUYET");
    console.log(JSON.stringify({ compose_restart_smoke: "PASS", session_invalidated: true, persistence: true }));
  } else {
    try { await access(receiptFile); throw new Error("Receipt exists; use restart mode"); } catch (error) { if (error.code !== "ENOENT") throw error; }
    const { api: nv, token } = await client("nv_demo_a"), { api: manager } = await client("ql_demo_a"), { api: nvB } = await client("nv_demo_b");
    const phone = "08" + String(randomInt(10000000, 99999999)), c = await nv.createCustomer({ full_name: "Compose smoke", phone });
    assert.equal((await nv.customer(phone)).customer_id, c.customer_id); assert.ok((await nv.products()).data.length); assert.ok((await nv.categories()).length);
    const d = await nv.createDevice(c.customer_id, { product_id: 101, serial_no: "COMPOSE-" + phone, purchase_date: null });
    assert.equal((await nv.devices(c.customer_id)).data[0].device_id, d.device_id); assert.equal((await nv.warranty(d.device_id)).warranty_status, "CHUA_XAC_MINH");
    const ticket = await nv.createTicket({ customer_id: c.customer_id, device_id: d.device_id, center_id: 1, issue_desc: "Compose intake", category_id: 3, priority: "CAO" });
    assert.equal(ticket.status, "MOI"); assert.equal(ticket.can_proceed, false); assert.equal((await nv.detail(ticket.ticket_id)).customer.phone, phone.slice(0, 3) + "****" + phone.slice(-3));
    await nv.communicate(ticket.ticket_id, "Xác minh qua giao diện tích hợp"); assert.equal((await manager.communications(ticket.ticket_id)).meta.total, 1);
    assert.equal(await raw("PATCH", "/customers/" + c.customer_id, { full_name: "Tên vận hành giữ qua restart", address: null }, token), 200);
    assert.equal(await raw("PATCH", "/customers/" + c.customer_id + "/devices/" + d.device_id, { purchase_date: "2026-09-01" }, token), 200);
    assert.equal((await nv.detail(ticket.ticket_id)).purchase_date_snapshot, null);
    assert.ok(await queued(manager, ticket.ticket_id, "CHO_PHE_DUYET")); assert.equal((await manager.approve(ticket.ticket_id, "Phê duyệt Compose")).can_proceed, true);
    assert.ok(await queued(manager, ticket.ticket_id, "DA_PHE_DUYET")); await assert.rejects(manager.approve(ticket.ticket_id, null), e => e instanceof ApiError && e.status === 409);
    await assert.rejects(nvB.detail(ticket.ticket_id), e => e instanceof ApiError && e.status === 404);
    assert.equal(await raw("DELETE", "/customers/" + c.customer_id + "/devices/" + d.device_id, undefined, token), 204); assert.equal(await raw("DELETE", "/customers/" + c.customer_id, undefined, token), 204);
    await nv.communicate(ticket.ticket_id, "Trao đổi lịch sử sau ngừng hồ sơ nguồn");
    const saved = await manager.detail(ticket.ticket_id), snapshot = {};
    for (const key of ["status", "warranty_status", "assessed_on", "purchase_date_snapshot", "warranty_months_snapshot", "warranty_expires_on", "received_at", "due_date"]) { assert.deepEqual(saved[key], ticket[key]); snapshot[key] = saved[key]; }
    await writeFile(receiptFile, JSON.stringify({ ticket_id: ticket.ticket_id, snapshot, communications: 2, old_token: token }), { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ compose_api_smoke: "PASS", login: true, endpoints: "E01–E13", CRUD: true, history: true }));
  }
} catch (error) { console.error(error instanceof ApiError ? error.code : "COMPOSE_SMOKE_FAILED"); process.exitCode = 1; }
