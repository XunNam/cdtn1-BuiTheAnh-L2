import { Router } from "express";
import type { RequestHandler } from "express";
import type { Auth } from "../auth.ts";
import { requireRole } from "../auth.ts";
import type { Role } from "../reference-config.ts";
import type { TicketService } from "../services/tickets.service.ts";
import { pagination, positiveId, queryValues } from "../validation.ts";
import { approvalFilter, approvalNote, communicationContent } from "../ticket.validation.ts";
import { json, readEmpty } from "./customer-device.routes.ts";

export function ticketRoutes(auth: Auth, service: TicketService) {
  const router = Router();
  const role = (roles: readonly Role[]): RequestHandler => (req, _res, next) => {
    try { requireRole(req.principal!, roles); next(); } catch (error) { next(error); }
  };
  const manager = [auth.requireAuth, role(["QUAN_LY_TTBH"])], employee = [auth.requireAuth, role(["NHAN_VIEN_TIEP_NHAN"])];
  const reader = [auth.requireAuth, role(["NHAN_VIEN_TIEP_NHAN", "QUAN_LY_TTBH"])];
  router.get("/", ...manager, ...readEmpty, async (req, res) => {
    const query = queryValues(req.originalUrl, ["approval_status", "page", "size"]), { page, size } = pagination(query);
    res.json(await service.list(req.principal!, approvalFilter(query.get("approval_status") ?? "CHO_PHE_DUYET"), page, size));
  });
  router.get("/:ticket_id", ...reader, ...readEmpty, async (req, res) => {
    queryValues(req.originalUrl, []);
    res.json({ data: await service.detail(req.principal!, positiveId(req.params.ticket_id, "ticket_id")) });
  });
  router.post("/:ticket_id/warranty-approval", ...manager, ...json, async (req, res) => {
    queryValues(req.originalUrl, []);
    res.json({ data: await service.approve(req.principal!, positiveId(req.params.ticket_id, "ticket_id"), approvalNote(req.body)) });
  });
  router.get("/:ticket_id/communications", ...reader, ...readEmpty, async (req, res) => {
    const query = queryValues(req.originalUrl, ["page", "size"]), { page, size } = pagination(query);
    res.json(await service.communications(req.principal!, positiveId(req.params.ticket_id, "ticket_id"), page, size));
  });
  router.post("/:ticket_id/communications", ...employee, ...json, async (req, res) => {
    queryValues(req.originalUrl, []);
    res.status(201).json({ data: await service.communicate(req.principal!, positiveId(req.params.ticket_id, "ticket_id"), communicationContent(req.body)) });
  });
  return router;
}
