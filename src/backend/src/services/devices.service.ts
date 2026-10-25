import type { Pool } from "pg";
import type { Principal } from "../auth.ts";
import type { ReferenceConfig } from "../reference-config.ts";
import type { NewDevice } from "../customer-device.validation.ts";
import { AppError } from "../errors.ts";
import { withTransaction } from "../db.ts";
import { deviceDto, safeNumber } from "../customer-device.dto.ts";
import { customerRepository } from "../repositories/customers.repository.ts";
import { deviceRepository } from "../repositories/devices.repository.ts";
import { employeeCenter, missingCustomer, resourceChanged, uniqueConstraint } from "./customers.service.ts";

function missingDevice(): never { throw new AppError("DEVICE_NOT_FOUND", "Không tìm thấy thiết bị trong phạm vi được phép."); }
export function createDeviceService(
  pool: Pool, config: ReferenceConfig, now = () => new Date(),
  customers = customerRepository, devices = deviceRepository,
) {
  return {
    async list(principal: Principal, customerId: number, serial: string | null, page: number, size: number) {
      const centerId = employeeCenter(principal);
      const result = await devices.list(pool, customerId, centerId, serial, page, size);
      if (result.customer_id === null) missingCustomer();
      return { data: result.devices.map(deviceDto), meta: { page, size, total: safeNumber(result.total) } };
    },
    async create(principal: Principal, customerId: number, input: NewDevice) {
      const centerId = employeeCenter(principal);
      try {
        return await withTransaction(pool, async client => {
          const parent = await customers.findById(client, customerId, centerId, true);
          if (!parent || parent.deleted_at) missingCustomer();
          const product = config.products.find(p => p.product_id === input.product_id && p.is_active);
          if (!product) throw new AppError("PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm.");
          return deviceDto(await devices.create(client, customerId, input, product.warranty_months));
        });
      } catch (error) {
        if (!uniqueConstraint(error, "device_serial_no_key")) throw error;
        // Transaction lỗi đã rollback/release; không khóa khách hàng khác để xử lý collision.
        const existing = await devices.findBySerial(pool, input.serial_no);
        if (existing && existing.customer_id !== String(customerId))
          throw new AppError("DEVICE_OWNER_MISMATCH", "Thiết bị không thuộc về khách hàng được chọn.");
        const visible = existing && existing.center_id === String(centerId) && !existing.deleted_at && !existing.customer_deleted_at;
        throw new AppError("SERIAL_ALREADY_EXISTS", "Serial/IMEI đã tồn tại.", {},
          visible ? { existing_device: deviceDto(existing) } : {});
      }
    },
    async patch(principal: Principal, customerId: number, deviceId: number, date: string | null) {
      const centerId = employeeCenter(principal);
      const parent = await customers.findById(pool, customerId, centerId);
      if (!parent || parent.deleted_at) missingCustomer();
      const observed = await devices.findById(pool, deviceId, customerId);
      if (!observed || observed.deleted_at) missingDevice();
      return withTransaction(pool, async client => {
        const currentParent = await customers.findById(client, customerId, centerId, true);
        if (!currentParent || currentParent.deleted_at) resourceChanged();
        const current = await devices.findById(client, deviceId, customerId, true);
        if (!current || current.deleted_at) resourceChanged();
        const updated = await devices.patch(client, deviceId, customerId, date);
        if (!updated) resourceChanged();
        return deviceDto(updated);
      });
    },
    async remove(principal: Principal, customerId: number, deviceId: number): Promise<void> {
      const centerId = employeeCenter(principal);
      await withTransaction(pool, async client => {
        const parent = await customers.findById(client, customerId, centerId, true);
        if (!parent) missingCustomer(); // DELETE child vẫn được phép khi cha là tombstone.
        const device = await devices.findById(client, deviceId, customerId, true);
        if (!device) missingDevice();
        if (!device.deleted_at) await devices.softDelete(client, deviceId, customerId, now());
      });
    },
  };
}
export type DeviceService = ReturnType<typeof createDeviceService>;
