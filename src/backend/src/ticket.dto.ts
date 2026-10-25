import type { TicketRow, TicketListRow, TicketDetailRow } from "./repositories/tickets.repository.ts";
import type { CommunicationRow } from "./repositories/communications.repository.ts";
import type { Role } from "./reference-config.ts";
import { safeNumber, maskPhone } from "./customer-device.dto.ts";
import { timestamp } from "./domain/business-time.ts";

export function ticketDto(row: TicketRow, customerId: number) {
  return { ticket_id: safeNumber(row.ticket_id), ticket_code: row.ticket_code, customer_id: customerId,
    device_id: safeNumber(row.device_id), center_id: safeNumber(row.center_id), issue_desc: row.issue_desc,
    category_id: row.category_id, priority: row.priority, status: row.status,
    received_at: timestamp(row.received_at), due_date: timestamp(row.due_date), assessed_on: row.assessed_on,
    purchase_date_snapshot: row.purchase_date_snapshot, warranty_months_snapshot: row.warranty_months_snapshot,
    warranty_expires_on: row.warranty_expires_on, warranty_status: row.warranty_status, approval_status: row.approval_status,
    approved_by: row.approved_by === null ? null : safeNumber(row.approved_by), approved_at: row.approved_at === null ? null : timestamp(row.approved_at), approval_note: row.approval_note,
    can_proceed: row.approval_status !== "CHO_PHE_DUYET" };
}
export function ticketListDto(row: TicketListRow) {
  return { ticket_id: safeNumber(row.ticket_id), ticket_code: row.ticket_code, customer_id: safeNumber(row.customer_id),
    device_id: safeNumber(row.device_id), center_id: safeNumber(row.center_id), warranty_status: row.warranty_status,
    approval_status: row.approval_status, status: row.status, received_at: timestamp(row.received_at), due_date: timestamp(row.due_date), can_proceed: row.approval_status !== "CHO_PHE_DUYET" };
}
export function ticketDetailDto(row: TicketDetailRow, role: Role) {
  return { ...ticketDto(row, safeNumber(row.customer_id)), customer: { customer_id: safeNumber(row.customer_id), full_name: row.full_name, phone: maskPhone(row.phone, role) },
    device: { device_id: safeNumber(row.device_id), serial_no: row.serial_no, product_id: safeNumber(row.product_id) } };
}
export function approvalDto(row: TicketRow) {
  return { ticket_id: safeNumber(row.ticket_id), status: row.status, warranty_status: row.warranty_status, approval_status: row.approval_status,
    approved_by: row.approved_by === null ? null : safeNumber(row.approved_by), approved_at: row.approved_at === null ? null : timestamp(row.approved_at),
    approval_note: row.approval_note, can_proceed: row.approval_status !== "CHO_PHE_DUYET" };
}
export function communicationDto(row: CommunicationRow) {
  return { communication_id: safeNumber(row.communication_id), ticket_id: safeNumber(row.ticket_id), content: row.content,
    created_at: timestamp(row.created_at), created_by: safeNumber(row.created_by) };
}
