import express from "express";
import cors from "cors";
import type { Auth } from "./auth.ts";
import { AppError, errorHandler } from "./errors.ts";
import { objectBody, queryValues, text } from "./validation.ts";
import { customerDeviceRoutes } from "./routes/customer-device.routes.ts";
import type { CustomerDeviceServices } from "./routes/customer-device.routes.ts";
import { intakeRoutes } from "./routes/intake.routes.ts";
import type { IntakeServices } from "./routes/intake.routes.ts";
import { ticketRoutes } from "./routes/tickets.routes.ts";
import type { TicketService } from "./services/tickets.service.ts";

export function createApp(auth: Auth, services?: CustomerDeviceServices, intake?: IntakeServices, history?: TicketService) {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors({ origin: "http://localhost:3000" }));
  app.post("/api/auth/login",
    (req, _res, next) => {
      try {
        queryValues(req.originalUrl, []);
        if (!req.is("application/json")) throw new AppError("UNSUPPORTED_MEDIA_TYPE", "Body phải dùng application/json.");
        next();
      } catch (error) { next(error); }
    },
    express.json({ limit: "16kb", strict: false }),
    async (req, res) => {
      const body = objectBody(req.body, ["username", "password"], ["username", "password"]);
      const username = text(body.username, "username", 1, 64);
      const password = text(body.password, "password", 1, 256, false);
      res.set("Cache-Control", "no-store").status(200).json({ data: await auth.login(username, password) });
    });
  if (services) app.use("/api/customers", customerDeviceRoutes(auth, services));
  if (intake) app.use("/api", intakeRoutes(auth, intake));
  if (history) app.use("/api/tickets", ticketRoutes(auth, history));
  // Harness từng phase chỉ lắp services tương ứng; production lắp đủ E01–E13.
  app.use(errorHandler);
  app.use((_req, res) => { res.status(404).json({ error: { code: "RESOURCE_NOT_FOUND", message: "Không tìm thấy endpoint.", fields: {} } }); });
  return app;
}
