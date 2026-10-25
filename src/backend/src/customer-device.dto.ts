import type { Role } from "./reference-config.ts";
import type { CustomerRow } from "./repositories/customers.repository.ts";
import type { DeviceRow } from "./repositories/devices.repository.ts";
import { AppError } from "./errors.ts";

export function safeNumber(value: string | number): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0) throw new AppError("INTERNAL_ERROR", "Giá trị dữ liệu vượt miền an toàn.");
  return result;
}
export function maskPhone(phone: string, role: Role): string {
  return role === "QUAN_LY_TTBH" ? phone : phone.slice(0, 3) + "****" + phone.slice(-3);
}
export function customerDto(row: CustomerRow, role: Role) {
  return {
    customer_id: safeNumber(row.customer_id), full_name: row.full_name, phone: maskPhone(row.phone, role),
    address: row.address, created_at: new Date(row.created_at.getTime() + 7 * 3600000).toISOString().replace("Z", "+07:00"),
  };
}
export function deviceDto(row: DeviceRow) {
  return { device_id: safeNumber(row.device_id), customer_id: safeNumber(row.customer_id), product_id: safeNumber(row.product_id),
    serial_no: row.serial_no, purchase_date: row.purchase_date, warranty_months: row.warranty_months };
}
