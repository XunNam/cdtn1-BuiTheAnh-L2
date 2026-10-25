import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createApp } from "../src/app.ts";
import { createAuth, requireRole, requireResourceScope } from "../src/auth.ts";
import { errorHandler } from "../src/errors.ts";
import { serve, testIdentity } from "./helpers.ts";

let identity: Awaited<ReturnType<typeof testIdentity>>;
let auth: ReturnType<typeof createAuth>;
let live: Awaited<ReturnType<typeof serve>>, harness: Awaited<ReturnType<typeof serve>>;
let time = Date.parse("2026-10-24T09:00:00+07:00");
before(async () => {
  identity = await testIdentity();
  auth = createAuth(identity.config, identity.credentials, { ttlSeconds: 3600, maxSessions: 100, now: () => time });
  // Harness Foundation chỉ lắp login; production và test Phase3 truyền Customer/Device services.
  live = await serve(createApp(auth));
  // Toàn bộ route giả ở tests; không đăng ký trong ứng dụng public.
  const fake = express();
  fake.get("/role", auth.requireAuth, (req, res) => {
    requireRole(req.principal!, ["QUAN_LY_TTBH"]); res.json({ data: req.principal });
  });
  fake.get("/center/:center_id", auth.requireAuth, (req, res) => {
    requireResourceScope(req.principal!, Number(req.params.center_id)); res.json({ data: req.principal });
  });
  fake.use(errorHandler);
  harness = await serve(fake);
});
after(async () => { auth?.close(); await live?.close(); await harness?.close(); });
async function login(body: unknown, suffix = "") {
  return fetch(live.url + "/api/auth/login" + suffix, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}
test("HTTP login đúng contract: envelope/token/principal/offset/no-store/không secret", async () => {
  const response = await login({ username: " nv_demo_a ", password: identity.password });
  assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.deepEqual(Object.keys(body), ["data"]);
  assert.deepEqual(Object.keys(body.data).sort(), ["access_token", "token_type", "expires_in", "expires_at", "principal"].sort());
  assert.equal(body.data.token_type, "Bearer"); assert.equal(body.data.expires_in, 3600);
  assert.equal(body.data.principal.employee_id, 11); assert.ok(body.data.expires_at.endsWith("+07:00"));
  assert.ok(!JSON.stringify(body).includes(identity.password));
  assert.ok(!JSON.stringify(body).includes(identity.credentials[0]!.hash));
});
test("HTTP sai username/password/inactive cùng401 INVALID_CREDENTIALS", async () => {
  const errors = [];
  for (const [username, password] of [["missing", identity.password], ["nv_demo_a", identity.password.trim()], ["inactive_demo", identity.password]]) {
    const res = await login({ username, password }); assert.equal(res.status, 401); errors.push(await res.json());
  }
  assert.deepEqual(errors[0], errors[1]); assert.deepEqual(errors[1], errors[2]);
  assert.equal(errors[0].error.code, "INVALID_CREDENTIALS");
});
test("HTTP object/field/kiểu/query lạ và lặp đều400", async () => {
  for (const body of [null, [], {}, { username: "nv_demo_a" }, { username: 1, password: 1 }, { username: "nv_demo_a", password: identity.password, role: "QUAN_LY_TTBH" }]) {
    const response = await login(body); assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "VALIDATION_FAILED");
  }
  for (const suffix of ["?role=ADMIN", "?page=1&page=2"]) assert.equal((await login({ username: "nv_demo_a", password: identity.password }, suffix)).status, 400);
});
test("HTTP JSON hỏng400, media/charset sai415 và lỗi không phản chiếu body", async () => {
  const invalid = await fetch(live.url + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: '{"password":' });
  assert.equal(invalid.status, 400); assert.equal((await invalid.json()).error.code, "INVALID_JSON");
  for (const type of ["text/plain", "application/json; charset=iso-8859-1"]) {
    const res = await fetch(live.url + "/api/auth/login", { method: "POST", headers: { "content-type": type }, body: identity.password });
    assert.equal(res.status, 415); assert.ok(!(await res.text()).includes(identity.password));
  }
});
test("HTTP Bearer bảo vệ role/scope:401/403/404 và bỏ qua quyền client tự khai", async () => {
  const noToken = await fetch(harness.url + "/role"); assert.equal(noToken.status, 401);
  const signed = await (await login({ username: "nv_demo_a", password: identity.password })).json();
  const headers = { authorization: "Bearer " + signed.data.access_token, role: "QUAN_LY_TTBH", "x-center-id": "2" };
  assert.equal((await fetch(harness.url + "/role", { headers })).status, 403);
  assert.equal((await fetch(harness.url + "/center/1", { headers })).status, 200);
  assert.equal((await fetch(harness.url + "/center/2", { headers })).status, 404);
  const ql = await (await login({ username: "ql_demo_ab", password: identity.password })).json();
  assert.equal((await fetch(harness.url + "/role", { headers: { authorization: "Bearer " + ql.data.access_token } })).status, 200);
});
test("HTTP token sửa/hết hạn tại biên401; auth-only harness không lắp route nghiệp vụ", async () => {
  const signed = await (await login({ username: "nv_demo_a", password: identity.password })).json();
  const token = signed.data.access_token as string;
  assert.equal((await fetch(harness.url + "/center/1", { headers: { authorization: "Bearer " + token.slice(1) + "!" } })).status, 401);
  time += 3600000;
  const expired = await fetch(harness.url + "/center/1", { headers: { authorization: "Bearer " + token } });
  assert.equal(expired.status, 401); assert.ok(!(await expired.text()).includes(token));
  for (const path of ["/role", "/center/1", "/api/customers", "/api/tickets"])
    assert.equal((await fetch(live.url + path)).status, 404);
});
test("HTTP đầy session trả503 đúng envelope và không tiết lộ credential", async () => {
  const capped = createAuth(identity.config, identity.credentials, { ttlSeconds: 3600, maxSessions: 1 });
  const server = await serve(createApp(capped));
  try {
    const request = () => fetch(server.url + "/api/auth/login", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "nv_demo_a", password: identity.password }),
    });
    assert.equal((await request()).status, 200);
    const full = await request(); assert.equal(full.status, 503);
    const body = await full.json(); assert.equal(body.error.code, "AUTH_CAPACITY_REACHED");
    assert.deepEqual(body.error.fields, {});
    assert.ok(!JSON.stringify(body).includes(identity.password));
  } finally { capped.close(); await server.close(); }
});
