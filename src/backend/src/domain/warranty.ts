import { configurationError, validationError } from "../errors.ts";

export type WarrantyStatus = "CON_BAO_HANH" | "HET_BAO_HANH" | "CHUA_XAC_MINH";
export function initialApproval(status: WarrantyStatus): "KHONG_CAN" | "CHO_PHE_DUYET" {
  return status === "CHUA_XAC_MINH" ? "CHO_PHE_DUYET" : "KHONG_CAN";
}
export function calendarDate(input: unknown, field: string): string {
  if (typeof input !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input) || input.startsWith("0000"))
    validationError(field, "Ngày phải có dạng YYYY-MM-DD hợp lệ.");
  const date = new Date(input + "T00:00:00.000Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input)
    validationError(field, "Ngày không tồn tại.");
  return input;
}
export function assessWarranty(purchase: string | null, months: number, assessedOn: string) {
  const assessed_on = calendarDate(assessedOn, "assessment_date");
  if (!Number.isInteger(months) || months < 0 || months > 120)
    configurationError("Dữ liệu thời hạn bảo hành không hợp lệ.");
  let warranty_expires_on: string | null = null;
  let warranty_status: WarrantyStatus = "CHUA_XAC_MINH";
  if (purchase !== null) {
    calendarDate(purchase, "purchase_date");
    if (purchase > assessed_on) validationError("assessment_date", "Ngày đánh giá không được trước ngày mua.");
    const [year, month, day] = purchase.split("-").map(Number) as [number, number, number];
    // Cộng trực tiếp tới tháng đích rồi clamp đúng một lần (31/01 +2 =31/03).
    const target = year * 12 + month - 1 + months, y = Math.floor(target / 12), m = target % 12 + 1;
    if (y > 9999) configurationError("Ngày hết hạn vượt miền ngày của API.");
    const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]!;
    warranty_expires_on = String(y).padStart(4, "0") + "-" + String(m).padStart(2, "0") + "-" + String(Math.min(day, days)).padStart(2, "0");
    warranty_status = assessed_on <= warranty_expires_on ? "CON_BAO_HANH" : "HET_BAO_HANH";
  }
  return { assessed_on, purchase_date: purchase, warranty_months: months, warranty_expires_on,
    warranty_status, requires_approval: warranty_status === "CHUA_XAC_MINH" };
}
