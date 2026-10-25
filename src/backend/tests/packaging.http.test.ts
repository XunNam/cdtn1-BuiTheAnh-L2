import { test } from "node:test";
import assert from "node:assert/strict";
import { request } from "node:http";
import { gzipSync } from "node:zlib";
import { createAuth } from "../src/auth.ts";
import { createApp } from "../src/app.ts";
import { testIdentity, serve } from "./helpers.ts";
test("P6-H01 compressed request lỗi không làm chết process; login sau đó vẫn200", async () => {
  const identity = await testIdentity(), auth = createAuth(identity.config, identity.credentials, { ttlSeconds: 3600, maxSessions: 100 }), live = await serve(createApp(auth));
  try {
    const bytes = Buffer.concat([gzipSync(JSON.stringify({ username: "not-an-account", password: "fixture" })), Buffer.from("invalid-trailing-data")]);
    const status = await new Promise<number>((ok, fail) => {
      const req = request(live.url + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json", "content-encoding": "gzip", "content-length": String(bytes.length) } }, res => { res.resume(); res.on("end", () => ok(res.statusCode!)); }); req.on("error", fail); req.end(bytes);
    });
    assert.ok(status >= 400 && status < 500);
    await new Promise<void>(resolve => setImmediate(resolve));
    const valid = await fetch(live.url + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "nv_demo_a", password: identity.password }) }); assert.equal(valid.status, 200);
  } finally { await live.close(); auth.close(); }
});
