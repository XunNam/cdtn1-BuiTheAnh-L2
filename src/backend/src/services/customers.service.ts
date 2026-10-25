import type { Pool } from "pg";
import type { Principal } from "../auth.ts";
import { requireRole, requireCreateCenter } from "../auth.ts";
import { AppError, errorCode } from "../errors.ts";
import { withTransaction } from "../db.ts";
import { customerDto } from "../customer-device.dto.ts";
import type { NewCustomer, CustomerPatch } from "../customer-device.validation.ts";
import { customerRepository } from "../repositories/customers.repository.ts";

export function employeeCenter(principal: Principal): number {
  requireRole(principal, ["NHAN_VIEN_TIEP_NHAN"]);
  requireCreateCenter(principal, principal.active_center_id);
  return principal.active_center_id;
}
export function missingCustomer(): never { throw new AppError("CUSTOMER_NOT_FOUND", "Không tìm thấy khách hàng trong phạm vi được phép."); }
export function resourceChanged(): never { throw new AppError("RESOURCE_CHANGED", "Hồ sơ đã thay đổi. Hãy tải lại trước khi thử tiếp."); }
export function uniqueConstraint(error: unknown, constraint: string): boolean {
  return errorCode(error) === "23505" && typeof error === "object" && error !== null && "constraint" in error && error.constraint === constraint;
}
export function createCustomerService(pool: Pool, now = () => new Date(), repo = customerRepository) {
  return {
    async lookup(principal: Principal, phone: string) {
      const centerId = employeeCenter(principal);
      const row = await repo.findActiveByPhone(pool, phone, centerId);
      if (!row) missingCustomer();
      return customerDto(row, principal.role);
    },
    async create(principal: Principal, input: NewCustomer) {
      const centerId = employeeCenter(principal);
      try { return customerDto(await repo.create(pool, input, centerId, now()), principal.role); }
      catch (error) {
        if (!uniqueConstraint(error, "customer_phone_key")) throw error;
        // INSERT autocommit đã rollback trước SELECT; không trả hồ sơ tombstone/ngoài quyền.
        const existing = await repo.findActiveByPhone(pool, input.phone, centerId);
        throw new AppError("PHONE_ALREADY_EXISTS", "Số điện thoại đã có hồ sơ. Hãy sử dụng hồ sơ hiện có trong phạm vi được phép.", {},
          existing ? { existing_customer: customerDto(existing, principal.role) } : {});
      }
    },
    async patch(principal: Principal, id: number, patch: CustomerPatch) {
      const centerId = employeeCenter(principal);
      const observed = await repo.findById(pool, id, centerId);
      if (!observed || observed.deleted_at) missingCustomer();
      return withTransaction(pool, async client => {
        const row = await repo.findById(client, id, centerId, true);
        if (!row || row.deleted_at) resourceChanged();
        const updated = await repo.patch(client, id, centerId, patch);
        if (!updated) resourceChanged();
        return customerDto(updated, principal.role);
      });
    },
    async remove(principal: Principal, id: number): Promise<void> {
      const centerId = employeeCenter(principal);
      await withTransaction(pool, async client => {
        const row = await repo.findById(client, id, centerId, true);
        if (!row) missingCustomer();
        if (!row.deleted_at) await repo.softDelete(client, id, centerId, now());
      });
    },
  };
}
export type CustomerService = ReturnType<typeof createCustomerService>;
