import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createAuth, requireRole, requireResourceScope, requireCreateCenter, canAccessCenter } from "../src/auth.ts";
import { validateReference } from "../src/reference-config.ts";
import { validateCredentials, verifyPassword } from "../src/credentials.ts";
import { runtimeConfig } from "../src/runtime-config.ts";
import { AppError, publicError } from "../src/errors.ts";
import { text, objectBody, positiveId, queryValues, pagination } from "../src/validation.ts";
import { inTransaction, withTransaction } from "../src/db.ts";
import type { Pool, PoolClient } from "pg";
import { testIdentity, referenceInput } from "./helpers.ts";

let identity: Awaited<ReturnType<typeof testIdentity>>;
before(async () => { identity = await testIdentity(); });
const isCode = (code: string) => (error: unknown) => error instanceof AppError && error.code === code;

test("config demo hợp lệ, deep freeze và miền tháng 0/120", () => {
  assert.equal(identity.config.centers.length, 2);
  assert.ok(Object.isFrozen(identity.config.accounts[0]!.allowed_center_ids));
  assert.ok(Object.isFrozen(identity.config.products));
  assert.ok(identity.config.products.some(p => p.warranty_months === 0));
  assert.ok(identity.config.products.some(p => p.warranty_months === 120));
});
for (const variant of ["version", "duplicate-center", "duplicate-product", "duplicate-employee", "duplicate-username", "membership", "active-center", "months", "role", "extra-field"]) {
  test("config từ chối " + variant, async () => {
    const x = await referenceInput();
    if (variant === "version") x.config_version = 0;
    if (variant === "duplicate-center") x.centers.push(x.centers[0]);
    if (variant === "duplicate-product") x.products.push(x.products[0]);
    if (variant === "duplicate-employee") x.accounts[1].employee_id = x.accounts[0].employee_id;
    if (variant === "duplicate-username") x.accounts[1].username = x.accounts[0].username;
    if (variant === "membership") x.accounts[0].allowed_center_ids = [999];
    if (variant === "active-center") x.accounts[0].active_center_id = 2;
    if (variant === "months") x.products[0].warranty_months = 121;
    if (variant === "role") x.accounts[0].role = "ADMIN";
    if (variant === "extra-field") x.accounts[0].password = "not-a-credential";
    assert.throws(() => validateReference(x), isCode("CONFIGURATION_ERROR"));
  });
}
test("runtime chỉ chấp nhận đúng database local; lỗi không lộ password", () => {
  const env = { DB_HOST: "localhost", DB_PORT: "5432", DB_NAME: "mekong-mobile-l2", DB_USER: "fixture", DB_PASSWORD: identity.password };
  assert.equal(runtimeConfig(env).auth.ttlSeconds, 3600);
  assert.equal(runtimeConfig(env).auth.maxSessions, 100);
  for (const mutation of [{ DB_NAME: "another_database" }, { DB_HOST: "example.com" }, { DB_PASSWORD: "" }, { DB_PORT: "abc" }, { AUTH_MAX_SESSIONS: "101" }])
    assert.throws(() => runtimeConfig({ ...env, ...mutation }), isCode("CONFIGURATION_ERROR"));
});
test("validation: object/whitelist/required/Unicode sau trim và password không trim", () => {
  for (const input of [null, [], "x", 2]) assert.throws(() => objectBody(input, ["x"]), isCode("VALIDATION_FAILED"));
  assert.throws(() => objectBody({ role: "ADMIN" }, ["x"]), isCode("VALIDATION_FAILED"));
  assert.throws(() => objectBody({}, ["x"], ["x"]), isCode("VALIDATION_FAILED"));
  assert.equal(text("\uFEFF 😀 \u00a0", "content", 1, 1), "😀");
  assert.equal(text("e\u0301", "content", 2, 2), "e\u0301");
  assert.equal(text(identity.password, "password", 1, 256, false), identity.password);
  for (const s of ["", "\t \u00a0", "\0", "\ud800", "a".repeat(2001)])
    assert.throws(() => text(s, "content", 1, 2000), isCode("VALIDATION_FAILED"));
  assert.equal(text("😀".repeat(2000), "content", 1, 2000).length, 4000);
});
test("validation: safe ID, query lặp/lạ và pagination", () => {
  assert.equal(positiveId("9007199254740991", "id"), Number.MAX_SAFE_INTEGER);
  for (const x of ["0", "-1", "1.1", "9007199254740992", "1e2"]) assert.throws(() => positiveId(x, "id"));
  assert.throws(() => queryValues("/x?page=1&page=2", ["page"]));
  assert.throws(() => queryValues("/x?role=ADMIN", ["page"]));
  assert.deepEqual(pagination(queryValues("/x", ["page", "size"])), { page: 1, size: 20 });
  assert.throws(() => pagination(queryValues("/x?size=101", ["size"])));
});
test("error mapping: AppError và PG UNIQUE/FK/CHECK không tiết lộ detail/stack", () => {
  assert.equal(publicError(new AppError("ROLE_FORBIDDEN", "Không được phép.")).status, 403);
  for (const [code, status] of [["23505", 409], ["23503", 400], ["23514", 400], ["23502", 400], ["22P02", 400], ["XX000", 500]]) {
    const error = publicError({ code, detail: identity.password, message: identity.password });
    assert.equal(error.status, status);
    assert.ok(!JSON.stringify(error).includes(identity.password));
    assert.deepEqual(error.fields, {});
  }
});
test("scrypt: đúng/sai password, salt khác nhau và credential malformed bị từ chối", async () => {
  assert.ok(await verifyPassword(identity.password, identity.credentials[0]!));
  assert.equal(await verifyPassword(identity.password.trim(), identity.credentials[0]!), false);
  assert.notEqual(identity.credentials[0]!.salt, identity.credentials[1]!.salt);
  assert.equal(validateCredentials(identity.credentials, identity.config).length, 5);
  for (const input of [[], [{ ...identity.credentials[0], hash: "x" }], identity.credentials.map(c => ({ ...c, N: 1 }))])
    assert.throws(() => validateCredentials(input, identity.config), isCode("CONFIGURATION_ERROR"));
});
test("token: random/digest lookup, TTL đúng biên và restart", async () => {
  let time = Date.parse("2026-10-24T09:00:00+07:00");
  const auth = createAuth(identity.config, identity.credentials, { ttlSeconds: 3600, maxSessions: 100, now: () => time });
  const restarted = createAuth(identity.config, identity.credentials, { ttlSeconds: 3600, maxSessions: 100, now: () => time });
  try {
    const a = await auth.login("nv_demo_a", identity.password), b = await auth.login("nv_demo_a", identity.password);
    assert.match(a.access_token, /^[A-Za-z0-9_-]{43}$/); assert.notEqual(a.access_token, b.access_token);
    assert.equal(a.expires_at, "2026-10-24T10:00:00.000+07:00");
    assert.equal(auth.authenticate("Bearer " + a.access_token).employee_id, 11);
    assert.throws(() => auth.authenticate("Bearer invalid"), isCode("AUTHENTICATION_REQUIRED"));
    assert.throws(() => restarted.authenticate("Bearer " + a.access_token), isCode("AUTHENTICATION_REQUIRED"));
    time += 3599999; assert.equal(auth.authenticate("Bearer " + a.access_token).employee_id, 11);
    time++; assert.throws(() => auth.authenticate("Bearer " + a.access_token), isCode("AUTHENTICATION_REQUIRED"));
    assert.equal(auth.sessionCount(), 0);
  } finally { auth.close(); restarted.close(); }
});
test("session cap/cleanup và login đồng thời không vượt giới hạn", async () => {
  let time = 0;
  const auth = createAuth(identity.config, identity.credentials, { ttlSeconds: 1, maxSessions: 2, now: () => time });
  try {
    const results = await Promise.allSettled([1, 2, 3].map(() => auth.login("nv_demo_a", identity.password)));
    assert.equal(results.filter(r => r.status === "fulfilled").length, 2);
    assert.equal(auth.sessionCount(), 2);
    assert.ok(results.some(r => r.status === "rejected" && isCode("AUTH_CAPACITY_REACHED")(r.reason)));
    time = 1000; auth.sweep(); assert.equal(auth.sessionCount(), 0);
    await auth.login("nv_demo_a", identity.password); assert.equal(auth.sessionCount(), 1);
    auth.close(); assert.equal(auth.sessionCount(), 0);
  } finally { auth.close(); }
});
test("authorization: NV active center; QL allowed centers; role và out-of-scope", async () => {
  const auth = createAuth(identity.config, identity.credentials, { ttlSeconds: 3600, maxSessions: 100 });
  try {
    const nv = (await auth.login("nv_demo_a", identity.password)).principal;
    const ql = (await auth.login("ql_demo_ab", identity.password)).principal;
    assert.ok(canAccessCenter(nv, 1)); assert.equal(canAccessCenter(nv, 2), false);
    assert.ok(canAccessCenter(ql, 1)); assert.ok(canAccessCenter(ql, 2));
    assert.throws(() => requireRole(nv, ["QUAN_LY_TTBH"]), isCode("ROLE_FORBIDDEN"));
    assert.throws(() => requireResourceScope(nv, 2), isCode("RESOURCE_NOT_FOUND"));
    assert.throws(() => requireCreateCenter(nv, 2), isCode("ROLE_FORBIDDEN"));
    await assert.rejects(auth.login("inactive_demo", identity.password), isCode("INVALID_CREDENTIALS"));
  } finally { auth.close(); }
});
test("transaction helper dùng một connection và release khi commit/rollback lỗi", async () => {
  for (const fail of [false, true]) {
    const calls: string[] = [];
    const original = new Error("callback marker");
    const client = {
      query: async (sql: string) => { calls.push(sql); if (sql === "ROLLBACK" && fail) throw new Error("rollback marker"); },
      release: (destroy?: boolean) => { calls.push(destroy ? "RELEASE_DESTROY" : "RELEASE"); },
    } as unknown as PoolClient;
    const pool = { connect: async () => client } as Pick<Pool, "connect">;
    const action = () => withTransaction(pool, async c => {
      assert.equal(c, client); await c.query("WORK");
      if (fail) throw original;
      return 42;
    });
    if (fail) await assert.rejects(action(), e => e === original);
    else assert.equal(await action(), 42);
    assert.deepEqual(calls, ["BEGIN", "WORK", fail ? "ROLLBACK" : "COMMIT", fail ? "RELEASE_DESTROY" : "RELEASE"]);
  }
});
test("BEGIN lỗi không gọi callback", async () => {
  let called = false;
  const marker = new Error("begin");
  const client = { query: async () => { throw marker; } } as unknown as PoolClient;
  await assert.rejects(inTransaction(client, async () => { called = true; }), e => e === marker);
  assert.equal(called, false);
});
test("principal không còn hoạt động làm token cũ bị từ chối", async () => {
  // Stub mutable để mô phỏng account bị vô hiệu hóa; config production luôn deep freeze.
  const accounts = identity.config.accounts.map(a => ({ ...a }));
  const auth = createAuth({ ...identity.config, accounts }, identity.credentials, { ttlSeconds: 3600, maxSessions: 100 });
  try {
    const signed = await auth.login("nv_demo_a", identity.password);
    accounts[0]!.is_active = false;
    assert.throws(() => auth.authenticate("Bearer " + signed.access_token), isCode("AUTHENTICATION_REQUIRED"));
    assert.equal(auth.sessionCount(), 0);
  } finally { auth.close(); }
});
