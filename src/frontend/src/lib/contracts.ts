export type Role = "NHAN_VIEN_TIEP_NHAN" | "QUAN_LY_TTBH";
export type Principal = { employee_id: number; role: Role; active_center_id: number; allowed_center_ids: number[] };
export type Login = { access_token: string; token_type: "Bearer"; expires_in: number; expires_at: string; principal: Principal };
export type Customer = { customer_id: number; full_name: string; phone: string; address: string | null; created_at: string };
export type Device = { device_id: number; customer_id: number; product_id: number; serial_no: string; purchase_date: string | null; warranty_months: number };
export type Product = { product_id: number; product_name: string; warranty_months: number };
export type Category = { category_id: number; category_name: string };
export type WarrantyStatus = "CON_BAO_HANH" | "HET_BAO_HANH" | "CHUA_XAC_MINH";
export type ApprovalStatus = "KHONG_CAN" | "CHO_PHE_DUYET" | "DA_PHE_DUYET";
export type Warranty = { device_id: number; assessed_on: string; purchase_date: string | null; warranty_months: number; warranty_expires_on: string | null; warranty_status: WarrantyStatus; requires_approval: boolean };
export type Ticket = { ticket_id: number; ticket_code: string; customer_id: number; device_id: number; center_id: number; issue_desc: string; category_id: number; priority: "CAO" | "TRUNG_BINH" | "THAP"; status: string;
  received_at: string; due_date: string; assessed_on: string; purchase_date_snapshot: string | null; warranty_months_snapshot: number; warranty_expires_on: string | null; warranty_status: WarrantyStatus;
  approval_status: ApprovalStatus; approved_by: number | null; approved_at: string | null; approval_note: string | null; can_proceed: boolean };
export type Detail = Ticket & { customer: Pick<Customer, "customer_id" | "full_name" | "phone">; device: Pick<Device, "device_id" | "serial_no" | "product_id"> };
export type TicketSummary = Pick<Ticket, "ticket_id" | "ticket_code" | "customer_id" | "device_id" | "center_id" | "warranty_status" | "approval_status" | "status" | "received_at" | "due_date" | "can_proceed">;
export type Approval = Pick<Ticket, "ticket_id" | "status" | "warranty_status" | "approval_status" | "approved_by" | "approved_at" | "approval_note" | "can_proceed">;
export type Communication = { communication_id: number; ticket_id: number; content: string; created_at: string; created_by: number };
export type Page<T> = { data: T[]; meta: { page: number; size: number; total: number } };
export type Decoder<T> = (value: unknown) => T;

export class ContractError extends Error { constructor() { super("Phản hồi máy chủ không đúng hợp đồng dữ liệu."); } }
export function record(v: unknown): Record<string, unknown> { if (!v || typeof v !== "object" || Array.isArray(v)) throw new ContractError(); return v as Record<string, unknown>; }
function string(v: unknown): string { if (typeof v !== "string") throw new ContractError(); return v; }
function number(v: unknown): number { if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0) throw new ContractError(); return v; }
function id(v: unknown): number { const n = number(v); if (!n) throw new ContractError(); return n; }
function bool(v: unknown): boolean { if (typeof v !== "boolean") throw new ContractError(); return v; }
function nullable<T>(v: unknown, decode: Decoder<T>): T | null { return v === null ? null : decode(v); }
function enumeration<T extends string>(v: unknown, choices: readonly T[]): T { const s = string(v); if (!choices.includes(s as T)) throw new ContractError(); return s as T; }
function date(v: unknown): string { const s = string(v); if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(Date.parse(s + "T00:00:00Z"))) throw new ContractError(); return s; }
function timestamp(v: unknown): string { const s = string(v); if (!s.endsWith("+07:00") || !Number.isFinite(Date.parse(s))) throw new ContractError(); return s; }
function months(v: unknown): number { const n = number(v); if (n > 120) throw new ContractError(); return n; }
function warrantyStatus(v: unknown) { return enumeration(v, ["CON_BAO_HANH", "HET_BAO_HANH", "CHUA_XAC_MINH"] as const); }
function approvalStatus(v: unknown) { return enumeration(v, ["KHONG_CAN", "CHO_PHE_DUYET", "DA_PHE_DUYET"] as const); }
export function array<T>(v: unknown, decode: Decoder<T>): T[] { if (!Array.isArray(v)) throw new ContractError(); return v.map(decode); }
export function page<T>(v: unknown, decode: Decoder<T>): Page<T> { const x = record(v), meta = record(x.meta); return { data: array(x.data, decode), meta: { page: id(meta.page), size: id(meta.size), total: number(meta.total) } }; }
export function login(v: unknown): Login {
  const x = record(v), p = record(x.principal), access_token = string(x.access_token);
  if (!/^[A-Za-z0-9_-]{43}$/.test(access_token)) throw new ContractError();
  return { access_token, token_type: enumeration(x.token_type, ["Bearer"]), expires_in: id(x.expires_in), expires_at: timestamp(x.expires_at), principal: {
    employee_id: id(p.employee_id), role: enumeration(p.role, ["NHAN_VIEN_TIEP_NHAN", "QUAN_LY_TTBH"]), active_center_id: id(p.active_center_id), allowed_center_ids: array(p.allowed_center_ids, id) } };
}
export function customer(v: unknown): Customer { const x = record(v); return { customer_id: id(x.customer_id), full_name: string(x.full_name), phone: string(x.phone), address: nullable(x.address, string), created_at: timestamp(x.created_at) }; }
export function device(v: unknown): Device { const x = record(v); return { device_id: id(x.device_id), customer_id: id(x.customer_id), product_id: id(x.product_id), serial_no: string(x.serial_no), purchase_date: nullable(x.purchase_date, date), warranty_months: months(x.warranty_months) }; }
export function product(v: unknown): Product { const x = record(v); return { product_id: id(x.product_id), product_name: string(x.product_name), warranty_months: months(x.warranty_months) }; }
export function category(v: unknown): Category { const x = record(v); return { category_id: id(x.category_id), category_name: string(x.category_name) }; }
export function warranty(v: unknown): Warranty { const x = record(v); return { device_id: id(x.device_id), assessed_on: date(x.assessed_on), purchase_date: nullable(x.purchase_date, date), warranty_months: months(x.warranty_months), warranty_expires_on: nullable(x.warranty_expires_on, date), warranty_status: warrantyStatus(x.warranty_status), requires_approval: bool(x.requires_approval) }; }
export function summary(v: unknown): TicketSummary { const x = record(v); return { ticket_id: id(x.ticket_id), ticket_code: string(x.ticket_code), customer_id: id(x.customer_id), device_id: id(x.device_id), center_id: id(x.center_id), warranty_status: warrantyStatus(x.warranty_status), approval_status: approvalStatus(x.approval_status), status: enumeration(x.status, ["MOI", "DA_PHAN_CONG", "DANG_XU_LY", "CHO_LINH_KIEN", "HOAN_TAT", "DA_DONG", "DA_HUY"]), received_at: timestamp(x.received_at), due_date: timestamp(x.due_date), can_proceed: bool(x.can_proceed) }; }
export function ticket(v: unknown): Ticket {
  const x = record(v); return { ...summary(x), issue_desc: string(x.issue_desc), category_id: id(x.category_id), priority: enumeration(x.priority, ["CAO", "TRUNG_BINH", "THAP"]), assessed_on: date(x.assessed_on), purchase_date_snapshot: nullable(x.purchase_date_snapshot, date), warranty_months_snapshot: months(x.warranty_months_snapshot), warranty_expires_on: nullable(x.warranty_expires_on, date),
    approved_by: nullable(x.approved_by, id), approved_at: nullable(x.approved_at, timestamp), approval_note: nullable(x.approval_note, string) };
}
export function detail(v: unknown): Detail { const x = record(v), c = record(x.customer), d = record(x.device); return { ...ticket(x), customer: { customer_id: id(c.customer_id), full_name: string(c.full_name), phone: string(c.phone) }, device: { device_id: id(d.device_id), serial_no: string(d.serial_no), product_id: id(d.product_id) } }; }
export function approval(v: unknown): Approval { const x = record(v); return { ticket_id: id(x.ticket_id), status: string(x.status), warranty_status: warrantyStatus(x.warranty_status), approval_status: approvalStatus(x.approval_status), approved_by: nullable(x.approved_by, id), approved_at: nullable(x.approved_at, timestamp), approval_note: nullable(x.approval_note, string), can_proceed: bool(x.can_proceed) }; }
export function communication(v: unknown): Communication { const x = record(v); return { communication_id: id(x.communication_id), ticket_id: id(x.ticket_id), content: string(x.content), created_at: timestamp(x.created_at), created_by: id(x.created_by) }; }
