import type { Pool } from "pg";
import type { Principal } from "../auth.ts";
import { AppError } from "../errors.ts";
import { deviceRepository } from "../repositories/devices.repository.ts";
import { employeeCenter } from "./customers.service.ts";
import { safeNumber } from "../customer-device.dto.ts";
import { assessWarranty } from "../domain/warranty.ts";
import { localDate } from "../domain/business-time.ts";

export function createWarrantyService(pool: Pool, now = () => new Date(), devices = deviceRepository) {
  return {
    async preview(principal: Principal, id: number, assessmentDate?: string) {
      const device = await devices.findInScope(pool, id, employeeCenter(principal));
      if (!device) throw new AppError("DEVICE_NOT_FOUND", "Không tìm thấy thiết bị trong phạm vi được phép.");
      return { device_id: safeNumber(device.device_id), ...assessWarranty(device.purchase_date, device.warranty_months, assessmentDate ?? localDate(now())) };
    },
  };
}
export type WarrantyService = ReturnType<typeof createWarrantyService>;
