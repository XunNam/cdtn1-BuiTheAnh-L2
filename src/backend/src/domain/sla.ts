import { configurationError, validationError } from "../errors.ts";
import { localDate } from "./business-time.ts";

export type Priority = "CAO" | "TRUNG_BINH" | "THAP";
const hours: Readonly<Record<Priority, number>> = { CAO: 24, TRUNG_BINH: 72, THAP: 120 };
export function priority(input: unknown): Priority {
  if (input !== "CAO" && input !== "TRUNG_BINH" && input !== "THAP")
    validationError("priority", "Phải chọn mức ưu tiên hợp lệ.");
  return input;
}
export function computeDueDate(receivedAt: Date, level: Priority): Date {
  let cursor = receivedAt.getTime(), remaining = hours[priority(level)] * 3600000;
  if (!Number.isFinite(cursor)) configurationError("Đồng hồ tiếp nhận không hợp lệ.");
  // Prototype dùng ngày tiếp nhận hiện đại tại Việt Nam (UTC+07:00, không DST).
  // Xác định ngày qua IANA zone; không dùng getDay/getHours theo timezone Windows.
  while (true) {
    const day = localDate(new Date(cursor));
    const midnight = new Date(day + "T00:00:00+07:00").getTime();
    const next = midnight + 24 * 3600000;
    const sunday = new Date(day + "T00:00:00Z").getUTCDay() === 0;
    if (sunday) { cursor = next; continue; }
    if (remaining === 0) return new Date(cursor);
    const consumed = Math.min(remaining, next - cursor);
    cursor += consumed; remaining -= consumed;
    // Vòng kế tiếp vẫn kiểm Chủ nhật kể cả vừa tiêu thụ hết ở đúng 00:00.
  }
}
