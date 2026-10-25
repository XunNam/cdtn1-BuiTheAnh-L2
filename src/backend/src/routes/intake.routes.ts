import { Router } from "express";
import type { RequestHandler } from "express";
import type { Auth } from "../auth.ts";
import { requireRole } from "../auth.ts";
import { pagination, positiveId, queryValues } from "../validation.ts";
import { calendarDate } from "../domain/warranty.ts";
import { newTicket } from "../ticket.validation.ts";
import type { CatalogService } from "../services/catalog.service.ts";
import type { WarrantyService } from "../services/warranty.service.ts";
import type { TicketService } from "../services/tickets.service.ts";
import { json, readEmpty } from "./customer-device.routes.ts";

export type IntakeServices = { catalog: CatalogService; warranty: WarrantyService; tickets: TicketService };
export function intakeRoutes(auth: Auth, services: IntakeServices) {
  const router = Router();
  const employee: RequestHandler = (req, _res, next) => {
    try { requireRole(req.principal!, ["NHAN_VIEN_TIEP_NHAN"]); next(); } catch (error) { next(error); }
  };
  const protect = [auth.requireAuth, employee];
  router.get("/products", ...protect, ...readEmpty, (req, res) => {
    const { page, size } = pagination(queryValues(req.originalUrl, ["page", "size"]));
    res.json(services.catalog.products(req.principal!, page, size));
  });
  router.get("/issue-categories", ...protect, ...readEmpty, async (req, res) => {
    queryValues(req.originalUrl, []);
    res.json(await services.catalog.categories(req.principal!));
  });
  router.get("/devices/:device_id/warranty", ...protect, ...readEmpty, async (req, res) => {
    const query = queryValues(req.originalUrl, ["assessment_date"]);
    const date = query.has("assessment_date") ? calendarDate(query.get("assessment_date"), "assessment_date") : undefined;
    res.json({ data: await services.warranty.preview(req.principal!, positiveId(req.params.device_id, "device_id"), date) });
  });
  router.post("/tickets", ...protect, ...json, async (req, res) => {
    queryValues(req.originalUrl, []);
    const data = await services.tickets.create(req.principal!, newTicket(req.body));
    res.location("/api/tickets/" + data.ticket_id).status(201).json({ data });
  });
  return router;
}
