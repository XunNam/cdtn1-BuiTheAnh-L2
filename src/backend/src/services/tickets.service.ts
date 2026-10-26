import type { Pool } from "pg";
import type { Principal } from "../auth.ts";
import { requireCreateCenter, requireRole } from "../auth.ts";
import { serviceCenterRepository } from "../repositories/service-centers.repository.ts";
import type { NewTicket } from "../ticket.validation.ts";
import { AppError, validationError } from "../errors.ts";
import { withTransaction } from "../db.ts";
import { customerRepository } from "../repositories/customers.repository.ts";
import { deviceRepository } from "../repositories/devices.repository.ts";
import { catalogRepository } from "../repositories/catalog.repository.ts";
import { ticketRepository } from "../repositories/tickets.repository.ts";
import type { TicketRow } from "../repositories/tickets.repository.ts";
import { communicationRepository } from "../repositories/communications.repository.ts";
import { employeeCenter, missingCustomer } from "./customers.service.ts";
import { assessWarranty, initialApproval } from "../domain/warranty.ts";
import { computeDueDate } from "../domain/sla.ts";
import { localDate } from "../domain/business-time.ts";
import { ticketDto, ticketListDto, ticketDetailDto, approvalDto, communicationDto } from "../ticket.dto.ts";
import { safeNumber } from "../customer-device.dto.ts";

export function ticketCenters(principal: Principal): readonly number[] {
  requireRole(principal, ["NHAN_VIEN_TIEP_NHAN", "QUAN_LY_TTBH"]);
  return principal.role === "QUAN_LY_TTBH" ? principal.allowed_center_ids
    : principal.allowed_center_ids.includes(principal.active_center_id) ? [principal.active_center_id] : [];
}
function missingTicket(): never { throw new AppError("TICKET_NOT_FOUND", "Không tìm thấy phiếu trong phạm vi được phép."); }
export function ensureApprovalApplicable(row: Pick<TicketRow, "warranty_status" | "approval_status" | "status">): void {
  if (row.approval_status === "DA_PHE_DUYET") throw new AppError("ALREADY_APPROVED", "Phiếu đã được phê duyệt; không ghi đè kết quả.");
  if (row.warranty_status !== "CHUA_XAC_MINH" || row.approval_status !== "CHO_PHE_DUYET" || row.status !== "MOI")
    throw new AppError("APPROVAL_NOT_APPLICABLE", "Phiếu không thuộc trường hợp được phê duyệt.");
}
function internalWriteError(error: unknown, message: string): never {
  const failure = new AppError("INTERNAL_ERROR", message); failure.cause = error; throw failure;
}
export function createTicketService(pool: Pool, now = () => new Date(), tickets = ticketRepository, communications = communicationRepository) {
  return {
    async list(principal: Principal, approval: "CHO_PHE_DUYET" | "DA_PHE_DUYET", page: number, size: number) {
      requireRole(principal, ["QUAN_LY_TTBH"]);
      const result = await tickets.list(pool, ticketCenters(principal), approval, page, size);
      return { data: result.tickets.map(ticketListDto), meta: { page, size, total: safeNumber(result.total) } };
    },
    async detail(principal: Principal, id: number) {
      const row = await tickets.detail(pool, id, ticketCenters(principal));
      if (!row) missingTicket();
      return ticketDetailDto(row, principal.role);
    },
    async approve(principal: Principal, id: number, note: string | null) {
      requireRole(principal, ["QUAN_LY_TTBH"]);
      const centers = ticketCenters(principal);
      return withTransaction(pool, async client => {
        const row = await tickets.lock(client, id, centers);
        if (!row) missingTicket();
        ensureApprovalApplicable(row);
        let updated: TicketRow | undefined;
        try { updated = await tickets.approve(client, id, centers, principal.employee_id, now(), note); }
        catch (error) { internalWriteError(error, "Không thể ghi quyết định phê duyệt."); }
        if (!updated) throw new AppError("APPROVAL_NOT_APPLICABLE", "Điều kiện phê duyệt không còn phù hợp.");
        return approvalDto(updated);
      });
    },
    async communications(principal: Principal, id: number, page: number, size: number) {
      const result = await communications.list(pool, id, ticketCenters(principal), page, size);
      if (result.ticket_id === null) missingTicket();
      return { data: result.communications.map(communicationDto), meta: { page, size, total: safeNumber(result.total) } };
    },
    async communicate(principal: Principal, id: number, content: string) {
      requireRole(principal, ["NHAN_VIEN_TIEP_NHAN"]);
      const centers = ticketCenters(principal);
      return withTransaction(pool, async client => {
        if (!await tickets.lock(client, id, centers)) missingTicket();
        try { return communicationDto(await communications.insert(client, id, content, principal.employee_id, now())); }
        catch (error) { internalWriteError(error, "Không thể ghi lịch sử trao đổi."); }
      });
    },
    async create(principal: Principal, input: NewTicket) {
      const center = employeeCenter(principal);
      requireCreateCenter(principal, input.center_id);
      return withTransaction(pool, async client => {
        if (!await serviceCenterRepository.isActive(client, center, true))
          throw new AppError("ROLE_FORBIDDEN", "Trung tâm không thuộc phạm vi thao tác.");
        const customer = await customerRepository.findById(client, input.customer_id, center, true);
        if (!customer || customer.deleted_at) missingCustomer();
        // Chỉ phân biệt sai chủ trong cùng scope. Ngoài scope/tombstone đều404.
        const visible = await deviceRepository.findInScope(client, input.device_id, center);
        if (!visible) throw new AppError("DEVICE_NOT_FOUND", "Không tìm thấy thiết bị trong phạm vi được phép.");
        if (visible.customer_id !== String(input.customer_id))
          throw new AppError("DEVICE_OWNER_MISMATCH", "Thiết bị không thuộc về khách hàng được chọn.");
        const device = await deviceRepository.findById(client, input.device_id, input.customer_id, true);
        if (!device || device.deleted_at) throw new AppError("DEVICE_NOT_FOUND", "Không tìm thấy thiết bị trong phạm vi được phép.");
        const category = await catalogRepository.findById(client, input.category_id);
        if (!category || !category.is_active) validationError("category_id", "Nhóm sự cố không hợp lệ.");
        const received = now(), assessedOn = localDate(received);
        const snapshot = assessWarranty(device.purchase_date, device.warranty_months, assessedOn);
        const due = computeDueDate(received, input.priority);
        const code = await tickets.nextCode(client, assessedOn.slice(0, 4));
        const row = await tickets.insert(client, input, principal.employee_id, code, received, due, snapshot, initialApproval(snapshot.warranty_status));
        try { await tickets.initialLog(client, row.ticket_id, principal.employee_id, received); }
        catch (error) {
          const failure = new AppError("INTERNAL_ERROR", "Không thể ghi lịch sử tiếp nhận.");
          failure.cause = error; throw failure;
        }
        return ticketDto(row, input.customer_id);
      });
    },
  };
}
export type TicketService = ReturnType<typeof createTicketService>;
