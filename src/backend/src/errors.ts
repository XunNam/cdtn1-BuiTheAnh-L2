import type { ErrorRequestHandler } from "express";

export class AppError extends Error {
  readonly code: string;
  readonly fields: Record<string, string>;
  readonly extras: { existing_customer?: unknown; existing_device?: unknown };
  constructor(code: string, message: string, fields: Record<string, string> = {}, extras: { existing_customer?: unknown; existing_device?: unknown } = {}) {
    super(message); this.code = code; this.fields = fields; this.extras = extras;
  }
}
export function configurationError(message: string): never { throw new AppError("CONFIGURATION_ERROR", message); }
export function validationError(field: string, message: string): never {
  throw new AppError("VALIDATION_FAILED", "Dữ liệu không hợp lệ.", { [field]: message });
}
export function errorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") return error.code;
  return undefined;
}
export function publicError(error: unknown): { status: number; code: string; message: string; fields: Record<string, string> } {
  if (error instanceof AppError) {
    const statuses: Record<string, number> = {
      VALIDATION_FAILED: 400, INVALID_JSON: 400, AUTHENTICATION_REQUIRED: 401,
      INVALID_CREDENTIALS: 401, ROLE_FORBIDDEN: 403, RESOURCE_NOT_FOUND: 404,
      RESOURCE_CHANGED: 409, UNSUPPORTED_MEDIA_TYPE: 415, AUTH_CAPACITY_REACHED: 503,
      CUSTOMER_NOT_FOUND: 404, DEVICE_NOT_FOUND: 404, PRODUCT_NOT_FOUND: 404,
      PHONE_ALREADY_EXISTS: 409, SERIAL_ALREADY_EXISTS: 409, DEVICE_OWNER_MISMATCH: 409,
      CONFIGURATION_ERROR: 500, DATABASE_UNAVAILABLE: 500,
      TICKET_NOT_FOUND: 404, ALREADY_APPROVED: 409, APPROVAL_NOT_APPLICABLE: 409,
    };
    return { status: statuses[error.code] ?? 500, code: error.code, message: error.message, fields: error.fields };
  }
  const code = errorCode(error);
  // Không chuyển tiếp detail/message PostgreSQL vì có thể chứa dữ liệu nhạy cảm.
  if (code === "23505") return { status: 409, code: "RESOURCE_CHANGED", message: "Dữ liệu đã tồn tại.", fields: {} };
  if (code === "23503" || code === "23514" || code === "23502" || code === "22001" || code === "22P02")
    return { status: 400, code: "VALIDATION_FAILED", message: "Dữ liệu không thỏa ràng buộc.", fields: {} };
  return { status: 500, code: "INTERNAL_ERROR", message: "Không thể xử lý yêu cầu.", fields: {} };
}
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  let normalized = error;
  // body-parser có thể trả HTTP400 (ví dụ gzip hỏng) mà không có type JSON.
  // Giữ lỗi cú pháp phía client, không phản chiếu message của decoder.
  if (error instanceof Error && "status" in error && error.status === 400 && "expose" in error && error.expose === true)
    normalized = new AppError("INVALID_JSON", "Nội dung request không hợp lệ.");
  if (error instanceof URIError) normalized = new AppError("VALIDATION_FAILED", "Đường dẫn không hợp lệ.", { path: "Mã hóa đường dẫn không hợp lệ." });
  if (typeof error === "object" && error !== null && "type" in error) {
    if (error.type === "entity.parse.failed") normalized = new AppError("INVALID_JSON", "JSON không hợp lệ.");
    if (error.type === "entity.too.large") normalized = new AppError("VALIDATION_FAILED", "Request quá lớn.");
    if (error.type === "charset.unsupported" || error.type === "encoding.unsupported") normalized = new AppError("UNSUPPORTED_MEDIA_TYPE", "Encoding không được hỗ trợ.");
  }
  const { status, code, message, fields } = publicError(normalized);
  const extras: { existing_customer?: unknown; existing_device?: unknown } = {};
  if (normalized instanceof AppError) {
    if (code === "PHONE_ALREADY_EXISTS" && normalized.extras.existing_customer !== undefined) extras.existing_customer = normalized.extras.existing_customer;
    if (code === "SERIAL_ALREADY_EXISTS" && normalized.extras.existing_device !== undefined) extras.existing_device = normalized.extras.existing_device;
  }
  res.status(status).json({ error: { code, message, fields, ...extras } });
};
