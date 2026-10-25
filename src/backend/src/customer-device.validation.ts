import { objectBody, text } from "./validation.ts";
import { validationError } from "./errors.ts";
import { localDate } from "./domain/business-time.ts";
export { localDate } from "./domain/business-time.ts";

export type NewCustomer = { full_name: string; phone: string; address: string | null };
export type CustomerPatch = { full_name?: string; address?: string | null };
export type NewDevice = { product_id: number; serial_no: string; purchase_date: string | null };

export function normalizePhone(input: unknown): string {
  let phone = text(input, "phone", 1, 30, false).trim().replace(/[ .]/g, "");
  if (phone.startsWith("+84")) phone = "0" + phone.slice(3);
  else if (phone.startsWith("84")) phone = "0" + phone.slice(2);
  if (!/^0[0-9]{9}$/.test(phone)) validationError("phone", "Số điện thoại không hợp lệ.");
  return phone;
}
export function purchaseDate(input: unknown, now: Date): string | null {
  if (input === null) return null;
  if (typeof input !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input) || input.startsWith("0000"))
    validationError("purchase_date", "Ngày mua không hợp lệ.");
  const date = new Date(input + "T00:00:00.000Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input)
    validationError("purchase_date", "Ngày mua không tồn tại.");
  if (input > localDate(now)) validationError("purchase_date", "Ngày mua không được nằm trong tương lai.");
  return input;
}
export function newCustomer(input: unknown): NewCustomer {
  const body = objectBody(input, ["full_name", "phone", "address"], ["full_name", "phone"]);
  return { full_name: text(body.full_name, "full_name", 1, 120), phone: normalizePhone(body.phone),
    address: body.address === undefined || body.address === null ? null : text(body.address, "address", 0, 255) };
}
export function customerPatch(input: unknown): CustomerPatch {
  const body = objectBody(input, ["full_name", "address"]);
  if (Object.keys(body).length === 0) validationError("body", "PATCH phải có trường cần cập nhật.");
  const patch: CustomerPatch = {};
  if (Object.hasOwn(body, "full_name")) patch.full_name = text(body.full_name, "full_name", 1, 120);
  if (Object.hasOwn(body, "address")) patch.address = body.address === null ? null : text(body.address, "address", 0, 255);
  return patch;
}
export function newDevice(input: unknown, now: Date): NewDevice {
  const body = objectBody(input, ["product_id", "serial_no", "purchase_date"], ["product_id", "serial_no"]);
  if (typeof body.product_id !== "number" || !Number.isSafeInteger(body.product_id) || body.product_id <= 0)
    validationError("product_id", "Product_id phải là số nguyên dương an toàn.");
  return { product_id: body.product_id, serial_no: text(body.serial_no, "serial_no", 1, 50),
    purchase_date: purchaseDate(body.purchase_date === undefined ? null : body.purchase_date, now) };
}
export function devicePatch(input: unknown, now: Date): { purchase_date: string | null } {
  const body = objectBody(input, ["purchase_date"], ["purchase_date"]);
  return { purchase_date: purchaseDate(body.purchase_date, now) };
}
