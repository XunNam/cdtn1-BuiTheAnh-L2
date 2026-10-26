import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import type { Server } from "node:http";
import type { Pool } from "pg";
import { runtimeConfig } from "../src/runtime-config.ts";
import { createPool, checkDatabase } from "../src/db.ts";
import { migrate } from "../src/migrate.ts";
import { seed } from "../src/seed.ts";
import { loadReference } from "../src/reference-config.ts";
import { prepareFoundation } from "../src/foundation.ts";
import { createApp } from "../src/app.ts";
import { createCustomerService } from "../src/services/customers.service.ts";
import { createDeviceService } from "../src/services/devices.service.ts";
import type { Auth } from "../src/auth.ts";
import { AppError } from "../src/errors.ts";
import { createCatalogService } from "../src/services/catalog.service.ts";
import { createWarrantyService } from "../src/services/warranty.service.ts";
import { createTicketService } from "../src/services/tickets.service.ts";

// Cùng database được cấp, schema riêng cho manual test; không ghi public/credential.
export async function startManual(port = 3002, phase: 3 | 4 | 5 = 3) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new AppError("CONFIGURATION_ERROR", "Manual port không hợp lệ.");
  const runtime = runtimeConfig(), admin = createPool(runtime);
  const schema = "phase2_test_manual_p" + phase + "_" + randomBytes(8).toString("hex");
  let created = false, pool: Pool | undefined, server: Server | undefined, auth: Auth | undefined;
  let closing: Promise<void> | undefined;
  const close = () => closing ??= (async () => {
    try {
      if (server) {
        const force = setTimeout(() => server!.closeAllConnections(), 5000); force.unref();
        try { await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve())); }
        finally { clearTimeout(force); }
      }
    } finally {
      auth?.close();
      try {
        await pool?.end();
        // Identifier tự sinh; chỉ dọn schema do chính lần chạy này CREATE thành công.
        if (created && /^phase2_test_manual_p[345]_[0-9a-f]{16}$/.test(schema))
          await admin.query('DROP SCHEMA "' + schema + '" CASCADE');
      } finally { await admin.end(); }
    }
  })();
  try {
    const info = await checkDatabase(admin);
    if (!info.can_create_schema) throw new AppError("CONFIGURATION_ERROR", "Manual test cần CREATE schema trong database; không tự GRANT.");
    await admin.query('CREATE SCHEMA "' + schema + '"'); created = true;
    pool = createPool(runtime, schema);
    await migrate(pool);
    await seed(pool, await loadReference(runtime.referenceFile, pool));
    const foundation = await prepareFoundation(pool, runtime); auth = foundation.auth;
    const tickets = createTicketService(pool);
    const app = createApp(auth, { customers: createCustomerService(pool), devices: createDeviceService(pool, foundation.reference) }, phase >= 4 ? {
      catalog: createCatalogService(pool, foundation.reference), warranty: createWarrantyService(pool), tickets,
    } : undefined, phase === 5 ? tickets : undefined);
    server = await new Promise<Server>((resolve, reject) => {
      const listener = app.listen(port, "127.0.0.1", () => resolve(listener)); listener.once("error", reject);
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new AppError("INTERNAL_ERROR", "Không xác định được manual server.");
    return { url: "http://127.0.0.1:" + address.port, schema, close };
  } catch (error) {
    try { await close(); } catch { /* Giữ lỗi khởi tạo gốc, không in raw SQL/credential. */ }
    throw error;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const phase = process.argv[2] === "5" ? 5 : process.argv[2] === "4" ? 4 : 3;
  const raw = process.env.MANUAL_PORT ?? String(2999 + phase);
  if (!/^[1-9]\d*$/.test(raw)) {
    console.error("CONFIGURATION_ERROR: MANUAL_PORT không hợp lệ."); process.exitCode = 1;
  } else startManual(Number(raw), phase).then(running => {
    console.log("Manual Phase " + phase + ": " + running.url + "/api");
    console.log("Schema cách ly: " + running.schema + ". Ctrl+C để đóng và dọn dữ liệu manual; public giữ nguyên.");
    const stop = () => { running.close().catch(() => { console.error("MANUAL_CLEANUP_FAILED"); process.exitCode = 1; }); };
    process.once("SIGINT", stop); process.once("SIGTERM", stop);
  }).catch((error: unknown) => {
    console.error(error instanceof AppError ? error.code + ": " + error.message : "MANUAL_STARTUP_FAILED");
    process.exitCode = 1;
  });
}
