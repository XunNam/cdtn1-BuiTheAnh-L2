import express, { Router } from "express";
import type { RequestHandler } from "express";
import type { Auth } from "../auth.ts";
import { requireRole } from "../auth.ts";
import { AppError, validationError } from "../errors.ts";
import { positiveId, queryValues, pagination, text } from "../validation.ts";
import { normalizePhone, newCustomer, customerPatch, newDevice, devicePatch } from "../customer-device.validation.ts";
import type { CustomerService } from "../services/customers.service.ts";
import type { DeviceService } from "../services/devices.service.ts";

export type CustomerDeviceServices = { customers: CustomerService; devices: DeviceService; now?: () => Date };
export const json: RequestHandler[] = [
  (req, _res, next) => {
    if (!req.is("application/json")) return next(new AppError("UNSUPPORTED_MEDIA_TYPE", "Body phải dùng application/json."));
    next();
  },
  express.json({ limit: "16kb", strict: false }),
];
export const readEmpty: RequestHandler[] = [
  express.raw({ type: () => true, limit: "16kb" }),
  (req, _res, next) => {
    if (Buffer.isBuffer(req.body) && req.body.length) return next(new AppError("VALIDATION_FAILED", "Request đọc không nhận body.", { body: "Không được gửi body." }));
    next();
  },
];
const deleteEmpty: RequestHandler[] = [
  express.raw({ type: () => true, limit: "16kb" }),
  (req, _res, next) => {
    if (Buffer.isBuffer(req.body) && req.body.length) {
      return next(req.is("application/json")
        ? new AppError("VALIDATION_FAILED", "DELETE không nhận body.", { body: "Không được gửi body." })
        : new AppError("UNSUPPORTED_MEDIA_TYPE", "DELETE không nhận body không phải JSON."));
    }
    next();
  },
];
export function customerDeviceRoutes(auth: Auth, services: CustomerDeviceServices) {
  const router = Router(), now = services.now ?? (() => new Date());
  router.use(auth.requireAuth, (req, _res, next) => {
    try { requireRole(req.principal!, ["NHAN_VIEN_TIEP_NHAN"]); next(); } catch (error) { next(error); }
  });
  router.get("/", ...readEmpty, async (req, res) => {
    const query = queryValues(req.originalUrl, ["phone"]);
    if (!query.has("phone")) validationError("phone", "Thiếu số điện thoại.");
    res.json({ data: await services.customers.lookup(req.principal!, normalizePhone(query.get("phone"))) });
  });
  router.post("/", ...json, async (req, res) => {
    queryValues(req.originalUrl, []);
    res.status(201).json({ data: await services.customers.create(req.principal!, newCustomer(req.body)) });
  });
  router.patch("/:customer_id", ...json, async (req, res) => {
    queryValues(req.originalUrl, []);
    res.json({ data: await services.customers.patch(req.principal!, positiveId(req.params.customer_id, "customer_id"), customerPatch(req.body)) });
  });
  router.delete("/:customer_id", ...deleteEmpty, async (req, res) => {
    queryValues(req.originalUrl, []);
    await services.customers.remove(req.principal!, positiveId(req.params.customer_id, "customer_id"));
    res.status(204).end();
  });
  router.get("/:customer_id/devices", ...readEmpty, async (req, res) => {
    const id = positiveId(req.params.customer_id, "customer_id");
    const query = queryValues(req.originalUrl, ["serial_no", "page", "size"]), { page, size } = pagination(query);
    const serial = query.has("serial_no") ? text(query.get("serial_no"), "serial_no", 1, 50) : null;
    res.json(await services.devices.list(req.principal!, id, serial, page, size));
  });
  router.post("/:customer_id/devices", ...json, async (req, res) => {
    queryValues(req.originalUrl, []);
    res.status(201).json({ data: await services.devices.create(req.principal!, positiveId(req.params.customer_id, "customer_id"), newDevice(req.body, now())) });
  });
  router.patch("/:customer_id/devices/:device_id", ...json, async (req, res) => {
    queryValues(req.originalUrl, []);
    res.json({ data: await services.devices.patch(req.principal!, positiveId(req.params.customer_id, "customer_id"),
      positiveId(req.params.device_id, "device_id"), devicePatch(req.body, now()).purchase_date) });
  });
  router.delete("/:customer_id/devices/:device_id", ...deleteEmpty, async (req, res) => {
    queryValues(req.originalUrl, []);
    await services.devices.remove(req.principal!, positiveId(req.params.customer_id, "customer_id"), positiveId(req.params.device_id, "device_id"));
    res.status(204).end();
  });
  return router;
}
