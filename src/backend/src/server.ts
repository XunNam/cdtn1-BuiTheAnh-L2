import { pathToFileURL } from "node:url";
import { createPool } from "./db.ts";
import { runtimeConfig } from "./runtime-config.ts";
import type { RuntimeConfig } from "./runtime-config.ts";
import { prepareFoundation } from "./foundation.ts";
import { createApp } from "./app.ts";
import { AppError } from "./errors.ts";
import { createCustomerService } from "./services/customers.service.ts";
import { createDeviceService } from "./services/devices.service.ts";
import { createCatalogService } from "./services/catalog.service.ts";
import { createWarrantyService } from "./services/warranty.service.ts";
import { createTicketService } from "./services/tickets.service.ts";

export async function startServer(config: RuntimeConfig = runtimeConfig()) {
  const pool = createPool(config);
  let foundation: Awaited<ReturnType<typeof prepareFoundation>> | undefined;
  try {
    foundation = await prepareFoundation(pool, config);
    const tickets = createTicketService(pool);
    const app = createApp(foundation.auth, { customers: createCustomerService(pool), devices: createDeviceService(pool, foundation.reference) }, {
      catalog: createCatalogService(pool, foundation.reference), warranty: createWarrantyService(pool), tickets,
    }, tickets);
    const server = await new Promise<ReturnType<typeof app.listen>>((resolve, reject) => {
      const listener = app.listen(config.port, config.host, () => resolve(listener));
      listener.once("error", reject);
    });
    let closing: Promise<void> | undefined;
    const close = () => closing ??= (async () => {
      foundation!.auth.close();
      const force = setTimeout(() => server.closeAllConnections(), 5000); force.unref();
      try { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
      finally { clearTimeout(force); await pool.end(); }
    })();
    return { server, close };
  } catch (error) {
    foundation?.auth.close();
    await pool.end();
    throw error;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().then(({ close }) => {
    console.log("Backend L2 đã khởi động: login và E01–E13 đến Phase 5.");
    const stop = () => { close().catch(() => { console.error("BACKEND_SHUTDOWN_FAILED"); process.exitCode = 1; }); };
    process.once("SIGINT", stop); process.once("SIGTERM", stop);
  }).catch((error: unknown) => {
    console.error(error instanceof AppError ? error.code + ": " + error.message : "BACKEND_STARTUP_FAILED");
    process.exitCode = 1;
  });
}
