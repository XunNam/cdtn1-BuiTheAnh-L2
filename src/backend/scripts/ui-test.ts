import { createServer } from "node:http";
import type { Server } from "node:http";
import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile, unlink, cp, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, createHash } from "node:crypto";
import os from "node:os";
import { createPool, checkDatabase } from "../src/db.ts";
import { runtimeConfig } from "../src/runtime-config.ts";
import { migrate } from "../src/migrate.ts";
import { seed } from "../src/seed.ts";
import { createAuth } from "../src/auth.ts";
import { makeCredential } from "../src/credentials.ts";
import { validateReference } from "../src/reference-config.ts";
import { createApp } from "../src/app.ts";
import { createCustomerService } from "../src/services/customers.service.ts";
import { createDeviceService } from "../src/services/devices.service.ts";
import { createCatalogService } from "../src/services/catalog.service.ts";
import { createWarrantyService } from "../src/services/warranty.service.ts";
import { createTicketService } from "../src/services/tickets.service.ts";
import { testIdentity } from "../tests/helpers.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../.."), front = resolve(root, "src/frontend");
const runtime = runtimeConfig(), admin = createPool(runtime), nonce = randomBytes(8).toString("hex"), schema = "phase2_test_ui_" + nonce, pool = createPool(runtime, schema);
const secretFile = resolve(front, ".private/ui-" + nonce + ".json"), controlFile = resolve(front, ".private/control-" + nonce + ".json"), statusFile = resolve(front, ".private/status-" + nonce + ".json");
let created = false, server: Server | undefined, frontend: ReturnType<typeof spawn> | undefined, auth: ReturnType<typeof createAuth> | undefined, poll: ReturnType<typeof setInterval> | undefined;
const ownFiles: string[] = [];
async function fingerprint() {
  const hashes: string[] = [];
  for (const table of ["customer", "device", "issue_category", "ticket", "ticket_status_log", "ticket_communication", "schema_migration"]) {
    const values = (await admin.query("SELECT to_jsonb(t)::text AS v FROM public." + table + " t")).rows.map(r => r.v).sort(); hashes.push(createHash("sha256").update(values.join("\n")).digest("hex"));
  }
  return JSON.stringify(hashes);
}
async function listen(listener: Server, port = 0) { await new Promise<void>((ok, fail) => { listener.once("error", fail); listener.listen(port, "127.0.0.1", () => ok()); }); const addr = listener.address(); if (!addr || typeof addr === "string") throw new Error("Listener unavailable"); return addr.port; }
async function closeBackend() { if (server?.listening) { server.closeAllConnections(); await new Promise<void>((ok, fail) => server!.close(e => e ? fail(e) : ok())); } }
const publicBefore = await fingerprint();
try {
  const dbInfo = await checkDatabase(admin); await admin.query('CREATE SCHEMA "' + schema + '"'); created = true; await migrate(pool);
  const identity = await testIdentity();
  // Chỉ trong harness cách ly: danh mục >100 để phát hiện UI bỏ sót trang E05.
  const reference = validateReference({ ...identity.config,
    products: [...identity.config.products, ...Array.from({ length: 101 }, (_, index) => ({ product_id: 1001 + index, product_name: "Sản phẩm phân trang " + String(index + 1).padStart(3, "0"), warranty_months: (index + 1) % 13, is_active: true }))],
    centers: [...identity.config.centers, { center_id: 3, center_name: "Test empty", is_active: true }], accounts: [...identity.config.accounts, { employee_id: 41, username: "ql_empty", role: "QUAN_LY_TTBH", is_active: true, active_center_id: 3, allowed_center_ids: [3] }] });
  const credentials = [...identity.credentials, await makeCredential(41, identity.password)]; await seed(pool, reference);
  let businessInstant: string | null = null;
  const businessNow = () => businessInstant ? new Date(businessInstant) : new Date();
  function app(config = reference) {
    auth = createAuth(config, credentials, { ttlSeconds: 3600, maxSessions: 100 });
    const tickets = createTicketService(pool, config, businessNow);
    return createApp(auth, { customers: createCustomerService(pool), devices: createDeviceService(pool, config, businessNow) }, { catalog: createCatalogService(pool, config), warranty: createWarrantyService(pool, businessNow), tickets }, tickets);
  }
  let application = app(); server = createServer(application); const backendPort = await listen(server);
  const probe = createServer(); const frontendPort = await listen(probe); await new Promise<void>(ok => probe.close(() => ok()));
  await mkdir(dirname(secretFile), { recursive: true });
  const fixture = { password: identity.password, backendUrl: "http://127.0.0.1:" + backendPort, controlFile, statusFile, productCount: reference.products.filter(product => product.is_active).length,
    environment: { node: process.version, postgres: dbInfo.server_version, cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, memoryBytes: os.totalmem(), os: os.platform() + " " + os.release(), ticketCount: (await pool.query("SELECT count(*)::int AS n FROM ticket")).rows[0].n } };
  for (const [file, value] of [[secretFile, fixture], [controlFile, { nonce: 0, action: "ready" }], [statusFile, { nonce: 0 }]] as const) { await writeFile(file, JSON.stringify(value), { flag: "wx", mode: 0o600 }); ownFiles.push(file); }
  let handled = 0, processing = false;
  poll = setInterval(() => {
    if (processing) return; processing = true;
    void (async () => {
      try {
        const command = JSON.parse(await readFile(controlFile, "utf8")); if (!Number.isSafeInteger(command.nonce) || command.nonce <= handled) return; handled = command.nonce;
        if (command.action === "pause") await closeBackend();
        else if (command.action === "resume") { if (!server?.listening) { server = createServer(application); await listen(server, backendPort); } }
        else if (command.action === "restart") {
          await closeBackend(); auth?.close(); businessInstant = null;
          await pool.query("UPDATE issue_category SET is_active=true");
          application = app(); server = createServer(application); await listen(server, backendPort);
        }
        else if (command.action === "clock") {
          if (typeof command.instant !== "string" || !/^20[0-9]{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/.test(command.instant) || !Number.isFinite(Date.parse(command.instant))) throw new Error("Invalid test clock");
          businessInstant = command.instant;
        }
        else if (command.action === "empty-categories") await pool.query("UPDATE issue_category SET is_active=false");
        else if (command.action === "restore-categories") await pool.query("UPDATE issue_category SET is_active=true");
        else if (command.action === "deactivate-category") {
          if (!Number.isSafeInteger(command.categoryId) || command.categoryId <= 0) throw new Error("Invalid test category");
          await pool.query("UPDATE issue_category SET is_active=false WHERE category_id=$1", [command.categoryId]);
        }
        else if (command.action === "empty-products") {
          await closeBackend(); auth?.close();
          application = app(validateReference({ ...reference, products: reference.products.map(product => ({ ...product, is_active: false })) }));
          server = createServer(application); await listen(server, backendPort);
        }
        else throw new Error("Invalid test control");
        await writeFile(statusFile, JSON.stringify({ nonce: handled, ok: true }));
      } catch { await writeFile(statusFile, JSON.stringify({ nonce: handled, ok: false })).catch(() => {}); }
      finally { processing = false; }
    })();
  }, 50); poll.unref();
  const standalone = resolve(front, ".next/standalone"); await access(resolve(standalone, "server.js"));
  await cp(resolve(front, ".next/static"), resolve(standalone, ".next/static"), { recursive: true });
  frontend = spawn(process.execPath, [resolve(standalone, "server.js")], { cwd: front, windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, PORT: String(frontendPort), HOSTNAME: "127.0.0.1", L2_API_PROXY_TARGET: fixture.backendUrl, NEXT_TELEMETRY_DISABLED: "1" } });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (frontend.exitCode !== null) throw new Error("Frontend startup failed");
    try { const r = await fetch("http://127.0.0.1:" + frontendPort); if (r.ok) { ready = true; break; } } catch { /* Đợi listener riêng, không reset DB. */ }
    await new Promise(r => setTimeout(r, 100));
  }
  if (!ready) throw new Error("Frontend startup timeout");
  const browser = spawn(process.execPath, [resolve(front, "node_modules/@playwright/test/cli.js"), "test"], { cwd: front, windowsHide: true, stdio: "inherit", env: { ...process.env, L2_UI_BASE_URL: "http://127.0.0.1:" + frontendPort, L2_UI_FIXTURE: secretFile } });
  const exit = await new Promise<number>(ok => { browser.once("error", () => ok(1)); browser.once("exit", c => ok(c ?? 1)); });
  if (exit !== 0) process.exitCode = exit;
  if (await fingerprint() !== publicBefore) throw new Error("Public data changed during UI test");
  console.log("UI_FIXTURE_PUBLIC_PRESERVED");
} catch (error) { console.error(error instanceof Error ? "UI_TEST_FAILED: " + error.message : "UI_TEST_FAILED"); process.exitCode = 1; }
finally {
  if (poll) clearInterval(poll);
  if (frontend && frontend.exitCode === null) { frontend.kill("SIGTERM"); await new Promise<void>(ok => { frontend!.once("exit", () => ok()); const timer = setTimeout(() => { frontend!.kill("SIGKILL"); ok(); }, 5000); timer.unref(); }); }
  await closeBackend(); auth?.close(); await pool.end();
  try { if (created && /^phase2_test_ui_[0-9a-f]{16}$/.test(schema)) await admin.query('DROP SCHEMA "' + schema + '" CASCADE'); }
  finally { await admin.end(); for (const file of ownFiles) await unlink(file).catch(() => {}); }
}
