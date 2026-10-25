import { test } from "node:test";
import assert from "node:assert/strict";
import { runtimeConfig } from "../src/runtime-config.ts";
const base = { DB_HOST: "localhost", DB_NAME: "mekong-mobile-l2", DB_USER: "fixture", DB_PASSWORD: "fixture-only" };
test("P6-U01 local guard vẫn chặn host Internet/database khác", () => {
  assert.equal(runtimeConfig(base).host, "127.0.0.1");
  for (const host of ["database", "host.docker.internal", "example.com"]) assert.throws(() => runtimeConfig({ ...base, DB_HOST: host }), { code: "CONFIGURATION_ERROR" });
});
test("P6-U02 Compose chỉ service database và đúng database, không vô hiệu hóa guard", () => {
  const cfg = { ...base, L2_DEPLOYMENT: "compose", DB_HOST: "database" };
  assert.equal(runtimeConfig(cfg).host, "0.0.0.0");
  for (const host of ["localhost", "host.docker.internal", "example.com"]) assert.throws(() => runtimeConfig({ ...cfg, DB_HOST: host }), { code: "CONFIGURATION_ERROR" });
  assert.throws(() => runtimeConfig({ ...cfg, DB_NAME: "other" }), { code: "CONFIGURATION_ERROR" });
});
test("P6-U03 mode lạ và config placeholder bị từ chối", () => {
  assert.throws(() => runtimeConfig({ ...base, L2_DEPLOYMENT: "production" }), { code: "CONFIGURATION_ERROR" });
  assert.throws(() => runtimeConfig({ ...base, DB_PASSWORD: "<fill>" }), { code: "CONFIGURATION_ERROR" });
});
